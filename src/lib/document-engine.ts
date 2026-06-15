import { getDb } from "@/lib/db";
import type { Transaction } from "kysely";
import { sql } from "kysely";
import type { DB } from "@/lib/db.generated";
import { invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";
import {
  getInvoice,
  updateInvoice,
  type Invoice,
  type InvoiceInput,
  type LineItem,
  type LineItemInput,
} from "@/lib/invoices";
import { INVOICE_STATUS } from "@/lib/documents";
import { determineTaxTreatment } from "@/lib/tax-engine";
import { validateVat, type ViesSuccess } from "@/lib/vies";
import { getExchangeRate, type HnbSuccess } from "@/lib/hnb";
import { generateInvoicePdfs, type GenerateDeps } from "@/lib/pdf-generator";

// Invoices and Credit Notes are priced in EUR by default; only non-EUR documents
// need an HNB exchange rate captured at finalization.
const BASE_CURRENCY = "EUR";

// Fetchers are injected so tests can drive the VIES / HNB gates deterministically.
// Left undefined in production, the underlying clients fall back to global fetch.
export interface FinalizeDeps {
  viesFetcher?: typeof fetch;
  hnbFetcher?: typeof fetch;
}

// A Draft must carry these before it can become a legal document. Order here is
// the order they surface in the error message.
const REQUIRED_FIELDS: { label: string; present: (invoice: Invoice) => boolean }[] = [
  { label: "Client", present: (i) => i.clientId != null },
  { label: "Location", present: (i) => i.locationId != null },
  { label: "Payment Method", present: (i) => i.paymentMethodId != null },
  { label: "Currency", present: (i) => !!i.currency },
  { label: "Issue Date", present: (i) => !!i.issueDate },
  { label: "at least one Line Item", present: (i) => i.lineItems.length > 0 },
];

function assertFinalizable(invoice: Invoice): void {
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw invalidOperation(`Only Draft invoices can be finalized (current status: ${invoice.status})`);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !field.present(invoice)).map((f) => f.label);
  if (missing.length > 0) {
    throw invalidRequest(`Cannot finalize: missing required fields: ${missing.join(", ")}`, {
      missingFields: missing,
    });
  }
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
    .select(["country", "vatNumber"])
    .where("id", "=", clientId)
    .executeTakeFirst();
  if (!client) throw notFound("Referenced client not found");

  // VIES gate — only foreign clients with a VAT Number (reverse charge) are checked.
  let viesResult: ViesSuccess | null = null;
  const treatment = determineTaxTreatment({
    clientCountry: client.country,
    clientVatNumber: client.vatNumber,
  });
  if (treatment === "reverse-charge") {
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

    if (viesResult) {
      await trx
        .insertInto("viesVerifications")
        .values({
          invoiceId: id,
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
        exchangeRate: exchangeRate?.rate ?? null,
        exchangeRateDate: exchangeRate?.effectiveDate ?? null,
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", id)
      .execute();
  });

  const finalized = await getInvoice(id);
  if (!finalized) throw notFound("Invoice not found");
  return finalized;
}

// Empty strings from the form mean "not set", same as null — collapse them so a
// "" → null edit doesn't register as a spurious change in the audit description.
function normalizeText(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return null;
  return value ?? null;
}

function formatAuditValue(value: unknown): string {
  const normalized = normalizeText(value);
  return normalized === null ? "(none)" : String(normalized);
}

// Fields whose before/after values are meaningful in the audit trail. Reference
// IDs (client/location/payment method) are listed too — they read as raw ids,
// but the trail's job is "something changed", and the ids are stable anchors.
const AUDITED_FIELDS: { key: keyof InvoiceInput & keyof Invoice; label: string }[] = [
  { key: "clientId", label: "Client" },
  { key: "locationId", label: "Location" },
  { key: "paymentMethodId", label: "Payment Method" },
  { key: "currency", label: "Currency" },
  { key: "email", label: "Email" },
  { key: "issueDate", label: "Issue Date" },
  { key: "deliveryDate", label: "Delivery Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "paymentTermsDays", label: "Payment Terms" },
  { key: "notesHr", label: "Notes (HR)" },
  { key: "notesEn", label: "Notes (EN)" },
];

function lineItemsChanged(before: LineItem[], after: LineItemInput[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((b, i) => {
    const a = after[i]!;
    return (
      normalizeText(b.descriptionHr) !== normalizeText(a.descriptionHr) ||
      normalizeText(b.descriptionEn) !== normalizeText(a.descriptionEn) ||
      (b.quantity ?? null) !== (a.quantity ?? null) ||
      (b.unitPrice ?? null) !== (a.unitPrice ?? null)
    );
  });
}

/**
 * Human-readable summary of what an edit changes, for the audit log. Only fields
 * actually present in `after` (an undefined field means "not submitted") and
 * whose value differs from `before` are reported. Returns a fallback string when
 * nothing observable changed, so every saved edit still leaves a trail.
 */
export function describeInvoiceChanges(before: Invoice, after: Partial<InvoiceInput>): string {
  const changes: string[] = [];

  for (const { key, label } of AUDITED_FIELDS) {
    if (after[key] === undefined) continue;
    if (normalizeText(after[key]) === normalizeText(before[key])) continue;
    changes.push(`${label}: ${formatAuditValue(before[key])} → ${formatAuditValue(after[key])}`);
  }

  if (after.lineItems !== undefined && lineItemsChanged(before.lineItems, after.lineItems)) {
    changes.push("Line items updated");
  }

  return changes.length > 0 ? changes.join("; ") : "Saved with no field changes";
}

/**
 * Edit a Finalized Invoice (or Credit Note) that has not yet been Sent. The edit
 * is audit-logged (atomically with the field changes) and the PDF(s) are
 * regenerated so the stored artifact and SHA-256 hash match the new content.
 *
 * Only Finalized documents take this path: Drafts edit without logging, and
 * Sent/Paid documents are immutable (rejected here and again in updateInvoice).
 */
export async function editFinalizedInvoice(
  id: number,
  input: Partial<InvoiceInput>,
  deps: GenerateDeps = {},
): Promise<Invoice> {
  const existing = await getInvoice(id);
  if (!existing) throw notFound("Invoice not found");
  if (existing.status !== INVOICE_STATUS.FINALIZED) {
    throw invalidOperation(
      `Only Finalized invoices can be edited (current status: ${existing.status})`,
    );
  }

  const description = describeInvoiceChanges(existing, input);
  await updateInvoice(id, input, { auditDescription: description });

  // Regenerate so the PDF on disk and its hash reflect the edited content.
  return generateInvoicePdfs(id, deps);
}
