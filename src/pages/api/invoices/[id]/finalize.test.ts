import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { POST } from "@/pages/api/invoices/[id]/finalize";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { upsertCompanyProfile, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { configurePdfGeneration } from "@/lib/pdf-generator";
import { DOCUMENT_TYPE, type DocumentType } from "@/lib/documents";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

// The route generates PDFs as part of finalization. Swap in a fake renderer and
// a temp data dir so these tests stay fast (no Chromium) and don't touch the
// real data volume. Real rendering is covered in pdf-renderer.integration.test.ts.
let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-route-"));
  configurePdfGeneration({ renderer: async (html) => Buffer.from(html), dataDir });
});

afterEach(async () => {
  configurePdfGeneration({ renderer: null, dataDir: null });
  await fs.rm(dataDir, { recursive: true, force: true });
});

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
};

async function setup() {
  await upsertCompanyProfile(COMPANY_INPUT);
  const location = await createLocation({ number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod({
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", clientType: "business", country: "HR", oib: "98765432109" });
  return { location, paymentMethod, client };
}

async function draftDocument(type: DocumentType = DOCUMENT_TYPE.INVOICE) {
  const { location, paymentMethod, client } = await setup();
  return createInvoice({
    type,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
}

describe("POST /api/invoices/:id/finalize", () => {
  it("finalizes a complete draft and returns the document number", async () => {
    const { location, paymentMethod, client } = await setup();
    const invoice = await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("finalized");
    expect(body.documentNumber).toBe("1/1/1");
    // Finalization also generates the PDF: a domestic client gets one HR file.
    expect(body.pdfPathHr).toBe("pdfs/2026/06/1-1-1-domaci-d-o-o.pdf");
    expect(body.pdfHashHr).toMatch(/^[0-9a-f]{64}$/);
    expect(body.pdfPathEn).toBeNull();
    await expect(fs.access(path.join(dataDir, body.pdfPathHr))).resolves.toBeUndefined();
  });

  it("rolls back Invoice finalization when PDF generation fails, then retries with the first number", async () => {
    const invoice = await draftDocument();
    configurePdfGeneration({
      renderer: async () => {
        throw new Error("renderer failed");
      },
      dataDir,
    });

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/PDF generation failed/);

    const failed = await getInvoice(invoice.id);
    expect(failed).toMatchObject({
      status: "draft",
      documentNumber: null,
      pdfPathHr: null,
      pdfHashHr: null,
      pdfPathEn: null,
      pdfHashEn: null,
    });

    configurePdfGeneration({ renderer: async (html) => Buffer.from(html), dataDir });
    const retry = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(retry.status).toBe(200);
    const retried = await retry.json();
    expect(retried.documentNumber).toBe("1/1/1");
    expect(retried.pdfHashHr).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rolls back Credit Note finalization when PDF generation fails, then retries with the first number", async () => {
    const creditNote = await draftDocument(DOCUMENT_TYPE.CREDIT_NOTE);
    configurePdfGeneration({
      renderer: async () => {
        throw new Error("renderer failed");
      },
      dataDir,
    });

    const response = await POST(apiContext({ params: { id: String(creditNote.id) } }));
    expect(response.status).toBe(409);

    const failed = await getInvoice(creditNote.id);
    expect(failed).toMatchObject({
      status: "draft",
      documentNumber: null,
      pdfPathHr: null,
      pdfHashHr: null,
      pdfPathEn: null,
      pdfHashEn: null,
    });

    configurePdfGeneration({ renderer: async (html) => Buffer.from(html), dataDir });
    const retry = await POST(apiContext({ params: { id: String(creditNote.id) } }));
    expect(retry.status).toBe(200);
    const retried = await retry.json();
    expect(retried.documentNumber).toBe("1/1/1");
    expect(retried.pdfPathHr).toBe("pdfs/2026/06/1-1-1-odobrenje-domaci-d-o-o.pdf");
  });

  it("returns 400 when required fields are missing", async () => {
    await setup();
    const invoice = await createInvoice({});

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.missingFields).toContain("Client");
    expect((await getInvoice(invoice.id))!.status).toBe("draft");
  });

  it("returns 409 when finalizing an already-finalized invoice", async () => {
    const { location, paymentMethod, client } = await setup();
    const invoice = await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });
    await POST(apiContext({ params: { id: String(invoice.id) } }));

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(409);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await POST(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});
