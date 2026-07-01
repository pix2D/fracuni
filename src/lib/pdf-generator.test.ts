import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateInvoicePdfs, type HtmlRenderer } from "@/lib/pdf-generator";
import { finalizeInvoice } from "@/lib/document-engine";
import { createInvoice, getInvoice, type Invoice } from "@/lib/invoices";
import { upsertCompanyProfile, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-pdf-"));
});

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

// Deterministic stand-in for the real renderer: encodes the HTML length so each
// distinct document/language yields distinct bytes (and thus a distinct hash).
const fakeRenderer: HtmlRenderer = async (html) => Buffer.from(`PDF::${html.length}::${html.slice(0, 40)}`);

const COMPANY_INPUT = {
  name: "Orion Test Works d.o.o.",
  address: "Ulica 1, Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  iban: "HR1234567890",
  swift: "ZABAHR2X",
  emailFromAddress: "info@orion-test-works.test",
  emailFromName: "Orion Test Works",
  issuerName: "Ana Anić",
  legalTextServiceDomesticHr: "Domaći tekst.",
  legalTextServiceEuB2cHr: "EU B2C tekst.",
  legalTextServiceEuB2cEn: "EU B2C text.",
  legalTextServiceEuB2bReverseChargeHr: "Prijenos porezne obveze.",
  legalTextServiceEuB2bReverseChargeEn: "Reverse charge.",
  legalTextServiceEuB2bWithoutVatIdHr: "EU B2B bez PDV ID tekst.",
  legalTextServiceEuB2bWithoutVatIdEn: "EU B2B without VAT ID text.",
  legalTextServiceNonEuB2cHr: "Non-EU B2C tekst.",
  legalTextServiceNonEuB2cEn: "Non-EU B2C text.",
  legalTextServiceNonEuB2bHr: "Non-EU B2B tekst.",
  legalTextServiceNonEuB2bEn: "Non-EU B2B text.",
};

async function setupCompany() {
  await upsertCompanyProfile(COMPANY_INPUT);
  const location = await createLocation({ number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod({
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  return { location, paymentMethod };
}

function mockJson(body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status: 200 });
}

const VIES_VALID = mockJson({
  valid: true,
  countryCode: "DE",
  vatNumber: "123456789",
  requestDate: "2026-06-15+02:00",
  name: "ACME GMBH",
  address: "BERLIN",
});

async function finalizedDomestic(): Promise<Invoice> {
  const { location, paymentMethod } = await setupCompany();
  const client = await createClient({ name: "Domaći d.o.o.", clientType: "business", country: "HR", oib: "98765432109" });
  const draft = await createInvoice({
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
  return finalizeInvoice(draft.id);
}

async function finalizedForeign(type: "invoice" | "credit_note" = "invoice"): Promise<Invoice> {
  const { location, paymentMethod } = await setupCompany();
  const client = await createClient({ name: "Acme GmbH", clientType: "business", country: "DE", vatNumber: "DE123456789" });
  const draft = await createInvoice({
    type,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", descriptionEn: "Service", quantity: 1, unitPrice: 100 }],
  });
  return finalizeInvoice(draft.id, { viesFetcher: VIES_VALID });
}

describe("generateInvoicePdfs — domestic", () => {
  it("produces a single Croatian PDF, stores the path and SHA-256 hash", async () => {
    const finalized = await finalizedDomestic();

    const result = await generateInvoicePdfs(finalized.id, { renderer: fakeRenderer, dataDir });

    expect(result.pdfPathHr).toBe("pdfs/2026/06/1-1-1-domaci-d-o-o.pdf");
    expect(result.pdfPathEn).toBeNull();
    expect(result.pdfHashEn).toBeNull();
    expect(result.pdfHashHr).toMatch(/^[0-9a-f]{64}$/);

    const bytes = await fs.readFile(path.join(dataDir, result.pdfPathHr!));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(result.pdfHashHr);

    // Persisted to the database, not just returned.
    const reread = await getInvoice(finalized.id);
    expect(reread!.pdfPathHr).toBe(result.pdfPathHr);
    expect(reread!.pdfHashHr).toBe(result.pdfHashHr);
  });
});

describe("generateInvoicePdfs — foreign", () => {
  it("produces both a Croatian and an English PDF with the -en suffix", async () => {
    const finalized = await finalizedForeign();

    const result = await generateInvoicePdfs(finalized.id, { renderer: fakeRenderer, dataDir });

    expect(result.pdfPathHr).toBe("pdfs/2026/06/1-1-1-acme-gmbh.pdf");
    expect(result.pdfPathEn).toBe("pdfs/2026/06/1-1-1-acme-gmbh-en.pdf");
    expect(result.pdfHashHr).toMatch(/^[0-9a-f]{64}$/);
    expect(result.pdfHashEn).toMatch(/^[0-9a-f]{64}$/);
    // Distinct languages render distinct bytes.
    expect(result.pdfHashHr).not.toBe(result.pdfHashEn);

    await expect(fs.access(path.join(dataDir, result.pdfPathHr!))).resolves.toBeUndefined();
    await expect(fs.access(path.join(dataDir, result.pdfPathEn!))).resolves.toBeUndefined();
  });

  it("uses the credit-note filename convention", async () => {
    const finalized = await finalizedForeign("credit_note");

    const result = await generateInvoicePdfs(finalized.id, { renderer: fakeRenderer, dataDir });

    expect(result.pdfPathHr).toBe("pdfs/2026/06/1-1-1-odobrenje-acme-gmbh.pdf");
    expect(result.pdfPathEn).toBe("pdfs/2026/06/1-1-1-credit-note-acme-gmbh-en.pdf");
  });
});

describe("generateInvoicePdfs — regeneration", () => {
  it("overwrites the file and updates the hash when regenerated", async () => {
    const finalized = await finalizedDomestic();

    const first = await generateInvoicePdfs(finalized.id, { renderer: fakeRenderer, dataDir });

    let counter = 0;
    const changingRenderer: HtmlRenderer = async () => Buffer.from(`changed-${counter++}`);
    const second = await generateInvoicePdfs(finalized.id, { renderer: changingRenderer, dataDir });

    expect(second.pdfPathHr).toBe(first.pdfPathHr);
    expect(second.pdfHashHr).not.toBe(first.pdfHashHr);

    const bytes = await fs.readFile(path.join(dataDir, second.pdfPathHr!));
    expect(bytes.toString()).toBe("changed-0");
  });
});

describe("generateInvoicePdfs — guards", () => {
  it("refuses to generate for a draft (no document number)", async () => {
    const { location, paymentMethod } = await setupCompany();
    const client = await createClient({ name: "Domaći", clientType: "business", country: "HR", oib: "98765432109" });
    const draft = await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });

    await expect(
      generateInvoicePdfs(draft.id, { renderer: fakeRenderer, dataDir }),
    ).rejects.toThrow(/finalized/i);
  });

  it("throws for a non-existent invoice", async () => {
    await expect(
      generateInvoicePdfs(9999, { renderer: fakeRenderer, dataDir }),
    ).rejects.toThrow(/not found/i);
  });
});
