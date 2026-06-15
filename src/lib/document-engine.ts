import { getDb } from "@/lib/db";
import type { Transaction } from "kysely";
import { sql } from "kysely";
import type { DB } from "@/lib/db.generated";
import { invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";
import { getInvoice, type Invoice } from "@/lib/invoices";
import { INVOICE_STATUS } from "@/lib/documents";
import { determineTaxTreatment } from "@/lib/tax-engine";
import { validateVat, type ViesSuccess } from "@/lib/vies";
import { getExchangeRate, type HnbSuccess } from "@/lib/hnb";

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
