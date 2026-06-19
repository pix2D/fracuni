import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { POST } from "@/pages/api/invoices/[id]/mark-paid";
import { finalizeInvoice, markInvoiceSent } from "@/lib/document-engine";
import { generateInvoicePdfs, type HtmlRenderer } from "@/lib/pdf-generator";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;
const fakeRenderer: HtmlRenderer = async (html) => Buffer.from(`PDF::${html.length}`);

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-paid-"));
});

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

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

async function sentInvoice() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", clientType: "business", country: "HR", oib: "98765432109" });
  const draft = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
  await finalizeInvoice(draft.id);
  await generateInvoicePdfs(draft.id, { renderer: fakeRenderer, dataDir });
  return markInvoiceSent(draft.id);
}

function paidRequest(paymentDate: unknown): Request {
  return new Request("http://test.local", {
    method: "POST",
    body: JSON.stringify({ paymentDate }),
  });
}

describe("POST /api/invoices/:id/mark-paid", () => {
  it("transitions a Sent invoice to Paid and records the date", async () => {
    const invoice = await sentInvoice();

    const response = await POST(
      apiContext({ params: { id: String(invoice.id) }, request: paidRequest("2026-06-20") }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("paid");
    expect(body.paymentDate).toBe("2026-06-20");
  });

  it("returns 400 for a malformed payment date", async () => {
    const invoice = await sentInvoice();
    const response = await POST(
      apiContext({ params: { id: String(invoice.id) }, request: paidRequest("20-06-2026") }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 409 when the invoice is not yet Sent", async () => {
    const company = await createCompany({ ...COMPANY_INPUT, oib: "55555555555" });
    const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
    const paymentMethod = await createPaymentMethod(company.id, {
      number: 1,
      nameHr: "Transakcijski",
      isDefault: true,
    });
    const client = await createClient({ name: "Drugi", clientType: "business", country: "HR", oib: "11111111111" });
    const draft = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });
    const finalized = await finalizeInvoice(draft.id);

    const response = await POST(
      apiContext({ params: { id: String(finalized.id) }, request: paidRequest("2026-06-20") }),
    );
    expect(response.status).toBe(409);
    expect((await getInvoice(finalized.id))!.status).toBe("finalized");
  });

  it("returns 400 for an invalid id", async () => {
    const response = await POST(
      apiContext({ params: { id: "abc" }, request: paidRequest("2026-06-20") }),
    );
    expect(response.status).toBe(400);
  });
});
