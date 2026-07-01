// Email Service — sends a finalized Invoice / Credit Note to its Client through
// Postmark, attaching the correct-language PDF (English only for foreign clients,
// Croatian for domestic), logging every attempt, and transitioning the document
// to Sent on success.
//
// The Postmark sender is injected (defaulting to the real client) so the whole
// pipeline is testable without hitting the network, mirroring the PDF generator.
import { promises as fs } from "node:fs";
import path from "node:path";
import { ServerClient } from "postmark";
import type { Selectable } from "kysely";
import { getDb } from "@/lib/db";
import type { EmailLogs } from "@/lib/db.generated";
import { getInvoice, type Invoice } from "@/lib/invoices";
import { getCompanyProfile, type CompanyWithRelations } from "@/lib/companies";
import { getClient, type Client } from "@/lib/clients";
import { getSettings } from "@/lib/settings";
import { markInvoiceSent } from "@/lib/document-engine";
import { INVOICE_STATUS } from "@/lib/documents";
import { isDomestic } from "@/lib/countries";
import { getDataDir } from "@/lib/data-dir";
import { expandEmailTemplate } from "@/lib/placeholders";
import { invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";

// SQLite introspection reports autoincrement PKs as nullable; they never are after insert/select.
type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

export type EmailLog = NonNullId<Selectable<EmailLogs>>;

const PDF_CONTENT_TYPE = "application/pdf";

export interface EmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
}

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
}

export interface SendResult {
  ok: boolean;
  messageId: string | null;
  error?: string;
}

export type EmailSender = (email: OutgoingEmail, apiKey: string) => Promise<SendResult>;

// The real sender. Postmark surfaces failures both as non-zero ErrorCode and as
// thrown errors (network / auth); both collapse to a structured SendResult so the
// caller logs and reports uniformly.
const postmarkSender: EmailSender = async (email, apiKey) => {
  const client = new ServerClient(apiKey);
  try {
    const res = await client.sendEmail({
      From: email.from,
      To: email.to,
      Subject: email.subject,
      TextBody: email.body,
      Attachments: email.attachments.map((a) => ({
        Name: a.filename,
        Content: a.contentBase64,
        ContentType: a.contentType,
        ContentID: null,
      })),
    });
    if (res.ErrorCode !== 0) {
      return { ok: false, messageId: null, error: res.Message };
    }
    return { ok: true, messageId: res.MessageID };
  } catch (err: unknown) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : String(err) };
  }
};

// Process-wide defaults for callers that can't pass `deps` (the send API route).
// Under test this swaps in a fake sender and a temp data dir so route tests
// neither hit Postmark nor read the real data volume.
let defaults: { sender: EmailSender | null; dataDir: string | null } = {
  sender: null,
  dataDir: null,
};

export function configureEmailSending(
  overrides: { sender?: EmailSender | null; dataDir?: string | null },
): void {
  defaults = { ...defaults, ...overrides };
}

interface DocumentContext {
  invoice: Invoice;
  company: CompanyWithRelations;
  client: Client;
}

async function loadContext(invoiceId: number): Promise<DocumentContext> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw notFound("Invoice not found");
  const company = await getCompanyProfile();
  if (!company) throw notFound("Company profile not found");
  if (invoice.clientId == null) throw invalidOperation("Document has no client");
  const client = await getClient(invoice.clientId);
  if (!client) throw notFound("Client not found");
  return { invoice, company, client };
}

function fromAddress(company: CompanyWithRelations): string {
  return `${company.emailFromName} <${company.emailFromAddress}>`;
}

// Foreign clients receive the English PDF only; domestic clients the Croatian PDF.
function attachmentRelPath(invoice: Invoice, client: Client): string {
  const domestic = isDomestic(client.country);
  const relPath = domestic ? invoice.pdfPathHr : invoice.pdfPathEn;
  if (!relPath) {
    throw invalidOperation(
      domestic
        ? "Croatian PDF has not been generated for this document"
        : "English PDF has not been generated for this document",
    );
  }
  return relPath;
}

export interface EmailDefaults {
  to: string;
  subject: string;
  body: string;
  from: string;
  attachmentFilename: string;
}

/**
 * Build the pre-filled values for the send dialog: recipient (Invoice email →
 * Client email), subject/body from the Company templates with placeholders
 * expanded, the read-only From identity, and the name of the PDF that will be
 * attached.
 */
export async function buildEmailDefaults(invoiceId: number): Promise<EmailDefaults> {
  const { invoice, company, client } = await loadContext(invoiceId);

  const vars = {
    documentNumber: invoice.documentNumber ?? "",
    clientName: client.name,
    companyName: company.name,
  };

  return {
    to: invoice.email ?? client.email ?? "",
    subject: expandEmailTemplate(company.emailSubjectTemplate ?? "", vars),
    body: expandEmailTemplate(company.emailBodyTemplate ?? "", vars),
    from: fromAddress(company),
    attachmentFilename: path.basename(attachmentRelPath(invoice, client)),
  };
}

export async function listEmailLogs(invoiceId: number): Promise<EmailLog[]> {
  const rows = await getDb()
    .selectFrom("emailLogs")
    .selectAll()
    .where("invoiceId", "=", invoiceId)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc")
    .execute();
  return rows.map((row) => ({ ...row, id: row.id! }));
}

export interface SendInvoiceEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendDeps {
  sender?: EmailSender;
  dataDir?: string;
}

export interface SendInvoiceEmailResult {
  invoice: Invoice;
  log: EmailLog;
}

/**
 * Send a finalized document to its Client and transition it to Sent.
 *
 * Every attempt is logged (recipient, subject, Postmark message ID, status). A
 * failed delivery still writes a log row but throws and leaves the document
 * Finalized — the status only advances on a confirmed Postmark success.
 */
export async function sendInvoiceEmail(
  invoiceId: number,
  input: SendInvoiceEmailInput,
  deps: SendDeps = {},
): Promise<SendInvoiceEmailResult> {
  const sender = deps.sender ?? defaults.sender ?? postmarkSender;
  const dataDir = deps.dataDir ?? defaults.dataDir ?? getDataDir();

  const { invoice, company, client } = await loadContext(invoiceId);
  if (invoice.status !== INVOICE_STATUS.FINALIZED) {
    throw invalidOperation(
      `Only Finalized documents can be sent (current status: ${invoice.status})`,
    );
  }

  const recipient = input.to.trim();
  if (!recipient) throw invalidRequest("Recipient email is required");

  const settings = await getSettings();
  if (!settings.postmarkApiKey) {
    throw invalidOperation("Postmark API key is not configured in Settings");
  }

  const relPath = attachmentRelPath(invoice, client);
  const bytes = await fs.readFile(path.join(dataDir, relPath));

  const email: OutgoingEmail = {
    from: fromAddress(company),
    to: recipient,
    subject: input.subject,
    body: input.body,
    attachments: [
      {
        filename: path.basename(relPath),
        contentBase64: bytes.toString("base64"),
        contentType: PDF_CONTENT_TYPE,
      },
    ],
  };

  const result = await sender(email, settings.postmarkApiKey);

  const logRow = await getDb()
    .insertInto("emailLogs")
    .values({
      invoiceId,
      recipient,
      subject: input.subject,
      postmarkMessageId: result.messageId,
      status: result.ok ? "sent" : "error",
      errorMessage: result.ok ? null : (result.error ?? "Unknown error"),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  const log: EmailLog = { ...logRow, id: logRow.id! };

  if (!result.ok) {
    throw invalidOperation(`Email delivery failed: ${result.error ?? "Unknown error"}`);
  }

  const sent = await markInvoiceSent(invoiceId);
  return { invoice: sent, log };
}
