import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildEmailDefaults,
  sendInvoiceEmail,
  listEmailLogs,
  type EmailSender,
  type OutgoingEmail,
} from "@/lib/email";
import { finalizeInvoice } from "@/lib/document-engine";
import { generateInvoicePdfs, type HtmlRenderer } from "@/lib/pdf-generator";
import { createInvoice, getInvoice, type Invoice } from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { updateSettings } from "@/lib/settings";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-email-"));
});

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

const fakeRenderer: HtmlRenderer = async (html) =>
  Buffer.from(`PDF::${html.length}::${html.slice(0, 40)}`);

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
  emailSubjectTemplate: "Račun {documentNumber} — {companyName}",
  emailBodyTemplate: "Poštovani {clientName},\n\nu privitku Vam šaljemo račun.",
};

async function setupCompany() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  return { company, location, paymentMethod };
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

// Finalized + PDFs generated, ready to send. Domestic client by default.
async function readyDomestic(invoiceOverrides: Record<string, unknown> = {}): Promise<Invoice> {
  const { company, location, paymentMethod } = await setupCompany();
  const client = await createClient({
    name: "Domaći d.o.o.",
    clientType: "business",
    country: "HR",
    oib: "98765432109",
    email: "racuni@domaci.hr",
  });
  const draft = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    ...invoiceOverrides,
  });
  await finalizeInvoice(draft.id);
  return generateInvoicePdfs(draft.id, { renderer: fakeRenderer, dataDir });
}

async function readyForeign(): Promise<Invoice> {
  const { company, location, paymentMethod } = await setupCompany();
  const client = await createClient({
    name: "Acme GmbH",
    clientType: "business",
    country: "DE",
    vatNumber: "DE123456789",
    email: "billing@acme.de",
  });
  const draft = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", descriptionEn: "Service", quantity: 1, unitPrice: 100 }],
  });
  await finalizeInvoice(draft.id, { viesFetcher: VIES_VALID });
  return generateInvoicePdfs(draft.id, { renderer: fakeRenderer, dataDir });
}

// Captures the message a sender was handed, and reports success.
function recordingSender(): { sender: EmailSender; sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  const sender: EmailSender = async (email) => {
    sent.push(email);
    return { ok: true, messageId: "pm-123" };
  };
  return { sender, sent };
}

describe("buildEmailDefaults", () => {
  it("expands the subject/body templates and pre-fills the recipient", async () => {
    const invoice = await readyDomestic();

    const defaults = await buildEmailDefaults(invoice.id);

    expect(defaults.subject).toBe("Račun 1/1/1 — Firefly One d.o.o.");
    expect(defaults.body).toContain("Poštovani Domaći d.o.o.");
    expect(defaults.to).toBe("racuni@domaci.hr");
    expect(defaults.from).toBe("Firefly One <info@firefly.hr>");
    expect(defaults.attachmentFilename).toBe("1-1-1-domaci-d-o-o.pdf");
  });

  it("prefers the Invoice's stored email over the Client default", async () => {
    const invoice = await readyDomestic({ email: "override@domaci.hr" });
    const defaults = await buildEmailDefaults(invoice.id);
    expect(defaults.to).toBe("override@domaci.hr");
  });

  it("names the English PDF for a foreign client", async () => {
    const invoice = await readyForeign();
    const defaults = await buildEmailDefaults(invoice.id);
    expect(defaults.attachmentFilename).toBe("1-1-1-acme-gmbh-en.pdf");
  });
});

describe("sendInvoiceEmail", () => {
  it("sends, logs, and transitions a domestic invoice to Sent with the Croatian PDF", async () => {
    const invoice = await readyDomestic();
    await updateSettings({ postmarkApiKey: "test-key" });
    const { sender, sent } = recordingSender();

    const result = await sendInvoiceEmail(
      invoice.id,
      { to: "client@example.com", subject: "Hi", body: "Body" },
      { sender, dataDir },
    );

    expect(result.invoice.status).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.from).toBe("Firefly One <info@firefly.hr>");
    expect(sent[0]!.to).toBe("client@example.com");
    expect(sent[0]!.attachments).toHaveLength(1);
    expect(sent[0]!.attachments[0]!.filename).toBe("1-1-1-domaci-d-o-o.pdf");
    expect(sent[0]!.attachments[0]!.contentType).toBe("application/pdf");

    const logs = await listEmailLogs(invoice.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.status).toBe("sent");
    expect(logs[0]!.postmarkMessageId).toBe("pm-123");
    expect(logs[0]!.recipient).toBe("client@example.com");
    expect(logs[0]!.subject).toBe("Hi");
    expect(logs[0]!.errorMessage).toBeNull();
  });

  it("attaches only the English PDF for a foreign client", async () => {
    const invoice = await readyForeign();
    await updateSettings({ postmarkApiKey: "test-key" });
    const { sender, sent } = recordingSender();

    await sendInvoiceEmail(
      invoice.id,
      { to: "billing@acme.de", subject: "Hi", body: "Body" },
      { sender, dataDir },
    );

    expect(sent[0]!.attachments).toHaveLength(1);
    expect(sent[0]!.attachments[0]!.filename).toBe("1-1-1-acme-gmbh-en.pdf");
  });

  it("logs the failure, leaves the invoice Finalized, and throws when Postmark fails", async () => {
    const invoice = await readyDomestic();
    await updateSettings({ postmarkApiKey: "test-key" });
    const failingSender: EmailSender = async () => ({
      ok: false,
      messageId: null,
      error: "Inactive recipient",
    });

    await expect(
      sendInvoiceEmail(
        invoice.id,
        { to: "client@example.com", subject: "Hi", body: "Body" },
        { sender: failingSender, dataDir },
      ),
    ).rejects.toThrow(/Inactive recipient/);

    expect((await getInvoice(invoice.id))!.status).toBe("finalized");
    const logs = await listEmailLogs(invoice.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.status).toBe("error");
    expect(logs[0]!.errorMessage).toBe("Inactive recipient");
    expect(logs[0]!.postmarkMessageId).toBeNull();
  });

  it("refuses to send a draft", async () => {
    const { company, location, paymentMethod } = await setupCompany();
    const client = await createClient({ name: "Domaći", clientType: "business", country: "HR", oib: "98765432109" });
    const draft = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });
    await updateSettings({ postmarkApiKey: "test-key" });

    await expect(
      sendInvoiceEmail(draft.id, { to: "x@y.com", subject: "s", body: "b" }, { dataDir }),
    ).rejects.toThrow(/Finalized/i);
  });

  it("refuses to send when no Postmark API key is configured", async () => {
    const invoice = await readyDomestic();
    const { sender } = recordingSender();

    await expect(
      sendInvoiceEmail(invoice.id, { to: "x@y.com", subject: "s", body: "b" }, { sender, dataDir }),
    ).rejects.toThrow(/API key/i);
  });
});
