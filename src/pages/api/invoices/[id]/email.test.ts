import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET, POST } from "@/pages/api/invoices/[id]/email";
import { finalizeInvoice } from "@/lib/document-engine";
import { generateInvoicePdfs, type HtmlRenderer } from "@/lib/pdf-generator";
import { configureEmailSending, type EmailSender, type OutgoingEmail } from "@/lib/email";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { upsertCompanyProfile, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { updateSettings } from "@/lib/settings";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;
let sentEmails: OutgoingEmail[];

const fakeRenderer: HtmlRenderer = async (html) => Buffer.from(`PDF::${html.length}`);

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-email-route-"));
  sentEmails = [];
  const sender: EmailSender = async (email) => {
    sentEmails.push(email);
    return { ok: true, messageId: "pm-route-1" };
  };
  configureEmailSending({ sender, dataDir });
});

afterEach(async () => {
  configureEmailSending({ sender: null, dataDir: null });
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
  emailSubjectTemplate: "Račun {documentNumber}",
  emailBodyTemplate: "Poštovani {clientName}",
};

async function readyInvoice() {
  await upsertCompanyProfile(COMPANY_INPUT);
  const location = await createLocation({ number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod({
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  const client = await createClient({
    name: "Domaći d.o.o.",
    clientType: "business",
    country: "HR",
    oib: "98765432109",
    email: "racuni@domaci.hr",
  });
  const draft = await createInvoice({
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
  await finalizeInvoice(draft.id);
  return generateInvoicePdfs(draft.id, { renderer: fakeRenderer, dataDir });
}

describe("GET /api/invoices/:id/email", () => {
  it("returns the pre-filled defaults and (empty) log history", async () => {
    const invoice = await readyInvoice();

    const response = await GET(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.to).toBe("racuni@domaci.hr");
    expect(body.subject).toBe("Račun 1/1/1");
    expect(body.body).toBe("Poštovani Domaći d.o.o.");
    expect(body.from).toBe("Orion Test Works <info@orion-test-works.test>");
    expect(body.attachmentFilename).toBe("1-1-1-domaci-d-o-o.pdf");
    expect(body.logs).toEqual([]);
  });
});

describe("POST /api/invoices/:id/email", () => {
  it("sends the email and transitions the invoice to Sent", async () => {
    const invoice = await readyInvoice();
    await updateSettings({ postmarkApiKey: "test-key" });

    const request = new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ to: "client@example.com", subject: "Hi", body: "Body" }),
    });
    const response = await POST(apiContext({ params: { id: String(invoice.id) }, request }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.invoice.status).toBe("sent");
    expect(body.log.postmarkMessageId).toBe("pm-route-1");
    expect(sentEmails).toHaveLength(1);

    // The send is now visible in the log history.
    const getResponse = await GET(apiContext({ params: { id: String(invoice.id) } }));
    const getBody = await getResponse.json();
    expect(getBody.logs).toHaveLength(1);
    expect(getBody.logs[0]!.status).toBe("sent");
  });

  it("returns 400 when the recipient is empty", async () => {
    const invoice = await readyInvoice();
    await updateSettings({ postmarkApiKey: "test-key" });

    const request = new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ to: "", subject: "Hi", body: "Body" }),
    });
    const response = await POST(apiContext({ params: { id: String(invoice.id) }, request }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the recipient is not a valid email address", async () => {
    const invoice = await readyInvoice();
    await updateSettings({ postmarkApiKey: "test-key" });

    const request = new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ to: "not-an-email", subject: "Hi", body: "Body" }),
    });
    const response = await POST(apiContext({ params: { id: String(invoice.id) }, request }));
    expect(response.status).toBe(400);
  });

  it("returns 409 and keeps the invoice Finalized when Postmark is not configured", async () => {
    const invoice = await readyInvoice();

    const request = new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ to: "client@example.com", subject: "Hi", body: "Body" }),
    });
    const response = await POST(apiContext({ params: { id: String(invoice.id) }, request }));
    expect(response.status).toBe(409);
    expect((await getInvoice(invoice.id))!.status).toBe("finalized");
  });

  it("returns 400 for an invalid id", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ to: "x@y.com", subject: "s", body: "b" }),
    });
    const response = await POST(apiContext({ params: { id: "abc" }, request }));
    expect(response.status).toBe(400);
  });
});
