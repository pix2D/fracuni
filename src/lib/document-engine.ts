import { getDb } from "@/lib/db";
import type { Transaction } from "kysely";
import { sql } from "kysely";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import type { DB } from "@/lib/db.generated";
import { AppError, invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";
import {
  createInvoice,
  getInvoice,
  type Invoice,
  type LineItemInput,
} from "@/lib/invoices";
import {
  DOCUMENT_TYPE,
  INVOICE_STATUS,
  OFFER_STATUS,
  OFFER_TRANSITIONS,
  type DocumentType,
  type OfferStatus,
} from "@/lib/documents";
import { decideServiceVat } from "@/lib/tax-engine";
import { validateVat, type ViesSuccess } from "@/lib/vies";
import { getExchangeRate, type HnbSuccess } from "@/lib/hnb";
import { expandPlaceholders } from "@/lib/placeholders";
import {
  loadPdfGenerationContext,
  renderAndStoreInvoicePdfs,
  type GeneratedPdfArtifacts,
  type GenerateDeps,
} from "@/lib/pdf-generator";
import { parseClientType } from "@/lib/client-types";
import { getSettings } from "@/lib/settings";

// Invoices and Credit Notes are priced in EUR by default; only non-EUR documents
// need an HNB exchange rate captured at finalization.
const BASE_CURRENCY = "EUR";

// Fetchers are injected so tests can drive the VIES / HNB gates deterministically.
// Left undefined in production, the underlying clients fall back to global fetch.
export interface FinalizeDeps {
  viesFetcher?: typeof fetch;
  hnbFetcher?: typeof fetch;
}

export interface FinalizeWithPdfDeps extends FinalizeDeps, GenerateDeps {}

interface InvoiceFinalizationPlan {
  invoice: Invoice;
  issueDate: string;
  viesResult: ViesSuccess | null;
  exchangeRate: HnbSuccess | null;
}

type PdfArtifactRenderer = (invoice: Invoice) => Promise<GeneratedPdfArtifacts>;
type OfferDocument = Extract<Invoice, { type: typeof DOCUMENT_TYPE.OFFER }>;

// A Draft must carry these before it can become a legal document. Order here is
// the order they surface in the error message.
const REQUIRED_FIELDS: { label: string; present: (invoice: Invoice) => boolean }[] = [
  { label: "Client", present: (i) => i.clientId != null },
  { label: "Location", present: (i) => i.locationId != null },
  { label: "Payment Method", present: (i) => i.paymentMethodId != null },
  { label: "Currency", present: (i) => !!i.currency },
  { label: "Issue Date", present: (i) => !!i.issueDate },
];

function assertFinalizable(invoice: Invoice): void {
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw invalidOperation(`Only Draft invoices can be finalized (current status: ${invoice.status})`);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !field.present(invoice)).map((f) => f.label);
  const lineItemIssue = finalizableLineItemIssue(invoice);
  if (lineItemIssue === "missing") missing.push("at least one complete Line Item");

  if (missing.length > 0) {
    throw invalidRequest(`Cannot finalize: missing required fields: ${missing.join(", ")}`, {
      missingFields: missing,
    });
  }

  if (lineItemIssue === "incomplete") {
    throw invalidRequest("Cannot finalize: every included Line Item must have an HR description, quantity, and unit price");
  }
}

function wrapPdfFailure(error: unknown): never {
  if (error instanceof AppError) throw error;
  const message = error instanceof Error ? error.message : "unknown error";
  throw invalidOperation(`PDF generation failed: ${message}`);
}

function finalizedInvoiceSnapshot(
  invoice: Invoice,
  documentNumber: string,
  exchangeRate: HnbSuccess | null,
  pdfs?: GeneratedPdfArtifacts,
): Invoice {
  return {
    ...invoice,
    status: INVOICE_STATUS.FINALIZED,
    documentNumber,
    exchangeRateText: exchangeRate?.rateText ?? null,
    exchangeRateDate: exchangeRate?.effectiveDate ?? null,
    pdfPathHr: pdfs?.pdfPathHr ?? invoice.pdfPathHr,
    pdfHashHr: pdfs?.pdfHashHr ?? invoice.pdfHashHr,
    pdfPathEn: pdfs?.pdfPathEn ?? invoice.pdfPathEn,
    pdfHashEn: pdfs?.pdfHashEn ?? invoice.pdfHashEn,
  };
}

// The Document Number's sequence segment. Atomic per (company, year, payment
// method): the upsert either seeds the row at 1 or increments last_value, and
// RETURNING hands back the assigned value in a single statement. Invoices and
// Credit Notes share the row, so they never collide or leave gaps.
async function assignSequence(
  trx: Transaction<DB>,
  companyId: number,
  year: number,
  paymentMethodId: number,
): Promise<number> {
  const row = await trx
    .insertInto("documentNumberSequences")
    .values({ companyId, year, paymentMethodId, lastValue: 1 })
    .onConflict((oc) =>
      oc
        .columns(["companyId", "year", "paymentMethodId"])
        .doUpdateSet({ lastValue: sql`last_value + 1` }),
    )
    .returning("lastValue")
    .executeTakeFirstOrThrow();
  return row.lastValue;
}

function yearOf(issueDate: string): number {
  return Number(issueDate.slice(0, 4));
}

async function loadNumber(
  trx: Transaction<DB>,
  table: "locations" | "paymentMethods",
  id: number,
): Promise<number> {
  const row = await trx.selectFrom(table).select("number").where("id", "=", id).executeTakeFirst();
  if (!row) throw notFound(`Referenced ${table === "locations" ? "location" : "payment method"} not found`);
  return row.number;
}

async function prepareInvoiceFinalization(
  id: number,
  deps: FinalizeDeps = {},
): Promise<InvoiceFinalizationPlan> {
  const db = getDb();

  const invoice = await getInvoice(id);
  if (!invoice) throw notFound("Invoice not found");

  assertFinalizable(invoice);

  // Narrowed by assertFinalizable; the non-null assertions reflect that guarantee.
  const clientId = invoice.clientId!;
  const currency = invoice.currency!;
  const issueDate = invoice.issueDate!;

  const client = await db
    .selectFrom("clients")
    .select(["clientType", "country", "vatNumber"])
    .where("id", "=", clientId)
    .executeTakeFirst();
  if (!client) throw notFound("Referenced client not found");

  // VIES gate: service EU B2B reverse-charge documents need a valid VAT ID.
  let viesResult: ViesSuccess | null = null;
  const decision = decideServiceVat({
    clientType: parseClientType(client.clientType),
    clientCountry: client.country,
    clientVatNumber: client.vatNumber,
  });
  if (decision.requiresVies) {
    const result = await validateVat(client.country, client.vatNumber!, deps.viesFetcher);
    if (!result.ok) {
      throw invalidOperation(`VIES verification failed: ${result.error}`);
    }
    if (!result.valid) {
      throw invalidOperation(`VAT number ${client.vatNumber} is not valid according to VIES`);
    }
    viesResult = result;
  }

  // HNB gate — non-EUR invoices need an auditable rate at the issue date.
  let exchangeRate: HnbSuccess | null = null;
  if (currency !== BASE_CURRENCY) {
    const result = await getExchangeRate(currency, issueDate, deps.hnbFetcher);
    if (!result.ok) {
      throw invalidOperation(`Exchange rate unavailable: ${result.error}`);
    }
    exchangeRate = result;
  }

  return { invoice, issueDate, viesResult, exchangeRate };
}

async function commitInvoiceFinalization(
  plan: InvoiceFinalizationPlan,
  renderPdfs?: PdfArtifactRenderer,
): Promise<void> {
  const db = getDb();
  const { invoice, issueDate, viesResult, exchangeRate } = plan;

  await db.transaction().execute(async (trx) => {
    const locationNumber = await loadNumber(trx, "locations", invoice.locationId!);
    const paymentMethodNumber = await loadNumber(trx, "paymentMethods", invoice.paymentMethodId!);

    const sequence = await assignSequence(
      trx,
      invoice.companyId,
      yearOf(issueDate),
      invoice.paymentMethodId!,
    );
    const documentNumber = `${sequence}/${locationNumber}/${paymentMethodNumber}`;

    let pdfs: GeneratedPdfArtifacts | undefined;
    if (renderPdfs) {
      try {
        pdfs = await renderPdfs(finalizedInvoiceSnapshot(invoice, documentNumber, exchangeRate));
      } catch (error: unknown) {
        wrapPdfFailure(error);
      }
    }

    if (viesResult) {
      await trx
        .insertInto("viesVerifications")
        .values({
          invoiceId: invoice.id,
          countryCode: viesResult.countryCode,
          vatNumber: viesResult.vatNumber,
          valid: viesResult.valid ? 1 : 0,
          requestDate: viesResult.requestDate,
          name: viesResult.name,
          address: viesResult.address,
          rawResponse: JSON.stringify(viesResult.rawResponse),
        })
        .execute();
    }

    await trx
      .updateTable("invoices")
      .set({
        status: INVOICE_STATUS.FINALIZED,
        documentNumber,
        exchangeRateText: exchangeRate?.rateText ?? null,
        exchangeRateDate: exchangeRate?.effectiveDate ?? null,
        ...(pdfs
          ? {
              pdfPathHr: pdfs.pdfPathHr,
              pdfHashHr: pdfs.pdfHashHr,
              pdfPathEn: pdfs.pdfPathEn,
              pdfHashEn: pdfs.pdfHashEn,
            }
          : {}),
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", invoice.id)
      .execute();
  });
}

/**
 * Transition a Draft Invoice (or Credit Note) to Finalized.
 *
 * Gates run before any write so a blocked finalization leaves the document a
 * Draft with no Document Number consumed:
 *  - required fields present;
 *  - VIES verification passes for foreign clients with a VAT Number (reverse charge);
 *  - HNB exchange rate available for non-EUR currencies.
 *
 * The write phase (sequence assignment, VIES proof, status flip) is a single
 * transaction, so a failure rolls back the sequence increment — no gaps.
 */
export async function finalizeInvoice(id: number, deps: FinalizeDeps = {}): Promise<Invoice> {
  const plan = await prepareInvoiceFinalization(id, deps);
  await commitInvoiceFinalization(plan);

  const finalized = await getInvoice(id);
  if (!finalized) throw notFound("Invoice not found");
  return finalized;
}

export async function finalizeInvoiceWithPdfs(
  id: number,
  deps: FinalizeWithPdfDeps = {},
): Promise<Invoice> {
  const plan = await prepareInvoiceFinalization(id, deps);
  const context = await loadPdfGenerationContext(plan.invoice, deps);

  await commitInvoiceFinalization(plan, (finalized) =>
    renderAndStoreInvoicePdfs(finalized, context, deps),
  );

  const finalized = await getInvoice(id);
  if (!finalized) throw notFound("Invoice not found");
  return finalized;
}

/**
 * Transition a Finalized document to Sent. This can be called after a successful
 * Postmark delivery or from a manual "mark as sent" action. Idempotency is the
 * caller's concern; here we simply refuse any source status other than Finalized.
 */
export async function markInvoiceSent(id: number): Promise<Invoice> {
  const invoice = await getInvoice(id);
  if (!invoice) throw notFound("Invoice not found");
  if (invoice.status !== INVOICE_STATUS.FINALIZED) {
    throw invalidOperation(
      `Only Finalized documents can be marked Sent (current status: ${invoice.status})`,
    );
  }

  await getDb()
    .updateTable("invoices")
    .set({ status: INVOICE_STATUS.SENT, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .execute();

  const sent = await getInvoice(id);
  if (!sent) throw notFound("Invoice not found");
  return sent;
}

/**
 * Transition a Sent document to Paid, recording the payment date. Settlement is
 * a manual action, so the date is supplied by the user rather than derived.
 */
export async function markInvoicePaid(id: number, paymentDate: string): Promise<Invoice> {
  const invoice = await getInvoice(id);
  if (!invoice) throw notFound("Invoice not found");
  if (invoice.status !== INVOICE_STATUS.SENT) {
    throw invalidOperation(
      `Only Sent documents can be marked Paid (current status: ${invoice.status})`,
    );
  }

  await getDb()
    .updateTable("invoices")
    .set({ status: INVOICE_STATUS.PAID, paymentDate, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .execute();

  const paid = await getInvoice(id);
  if (!paid) throw notFound("Invoice not found");
  return paid;
}

/**
 * Create a Draft Credit Note from an existing Finalized Invoice.
 *
 * Pre-fills every field from the source Invoice and records the source's
 * Document Number so the refund is traceable to the original (User Story 32).
 * Credit Note line amounts are normalized by the invoice data layer: quantities
 * stay positive, unit prices become negative magnitudes. The new Credit Note
 * starts as a Draft with no Document Number — that is assigned later at
 * finalization, sharing the Invoice/Credit Note sequence for its (Company, year,
 * Payment Method).
 */
export async function createCreditNoteFromInvoice(sourceId: number): Promise<Invoice> {
  const source = await getInvoice(sourceId);
  if (!source) throw notFound("Invoice not found");

  if (source.type !== DOCUMENT_TYPE.INVOICE) {
    throw invalidOperation("A Credit Note can only be created from an Invoice");
  }
  // Only a Finalized Invoice carries the Document Number the Credit Note must
  // reference; Drafts have none.
  if (!source.documentNumber) {
    throw invalidOperation("A Credit Note can only be created from a Finalized Invoice");
  }

  return createInvoice({
    type: DOCUMENT_TYPE.CREDIT_NOTE,
    companyId: source.companyId,
    clientId: source.clientId,
    locationId: source.locationId,
    paymentMethodId: source.paymentMethodId,
    currency: source.currency,
    email: source.email,
    issueDate: source.issueDate,
    deliveryDate: source.deliveryDate,
    dueDate: source.dueDate,
    notesHr: source.notesHr,
    notesEn: source.notesEn,
    originalInvoiceNumber: source.documentNumber,
    lineItems: source.lineItems.map((li) => ({
      descriptionHr: li.descriptionHr,
      descriptionEn: li.descriptionEn,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
  });
}

// ---------------------------------------------------------------------------
// Offers
//
// Offers live in the same `invoices` table (type='offer'). On an offer row,
// issue_date = offer date and due_date = valid-until.
// They have their own simpler numbering and lifecycle, and no VIES/HNB gates —
// rates only matter when an Offer is later converted to (and finalized as) an
// Invoice.
// ---------------------------------------------------------------------------

const OFFER_REQUIRED_FIELDS: { label: string; present: (offer: Invoice) => boolean }[] = [
  { label: "Client", present: (o) => o.clientId != null },
  { label: "Location", present: (o) => o.locationId != null },
  { label: "Payment Method", present: (o) => o.paymentMethodId != null },
  { label: "Currency", present: (o) => !!o.currency },
  { label: "Offer Date", present: (o) => !!o.issueDate },
  { label: "Valid Until", present: (o) => !!o.dueDate },
];

async function loadOffer(id: number): Promise<OfferDocument> {
  const offer = await getInvoice(id);
  if (!offer || offer.type !== DOCUMENT_TYPE.OFFER) throw notFound("Offer not found");
  return offer;
}

function assertOfferFinalizable(offer: OfferDocument): void {
  if (offer.status !== OFFER_STATUS.DRAFT) {
    throw invalidOperation(`Only Draft offers can be finalized (current status: ${offer.status})`);
  }

  const missing = OFFER_REQUIRED_FIELDS.filter((f) => !f.present(offer)).map((f) => f.label);
  const lineItemIssue = finalizableLineItemIssue(offer);
  if (lineItemIssue === "missing") missing.push("at least one complete Line Item");

  if (missing.length > 0) {
    throw invalidRequest(`Cannot finalize: missing required fields: ${missing.join(", ")}`, {
      missingFields: missing,
    });
  }

  if (lineItemIssue === "incomplete") {
    throw invalidRequest("Cannot finalize: every included Line Item must have an HR description, quantity, and unit price");
  }
}

// The offer number is a plain per-(company, year) counter. The atomic upsert
// seeds at 1 or increments and RETURNING hands back the assigned value, so
// numbers are gap-free and unique even under concurrency.
async function assignOfferSequence(
  trx: Transaction<DB>,
  companyId: number,
  year: number,
): Promise<number> {
  const row = await trx
    .insertInto("offerNumberSequences")
    .values({ companyId, year, lastValue: 1 })
    .onConflict((oc) =>
      oc.columns(["companyId", "year"]).doUpdateSet({ lastValue: sql`last_value + 1` }),
    )
    .returning("lastValue")
    .executeTakeFirstOrThrow();
  return row.lastValue;
}

/**
 * Transition a Draft Offer to Finalized, assigning its number. Unlike Invoices
 * there are no VIES/HNB gates — an Offer is a proposal, not a tax document. The
 * assigned number is the bare sequence value (e.g. "1"); display layers render
 * it as "Ponuda #1".
 */
export async function finalizeOffer(id: number): Promise<OfferDocument> {
  const db = getDb();
  const offer = await loadOffer(id);

  assertOfferFinalizable(offer);

  await db.transaction().execute(async (trx) => {
    const sequence = await assignOfferSequence(trx, offer.companyId, yearOf(offer.issueDate!));
    await trx
      .updateTable("invoices")
      .set({
        status: OFFER_STATUS.FINALIZED,
        documentNumber: String(sequence),
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", id)
      .execute();
  });

  return loadOffer(id);
}

export async function finalizeOfferWithPdfs(
  id: number,
  deps: GenerateDeps = {},
): Promise<OfferDocument> {
  const db = getDb();
  const offer = await loadOffer(id);
  assertOfferFinalizable(offer);

  const context = await loadPdfGenerationContext(offer, deps);

  await db.transaction().execute(async (trx) => {
    const sequence = await assignOfferSequence(trx, offer.companyId, yearOf(offer.issueDate!));
    const documentNumber = String(sequence);
    const finalized = { ...offer, status: OFFER_STATUS.FINALIZED, documentNumber };

    let pdfs: GeneratedPdfArtifacts;
    try {
      pdfs = await renderAndStoreInvoicePdfs(finalized, context, deps);
    } catch (error: unknown) {
      wrapPdfFailure(error);
    }

    await trx
      .updateTable("invoices")
      .set({
        status: OFFER_STATUS.FINALIZED,
        documentNumber,
        pdfPathHr: pdfs.pdfPathHr,
        pdfHashHr: pdfs.pdfHashHr,
        pdfPathEn: pdfs.pdfPathEn,
        pdfHashEn: pdfs.pdfHashEn,
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", id)
      .execute();
  });

  return loadOffer(id);
}

/**
 * Move a finalized Offer through its lifecycle: Finalized → Accepted / Rejected,
 * and Rejected → Finalized (a Client can change their mind). Accepted is
 * terminal — convert it to an Invoice instead.
 */
export async function transitionOfferStatus(id: number, target: OfferStatus): Promise<OfferDocument> {
  const db = getDb();
  const offer = await loadOffer(id);
  const current = offer.status as OfferStatus;

  const allowed = OFFER_TRANSITIONS[current] ?? [];
  if (!allowed.includes(target)) {
    throw invalidOperation(`Cannot move Offer from ${current} to ${target}`);
  }

  await db
    .updateTable("invoices")
    .set({ status: target, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .execute();

  return loadOffer(id);
}

// Copies line items into a fresh draft, re-expanding any Service Catalog
// {day}/{month}/{year} placeholders against the given date. (Most descriptions
// are already-expanded literals, so this is a no-op for them.)
function copyLineItems(lineItems: Invoice["lineItems"], now: Date): LineItemInput[] {
  return lineItems.map((li) => ({
    descriptionHr: li.descriptionHr != null ? expandPlaceholders(li.descriptionHr, now) : null,
    descriptionEn: li.descriptionEn != null ? expandPlaceholders(li.descriptionEn, now) : null,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
  }));
}

function dateOffsetDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return differenceInCalendarDays(new Date(`${end}T00:00:00`), new Date(`${start}T00:00:00`));
}

function lineItemHasPayload(lineItem: Invoice["lineItems"][number]): boolean {
  const hasHrDescription = lineItem.descriptionHr != null && lineItem.descriptionHr.trim() !== "";
  const hasEnDescription = lineItem.descriptionEn != null && lineItem.descriptionEn.trim() !== "";

  return (
    hasHrDescription ||
    hasEnDescription ||
    lineItem.quantity != null ||
    lineItem.unitPrice != null
  );
}

function lineItemIsFinalizable(lineItem: Invoice["lineItems"][number]): boolean {
  return (
    lineItem.descriptionHr != null &&
    lineItem.descriptionHr.trim() !== "" &&
    lineItem.quantity != null &&
    Number.isFinite(lineItem.quantity) &&
    lineItem.quantity > 0 &&
    lineItem.unitPrice != null &&
    Number.isFinite(lineItem.unitPrice)
  );
}

function finalizableLineItemIssue(invoice: Invoice): "missing" | "incomplete" | null {
  let completeItems = 0;

  for (const lineItem of invoice.lineItems) {
    if (!lineItemHasPayload(lineItem)) continue;
    if (!lineItemIsFinalizable(lineItem)) return "incomplete";
    completeItems += 1;
  }

  return completeItems > 0 ? null : "missing";
}

async function dueDateFromPaymentTerms(offer: Invoice, issueDate: Date): Promise<string> {
  const db = getDb();
  const [settings, company, client] = await Promise.all([
    getSettings(),
    db
      .selectFrom("companies")
      .select("defaultPaymentTermsDays")
      .where("id", "=", offer.companyId)
      .executeTakeFirst(),
    offer.clientId
      ? db
          .selectFrom("clients")
          .select("defaultPaymentTermsDays")
          .where("id", "=", offer.clientId)
          .executeTakeFirst()
      : Promise.resolve(null),
  ]);

  const terms =
    client?.defaultPaymentTermsDays ??
    company?.defaultPaymentTermsDays ??
    settings.defaultPaymentTermsDays;

  return format(addDays(issueDate, terms), "yyyy-MM-dd");
}

/**
 * Convert an Accepted Offer into a new Draft Invoice, copying Client, Line Items,
 * currency, Notes, Location and Payment Method. The exchange rate is NOT copied —
 * it is fetched fresh when the Invoice is finalized. The Offer is left untouched.
 */
export async function convertOfferToInvoice(offerId: number): Promise<Invoice> {
  const offer = await loadOffer(offerId);
  if (offer.status !== OFFER_STATUS.ACCEPTED) {
    throw invalidOperation(
      `Only Accepted offers can be converted to an Invoice (current status: ${offer.status})`,
    );
  }

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const dueDate = await dueDateFromPaymentTerms(offer, now);

  return createInvoice({
    type: DOCUMENT_TYPE.INVOICE,
    companyId: offer.companyId,
    clientId: offer.clientId,
    locationId: offer.locationId,
    paymentMethodId: offer.paymentMethodId,
    currency: offer.currency,
    email: offer.email,
    notesHr: offer.notesHr,
    notesEn: offer.notesEn,
    issueDate: today,
    deliveryDate: today,
    dueDate,
    lineItems: copyLineItems(offer.lineItems, new Date()),
  });
}

/**
 * Duplicate any Invoice, Credit Note or Offer into a new Draft of the same type
 * with today's date and re-expanded Service Catalog placeholders. All other data
 * is copied; finalization-only fields (Document Number, exchange rate, PDFs) are
 * not — the duplicate starts clean.
 */
export async function duplicateDocument(id: number): Promise<Invoice> {
  const source = await getInvoice(id);
  if (!source) throw notFound("Document not found");

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  // For Invoices this preserves the due-date offset; for Offers it preserves the
  // valid-until offset. The offset is derived from dates because terms/validity
  // days are defaulting state, not document data.
  const offset = dateOffsetDays(source.issueDate, source.dueDate);
  const followUp = offset != null ? format(addDays(now, offset), "yyyy-MM-dd") : null;

  return createInvoice({
    type: source.type as DocumentType,
    companyId: source.companyId,
    clientId: source.clientId,
    locationId: source.locationId,
    paymentMethodId: source.paymentMethodId,
    currency: source.currency,
    email: source.email,
    issueDate: today,
    deliveryDate: source.type === DOCUMENT_TYPE.OFFER ? null : today,
    dueDate: followUp,
    notesHr: source.notesHr,
    notesEn: source.notesEn,
    lineItems: copyLineItems(source.lineItems, now),
  });
}
