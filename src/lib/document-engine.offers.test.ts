import { describe, it, expect } from "vitest";
import {
  finalizeOffer,
  finalizeInvoice,
  transitionOfferStatus,
  convertOfferToInvoice,
  duplicateDocument,
} from "@/lib/document-engine";
import { createInvoice } from "@/lib/invoices";
import { createOffer, getOffer, type Offer } from "@/lib/offers";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { DOCUMENT_TYPE } from "@/lib/documents";
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

async function setup(overrides: Partial<typeof COMPANY_INPUT> = {}) {
  const company = await createCompany({ ...COMPANY_INPUT, ...overrides });
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
  return {
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
  };
}

type Ids = Awaited<ReturnType<typeof setup>>;

async function draftOffer(ids: Ids, overrides: Partial<Parameters<typeof createOffer>[0]> = {}): Promise<Offer> {
  return createOffer({
    companyId: ids.companyId,
    clientId: ids.clientId,
    locationId: ids.locationId,
    paymentMethodId: ids.paymentMethodId,
    currency: "EUR",
    issueDate: "2026-06-15",
    dueDate: "2026-07-15",
    paymentTermsDays: 30,
    lineItems: [{ descriptionHr: "Usluga", quantity: 2, unitPrice: 100 }],
    ...overrides,
  });
}

describe("finalizeOffer — numbering", () => {
  it("assigns a plain sequential number and flips to finalized", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids)).id);
    expect(offer.status).toBe("finalized");
    expect(offer.documentNumber).toBe("1");
    expect(offer.type).toBe(DOCUMENT_TYPE.OFFER);
  });

  it("increments per company per year, independent of payment method", async () => {
    const ids = await setup();
    const pm2 = await createPaymentMethod(ids.companyId, { number: 2, nameHr: "Gotovina" });

    const a = await finalizeOffer((await draftOffer(ids)).id);
    const b = await finalizeOffer((await draftOffer(ids, { paymentMethodId: pm2.id })).id);

    expect([a.documentNumber, b.documentNumber]).toEqual(["1", "2"]);
  });

  it("resets the sequence each calendar year", async () => {
    const ids = await setup();
    const y25 = await finalizeOffer((await draftOffer(ids, { issueDate: "2025-12-01" })).id);
    const y26 = await finalizeOffer((await draftOffer(ids, { issueDate: "2026-01-02" })).id);
    expect([y25.documentNumber, y26.documentNumber]).toEqual(["1", "1"]);
  });

  it("keeps offer numbering separate from the invoice/credit-note sequence", async () => {
    const ids = await setup();

    const invoice = await finalizeInvoice(
      (await createInvoice({ ...ids, currency: "EUR", issueDate: "2026-06-15", lineItems: [{ quantity: 1, unitPrice: 10 }] })).id,
    );
    const offer = await finalizeOffer((await draftOffer(ids)).id);

    expect(invoice.documentNumber).toBe("1/1/1");
    expect(offer.documentNumber).toBe("1");
  });

  it("blocks finalization listing missing required fields", async () => {
    const { companyId } = await setup();
    const bare = await createOffer({ companyId });
    await expect(finalizeOffer(bare.id)).rejects.toThrow(
      /missing required fields: Client, Location, Payment Method, Currency, Offer Date, at least one Line Item/,
    );
  });

  it("refuses to finalize a non-draft offer", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids)).id);
    await expect(finalizeOffer(offer.id)).rejects.toThrow(/Only Draft offers can be finalized/);
  });

  it("rejects an invoice id (wrong type) as not found", async () => {
    const ids = await setup();
    const invoice = await createInvoice({ ...ids, currency: "EUR", issueDate: "2026-06-15", lineItems: [{ quantity: 1, unitPrice: 10 }] });
    await expect(finalizeOffer(invoice.id)).rejects.toThrow(/Offer not found/);
  });
});

describe("transitionOfferStatus", () => {
  async function finalized(ids: Ids): Promise<Offer> {
    return finalizeOffer((await draftOffer(ids)).id);
  }

  it("moves Finalized → Accepted and Finalized → Rejected", async () => {
    const ids = await setup();
    const accepted = await transitionOfferStatus((await finalized(ids)).id, "accepted");
    expect(accepted.status).toBe("accepted");

    const rejected = await transitionOfferStatus((await finalized(ids)).id, "rejected");
    expect(rejected.status).toBe("rejected");
  });

  it("allows Rejected → Finalized (un-reject)", async () => {
    const ids = await setup();
    const offer = await finalized(ids);
    await transitionOfferStatus(offer.id, "rejected");
    const reopened = await transitionOfferStatus(offer.id, "finalized");
    expect(reopened.status).toBe("finalized");
  });

  it("rejects an illegal transition (Draft → Accepted)", async () => {
    const ids = await setup();
    const draft = await draftOffer(ids);
    await expect(transitionOfferStatus(draft.id, "accepted")).rejects.toThrow(/Cannot move Offer/);
  });

  it("treats Accepted as terminal (no further transitions)", async () => {
    const ids = await setup();
    const offer = await finalized(ids);
    await transitionOfferStatus(offer.id, "accepted");
    await expect(transitionOfferStatus(offer.id, "rejected")).rejects.toThrow(/Cannot move Offer/);
  });
});

describe("convertOfferToInvoice", () => {
  it("creates a Draft Invoice copying client, items, currency, notes, location and payment method", async () => {
    const ids = await setup();
    const offer = await finalizeOffer(
      (await draftOffer(ids, { notesHr: "Hvala", currency: "USD" })).id,
    );
    await transitionOfferStatus(offer.id, "accepted");

    const invoice = await convertOfferToInvoice(offer.id);

    expect(invoice.type).toBe(DOCUMENT_TYPE.INVOICE);
    expect(invoice.status).toBe("draft");
    expect(invoice.clientId).toBe(ids.clientId);
    expect(invoice.locationId).toBe(ids.locationId);
    expect(invoice.paymentMethodId).toBe(ids.paymentMethodId);
    expect(invoice.currency).toBe("USD");
    expect(invoice.notesHr).toBe("Hvala");
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0]).toMatchObject({ descriptionHr: "Usluga", quantity: 2, unitPrice: 100 });
  });

  it("does NOT copy the exchange rate (fetched fresh at invoice finalization)", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids)).id);
    await transitionOfferStatus(offer.id, "accepted");

    const invoice = await convertOfferToInvoice(offer.id);
    expect(invoice.exchangeRate).toBeNull();
    expect(invoice.exchangeRateDate).toBeNull();
    expect(invoice.documentNumber).toBeNull();
  });

  it("leaves the Offer untouched", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids)).id);
    await transitionOfferStatus(offer.id, "accepted");
    await convertOfferToInvoice(offer.id);

    const reread = await getOffer(offer.id);
    expect(reread!.status).toBe("accepted");
    expect(reread!.type).toBe(DOCUMENT_TYPE.OFFER);
  });

  it("only converts Accepted offers", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids)).id);
    await expect(convertOfferToInvoice(offer.id)).rejects.toThrow(/Only Accepted offers/);
  });
});

describe("duplicateDocument", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("duplicates an Offer into a fresh Draft of the same type with today's offer date", async () => {
    const ids = await setup();
    const offer = await finalizeOffer((await draftOffer(ids, { notesHr: "x" })).id);
    await transitionOfferStatus(offer.id, "accepted");

    const dup = await duplicateDocument(offer.id);

    expect(dup.type).toBe(DOCUMENT_TYPE.OFFER);
    expect(dup.status).toBe("draft");
    expect(dup.documentNumber).toBeNull();
    expect(dup.issueDate).toBe(today);
    expect(dup.notesHr).toBe("x");
    expect(dup.lineItems).toHaveLength(1);
    expect(dup.id).not.toBe(offer.id);
  });

  it("duplicates an Invoice into a Draft Invoice with today's date", async () => {
    const ids = await setup();
    const invoice = await finalizeInvoice(
      (await createInvoice({ ...ids, currency: "EUR", issueDate: "2026-01-01", paymentTermsDays: 15, lineItems: [{ descriptionHr: "A", quantity: 1, unitPrice: 50 }] })).id,
    );

    const dup = await duplicateDocument(invoice.id);

    expect(dup.type).toBe(DOCUMENT_TYPE.INVOICE);
    expect(dup.status).toBe("draft");
    expect(dup.documentNumber).toBeNull();
    expect(dup.issueDate).toBe(today);
    expect(dup.lineItems[0]).toMatchObject({ descriptionHr: "A", quantity: 1, unitPrice: 50 });
  });

  it("re-expands Service Catalog placeholders against today", async () => {
    const ids = await setup();
    const draft = await createOffer({
      ...ids,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Najam za {month}/{year}" }],
    });

    const dup = await duplicateDocument(draft.id);
    const expectedMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const expectedYear = String(new Date().getFullYear());
    expect(dup.lineItems[0]!.descriptionHr).toBe(`Najam za ${expectedMonth}/${expectedYear}`);
  });
});
