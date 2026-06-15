import { describe, it, expect } from "vitest";
import {
  createCreditNoteFromInvoice,
  finalizeInvoice,
  markInvoiceSent,
  markInvoicePaid,
} from "@/lib/document-engine";
import { createInvoice, getInvoice, deleteInvoice, type Invoice } from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { getDb } from "@/lib/db";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const COMPANY_INPUT = {
  name: "Firefly One d.o.o.",
  address: "Ulica 1, Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  iban: "HR1234567890",
  swift: "ZABAHR2X",
  emailFromAddress: "info@firefly.hr",
  emailFromName: "Firefly One",
  issuerName: "Ana Anić",
};

async function setupCompany(overrides: Partial<typeof COMPANY_INPUT> = {}) {
  const company = await createCompany({ ...COMPANY_INPUT, ...overrides });
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  return { company, location, paymentMethod };
}

// Domestic Croatian client — no VIES, EUR, so finalization needs no network.
async function domesticClient() {
  return createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
}

// Foreign client with a VAT Number — triggers the VIES (reverse charge) gate.
async function foreignVatClient() {
  return createClient({ name: "Acme GmbH", country: "DE", vatNumber: "DE123456789" });
}

type Ids = { companyId: number; clientId: number; locationId: number; paymentMethodId: number };

async function draft(ids: Ids, overrides: Partial<Parameters<typeof createInvoice>[0]> = {}): Promise<Invoice> {
  return createInvoice({
    companyId: ids.companyId,
    clientId: ids.clientId,
    locationId: ids.locationId,
    paymentMethodId: ids.paymentMethodId,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    ...overrides,
  });
}

function mockJson(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

const VIES_VALID = mockJson({
  valid: true,
  countryCode: "DE",
  vatNumber: "123456789",
  requestDate: "2026-06-15+02:00",
  name: "ACME GMBH",
  address: "MUSTERSTRASSE 1\n12345 BERLIN",
});

const VIES_INVALID = mockJson({
  valid: false,
  countryCode: "DE",
  vatNumber: "000000000",
  requestDate: "2026-06-15+02:00",
  name: "---",
  address: "---",
});

const VIES_DOWN: typeof fetch = (async () => {
  throw new Error("ECONNREFUSED");
}) as typeof fetch;

const HNB_USD = mockJson([
  { datum_primjene: "2026-06-13", valuta: "USD", jedinica: 1, srednji_tecaj: "1,0823" },
]);

const HNB_DOWN: typeof fetch = (async () => {
  throw new Error("ECONNREFUSED");
}) as typeof fetch;

async function setupDomestic() {
  const { company, location, paymentMethod } = await setupCompany();
  const client = await domesticClient();
  return {
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
  };
}

describe("finalizeInvoice — Document Number assignment", () => {
  it("assigns a sequential number formatted {sequence}/{location}/{payment_method}", async () => {
    const ids = await setupDomestic();
    const invoice = await finalizeInvoice((await draft(ids)).id);

    expect(invoice.status).toBe("finalized");
    expect(invoice.documentNumber).toBe("1/1/1");
  });

  it("increments the sequence across consecutive finalizations", async () => {
    const ids = await setupDomestic();

    const first = await finalizeInvoice((await draft(ids)).id);
    const second = await finalizeInvoice((await draft(ids)).id);
    const third = await finalizeInvoice((await draft(ids)).id);

    expect([first.documentNumber, second.documentNumber, third.documentNumber]).toEqual([
      "1/1/1",
      "2/1/1",
      "3/1/1",
    ]);
  });

  it("uses the location and payment-method numbers in the document number", async () => {
    const { company, paymentMethod } = await setupCompany();
    const location = await createLocation(company.id, { number: 7, nameHr: "Split" });
    const pm2 = await createPaymentMethod(company.id, { number: 3, nameHr: "Gotovina" });
    const client = await domesticClient();

    const a = await finalizeInvoice(
      (
        await draft({
          companyId: company.id,
          clientId: client.id,
          locationId: location.id,
          paymentMethodId: pm2.id,
        })
      ).id,
    );

    // sequence keyed on pm2, location number 7, payment-method number 3
    expect(a.documentNumber).toBe("1/7/3");
    // the default payment method keeps its own independent sequence (still at 1)
    const b = await finalizeInvoice(
      (
        await draft({
          companyId: company.id,
          clientId: client.id,
          locationId: location.id,
          paymentMethodId: paymentMethod.id,
        })
      ).id,
    );
    expect(b.documentNumber).toBe("1/7/1");
  });
});

describe("finalizeInvoice — sequence isolation", () => {
  it("keeps independent sequences per company", async () => {
    const a = await setupCompany();
    const b = await setupCompany({ oib: "99999999999" });
    const clientA = await domesticClient();
    const clientB = await createClient({ name: "Drugi", country: "HR", oib: "11111111111" });

    const invA = await finalizeInvoice(
      (
        await draft({
          companyId: a.company.id,
          clientId: clientA.id,
          locationId: a.location.id,
          paymentMethodId: a.paymentMethod.id,
        })
      ).id,
    );
    const invB = await finalizeInvoice(
      (
        await draft({
          companyId: b.company.id,
          clientId: clientB.id,
          locationId: b.location.id,
          paymentMethodId: b.paymentMethod.id,
        })
      ).id,
    );

    expect(invA.documentNumber).toBe("1/1/1");
    expect(invB.documentNumber).toBe("1/1/1");
  });

  it("keeps independent sequences per payment method within a company", async () => {
    const { company, location, paymentMethod } = await setupCompany();
    const pm2 = await createPaymentMethod(company.id, { number: 2, nameHr: "Gotovina" });
    const client = await domesticClient();
    const base = { companyId: company.id, clientId: client.id, locationId: location.id };

    const p1a = await finalizeInvoice((await draft({ ...base, paymentMethodId: paymentMethod.id })).id);
    const p2a = await finalizeInvoice((await draft({ ...base, paymentMethodId: pm2.id })).id);
    const p1b = await finalizeInvoice((await draft({ ...base, paymentMethodId: paymentMethod.id })).id);

    expect(p1a.documentNumber).toBe("1/1/1");
    expect(p2a.documentNumber).toBe("1/1/2");
    expect(p1b.documentNumber).toBe("2/1/1");
  });

  it("shares one sequence between Invoices and Credit Notes within a payment method", async () => {
    const ids = await setupDomestic();

    const invoice = await finalizeInvoice((await draft(ids)).id);
    const creditNote = await finalizeInvoice((await draft(ids, { type: "credit_note" })).id);

    expect(invoice.documentNumber).toBe("1/1/1");
    expect(creditNote.type).toBe("credit_note");
    expect(creditNote.documentNumber).toBe("2/1/1");
  });

  it("resets the sequence at the start of each calendar year", async () => {
    const ids = await setupDomestic();

    const y2025a = await finalizeInvoice((await draft(ids, { issueDate: "2025-12-31" })).id);
    const y2025b = await finalizeInvoice((await draft(ids, { issueDate: "2025-06-01" })).id);
    const y2026 = await finalizeInvoice((await draft(ids, { issueDate: "2026-01-01" })).id);

    expect(y2025a.documentNumber).toBe("1/1/1");
    expect(y2025b.documentNumber).toBe("2/1/1");
    expect(y2026.documentNumber).toBe("1/1/1");
  });
});

describe("finalizeInvoice — VIES gate", () => {
  async function foreignSetup() {
    const { company, location, paymentMethod } = await setupCompany();
    const client = await foreignVatClient();
    return {
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
    };
  }

  it("finalizes a foreign client with a valid VAT and stores the VIES proof", async () => {
    const ids = await foreignSetup();
    const drafted = await draft(ids, { currency: "EUR" });

    const finalized = await finalizeInvoice(drafted.id, { viesFetcher: VIES_VALID });

    expect(finalized.status).toBe("finalized");
    expect(finalized.documentNumber).toBe("1/1/1");

    const stored = await getDb()
      .selectFrom("viesVerifications")
      .selectAll()
      .where("invoiceId", "=", drafted.id)
      .executeTakeFirst();
    expect(stored).toBeDefined();
    expect(stored!.valid).toBe(1);
    expect(stored!.countryCode).toBe("DE");
    expect(JSON.parse(stored!.rawResponse)).toMatchObject({ valid: true });
  });

  it("blocks finalization and keeps Draft when VIES reports an invalid VAT", async () => {
    const ids = await foreignSetup();
    const drafted = await draft(ids);

    await expect(finalizeInvoice(drafted.id, { viesFetcher: VIES_INVALID })).rejects.toThrow(
      /not valid according to VIES/,
    );

    const after = await getInvoice(drafted.id);
    expect(after!.status).toBe("draft");
    expect(after!.documentNumber).toBeNull();
  });

  it("blocks finalization when the VIES service is unreachable", async () => {
    const ids = await foreignSetup();
    const drafted = await draft(ids);

    await expect(finalizeInvoice(drafted.id, { viesFetcher: VIES_DOWN })).rejects.toThrow(
      /VIES verification failed/,
    );

    expect((await getInvoice(drafted.id))!.status).toBe("draft");
  });

  it("does not run VIES for a domestic client", async () => {
    const ids = await setupDomestic();
    // VIES_DOWN would throw if called — finalization must succeed without touching it.
    const finalized = await finalizeInvoice((await draft(ids)).id, { viesFetcher: VIES_DOWN });
    expect(finalized.status).toBe("finalized");
  });
});

describe("finalizeInvoice — HNB gate", () => {
  it("fetches and stores the exchange rate for a non-EUR invoice", async () => {
    const ids = await setupDomestic();
    const drafted = await draft(ids, { currency: "USD" });

    const finalized = await finalizeInvoice(drafted.id, { hnbFetcher: HNB_USD });

    expect(finalized.status).toBe("finalized");
    expect(finalized.exchangeRate).toBe(1.0823);
    expect(finalized.exchangeRateDate).toBe("2026-06-13");
  });

  it("leaves exchange-rate fields null for an EUR invoice", async () => {
    const ids = await setupDomestic();
    const finalized = await finalizeInvoice((await draft(ids, { currency: "EUR" })).id);
    expect(finalized.exchangeRate).toBeNull();
    expect(finalized.exchangeRateDate).toBeNull();
  });

  it("blocks finalization and keeps Draft when the HNB API is unavailable", async () => {
    const ids = await setupDomestic();
    const drafted = await draft(ids, { currency: "USD" });

    await expect(finalizeInvoice(drafted.id, { hnbFetcher: HNB_DOWN })).rejects.toThrow(
      /Exchange rate unavailable/,
    );

    expect((await getInvoice(drafted.id))!.status).toBe("draft");
  });
});

describe("finalizeInvoice — required field validation", () => {
  it("lists every missing required field", async () => {
    const { company } = await setupCompany();
    const drafted = await createInvoice({ companyId: company.id });

    await expect(finalizeInvoice(drafted.id)).rejects.toThrow(
      /missing required fields: Client, Location, Payment Method, Currency, Issue Date, at least one Line Item/,
    );
  });

  it("rejects a draft with no line items", async () => {
    const ids = await setupDomestic();
    const drafted = await draft(ids, { lineItems: [] });

    await expect(finalizeInvoice(drafted.id)).rejects.toThrow(/at least one Line Item/);
    expect((await getInvoice(drafted.id))!.status).toBe("draft");
  });

  it("throws for a non-existent invoice", async () => {
    await expect(finalizeInvoice(9999)).rejects.toThrow("Invoice not found");
  });
});

describe("finalizeInvoice — status transition enforcement", () => {
  it("refuses to finalize an already-finalized invoice", async () => {
    const ids = await setupDomestic();
    const drafted = await draft(ids);
    await finalizeInvoice(drafted.id);

    await expect(finalizeInvoice(drafted.id)).rejects.toThrow(/Only Draft invoices can be finalized/);
  });

  it("does not change the Document Number on a second finalization attempt", async () => {
    const ids = await setupDomestic();
    const first = await finalizeInvoice((await draft(ids)).id);
    expect(first.documentNumber).toBe("1/1/1");

    await expect(finalizeInvoice(first.id)).rejects.toThrow();

    const reread = await getInvoice(first.id);
    expect(reread!.documentNumber).toBe("1/1/1");
  });

  it("prevents deletion of a finalized invoice", async () => {
    const ids = await setupDomestic();
    const finalized = await finalizeInvoice((await draft(ids)).id);

    await expect(deleteInvoice(finalized.id)).rejects.toThrow(/Only Draft invoices can be deleted/);
  });
});

describe("createCreditNoteFromInvoice", () => {
  it("pre-fills a Draft Credit Note from a finalized Invoice with negated amounts", async () => {
    const ids = await setupDomestic();
    const source = await finalizeInvoice(
      (await draft(ids, { lineItems: [{ descriptionHr: "Usluga", quantity: 2, unitPrice: 150 }] })).id,
    );

    const creditNote = await createCreditNoteFromInvoice(source.id);

    expect(creditNote.type).toBe("credit_note");
    expect(creditNote.status).toBe("draft");
    expect(creditNote.documentNumber).toBeNull();
    expect(creditNote.clientId).toBe(source.clientId);
    expect(creditNote.currency).toBe(source.currency);
    expect(creditNote.lineItems).toHaveLength(1);
    expect(creditNote.lineItems[0]).toMatchObject({
      descriptionHr: "Usluga",
      quantity: 2,
      unitPrice: -150,
    });
  });

  it("references the source Invoice's Document Number", async () => {
    const ids = await setupDomestic();
    const source = await finalizeInvoice((await draft(ids)).id);

    const creditNote = await createCreditNoteFromInvoice(source.id);

    expect(source.documentNumber).toBe("1/1/1");
    expect(creditNote.originalInvoiceNumber).toBe("1/1/1");
  });

  it("shares the Document Number sequence when the Credit Note is finalized", async () => {
    const ids = await setupDomestic();
    const source = await finalizeInvoice((await draft(ids)).id);

    const creditNote = await finalizeInvoice((await createCreditNoteFromInvoice(source.id)).id);

    expect(source.documentNumber).toBe("1/1/1");
    expect(creditNote.documentNumber).toBe("2/1/1");
  });

  it("refuses to create from a Draft Invoice (no Document Number yet)", async () => {
    const ids = await setupDomestic();
    const drafted = await draft(ids);

    await expect(createCreditNoteFromInvoice(drafted.id)).rejects.toThrow(
      /only be created from a Finalized Invoice/,
    );
  });

  it("refuses to create a Credit Note from another Credit Note", async () => {
    const ids = await setupDomestic();
    const source = await finalizeInvoice((await draft(ids)).id);
    const creditNote = await createCreditNoteFromInvoice(source.id);

    await expect(createCreditNoteFromInvoice(creditNote.id)).rejects.toThrow(
      /only be created from an Invoice/,
    );
  });

  it("throws for a non-existent invoice", async () => {
    await expect(createCreditNoteFromInvoice(9999)).rejects.toThrow("Invoice not found");
  });
});

describe("finalizeInvoice — gap-free sequence", () => {
  it("does not consume a number when a gate blocks finalization", async () => {
    const { company, location, paymentMethod } = await setupCompany();
    const domestic = await domesticClient();
    const foreign = await foreignVatClient();
    const base = {
      companyId: company.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
    };

    const first = await finalizeInvoice(
      (await draft({ ...base, clientId: domestic.id })).id,
    );
    expect(first.documentNumber).toBe("1/1/1");

    // A blocked finalization (VIES down) must not advance the sequence.
    const blocked = await draft({ ...base, clientId: foreign.id });
    await expect(finalizeInvoice(blocked.id, { viesFetcher: VIES_DOWN })).rejects.toThrow();

    const next = await finalizeInvoice(
      (await draft({ ...base, clientId: domestic.id })).id,
    );
    expect(next.documentNumber).toBe("2/1/1");
  });

  it("assigns unique, contiguous numbers under concurrent finalization", async () => {
    const ids = await setupDomestic();
    const drafts = await Promise.all([draft(ids), draft(ids), draft(ids), draft(ids), draft(ids)]);

    const finalized = await Promise.all(drafts.map((d) => finalizeInvoice(d.id)));

    const sequences = finalized
      .map((inv) => Number(inv.documentNumber!.split("/")[0]))
      .sort((a, b) => a - b);
    expect(sequences).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("markInvoiceSent", () => {
  it("transitions a Finalized invoice to Sent", async () => {
    const ids = await setupDomestic();
    const finalized = await finalizeInvoice((await draft(ids)).id);

    const sent = await markInvoiceSent(finalized.id);
    expect(sent.status).toBe("sent");
  });

  it("refuses to mark a Draft as Sent", async () => {
    const ids = await setupDomestic();
    const draftInvoice = await draft(ids);

    await expect(markInvoiceSent(draftInvoice.id)).rejects.toThrow(/Finalized/i);
    expect((await getInvoice(draftInvoice.id))!.status).toBe("draft");
  });
});

describe("markInvoicePaid", () => {
  it("transitions a Sent invoice to Paid and records the payment date", async () => {
    const ids = await setupDomestic();
    const finalized = await finalizeInvoice((await draft(ids)).id);
    const sent = await markInvoiceSent(finalized.id);

    const paid = await markInvoicePaid(sent.id, "2026-06-20");
    expect(paid.status).toBe("paid");
    expect(paid.paymentDate).toBe("2026-06-20");
  });

  it("refuses to mark a Finalized (not yet Sent) invoice as Paid", async () => {
    const ids = await setupDomestic();
    const finalized = await finalizeInvoice((await draft(ids)).id);

    await expect(markInvoicePaid(finalized.id, "2026-06-20")).rejects.toThrow(/Sent/i);
    expect((await getInvoice(finalized.id))!.status).toBe("finalized");
  });
});
