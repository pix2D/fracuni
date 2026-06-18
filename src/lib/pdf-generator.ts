// Orchestrates PDF generation for a finalized Invoice or Credit Note: loads the
// entities, builds the per-language view model, renders HTML -> PDF, stores the
// files on disk in the bookkeeper-friendly directory layout, computes the
// SHA-256 of each file, and persists the paths + hashes on the invoice row.
//
// The renderer is injected (defaulting to the real Playwright one) so the whole
// pipeline is testable without a browser, and so callers can generate PDFs
// without launching Chromium in tests.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sql } from "kysely";
import { getDb } from "@/lib/db";
import { getInvoice, type Invoice } from "@/lib/invoices";
import { getCompany } from "@/lib/companies";
import { getClient } from "@/lib/clients";
import { getSettings } from "@/lib/settings";
import { buildPdfDocumentData, type PdfLang } from "@/lib/pdf-document";
import { renderDocumentHtml } from "@/lib/pdf-template";
import { renderHtmlToPdf } from "@/lib/pdf-renderer";
import { DOCUMENT_TYPE, type DocumentType } from "@/lib/documents";
import { isDomestic } from "@/lib/countries";
import { slugify } from "@/lib/slug";
import { invalidOperation, notFound } from "@/lib/app-errors";

export type HtmlRenderer = (html: string) => Promise<Buffer>;

export interface GenerateDeps {
  /** Defaults to the real Playwright renderer. Injected for tests / regeneration. */
  renderer?: HtmlRenderer;
  /** Root of the data volume; PDFs land under `<dataDir>/pdfs/…`. */
  dataDir?: string;
}

const PDF_SUBDIR = "pdfs";

// Process-wide defaults for callers that can't pass `deps` (the finalize API
// route). Under test this swaps in a fake renderer and a temp data dir so route
// tests neither launch Chromium nor write into the real data volume. Null fields
// fall back to the real Playwright renderer / `data` directory.
let defaults: { renderer: HtmlRenderer | null; dataDir: string | null } = {
  renderer: null,
  dataDir: null,
};

export function configurePdfGeneration(
  overrides: { renderer?: HtmlRenderer | null; dataDir?: string | null },
): void {
  defaults = { ...defaults, ...overrides };
}

const LOGO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Document Numbers contain slashes ("1/1/1") which can't go in a filename.
function fileSafeNumber(documentNumber: string): string {
  return documentNumber.replace(/\//g, "-");
}

function pdfFilename(
  type: DocumentType,
  fileNumber: string,
  clientSlug: string,
  lang: PdfLang,
): string {
  if (type === DOCUMENT_TYPE.CREDIT_NOTE) {
    return lang === "en"
      ? `${fileNumber}-credit-note-${clientSlug}-en.pdf`
      : `${fileNumber}-odobrenje-${clientSlug}.pdf`;
  }
  return lang === "en" ? `${fileNumber}-${clientSlug}-en.pdf` : `${fileNumber}-${clientSlug}.pdf`;
}

async function readLogoDataUri(
  logoPath: string | null,
  dataDir: string,
): Promise<string | null> {
  if (!logoPath) return null;
  const mime = LOGO_MIME[path.extname(logoPath).toLowerCase()];
  if (!mime) return null;
  try {
    const bytes = await fs.readFile(path.join(dataDir, logoPath));
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function storePdf(
  buffer: Buffer,
  relPath: string,
  dataDir: string,
): Promise<{ path: string; hash: string }> {
  const abs = path.join(dataDir, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  const hash = createHash("sha256").update(buffer).digest("hex");
  return { path: relPath, hash };
}

/**
 * Generate (or regenerate) the PDF(s) for a finalized document and persist their
 * paths and SHA-256 hashes. Foreign clients produce two PDFs (HR + EN); domestic
 * clients produce one (HR). Returns the updated invoice.
 */
export async function generateInvoicePdfs(
  invoiceId: number,
  deps: GenerateDeps = {},
): Promise<Invoice> {
  const renderer = deps.renderer ?? defaults.renderer ?? renderHtmlToPdf;
  const dataDir = deps.dataDir ?? defaults.dataDir ?? path.resolve("data");

  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw notFound("Invoice not found");
  if (!invoice.documentNumber || !invoice.issueDate || invoice.clientId == null) {
    throw invalidOperation("PDFs can only be generated for a finalized document");
  }

  const company = await getCompany(invoice.companyId);
  if (!company) throw notFound("Company not found");
  const client = await getClient(invoice.clientId);
  if (!client) throw notFound("Client not found");
  const location = company.locations.find((l) => l.id === invoice.locationId);
  if (!location) throw notFound("Location not found");
  const paymentMethod = company.paymentMethods.find((p) => p.id === invoice.paymentMethodId);
  if (!paymentMethod) throw notFound("Payment method not found");

  const settings = await getSettings();
  const logoDataUri = await readLogoDataUri(company.logoPath, dataDir);

  const type = invoice.type as DocumentType;
  const langs: PdfLang[] = isDomestic(client.country) ? ["hr"] : ["hr", "en"];

  const fileNumber = fileSafeNumber(invoice.documentNumber);
  const companySlug = slugify(company.name);
  const clientSlug = slugify(client.name);
  const year = invoice.issueDate.slice(0, 4);
  const month = invoice.issueDate.slice(5, 7);

  const stored: Partial<Record<PdfLang, { path: string; hash: string }>> = {};

  for (const lang of langs) {
    const data = buildPdfDocumentData({
      lang,
      invoice,
      company,
      client,
      location,
      paymentMethod,
      vatRate: settings.defaultVatRate,
      logoDataUri,
    });
    const html = renderDocumentHtml(data);
    const buffer = await renderer(html);

    const filename = pdfFilename(type, fileNumber, clientSlug, lang);
    const relPath = [PDF_SUBDIR, companySlug, year, month, filename].join("/");
    stored[lang] = await storePdf(buffer, relPath, dataDir);
  }

  await getDb()
    .updateTable("invoices")
    .set({
      pdfPathHr: stored.hr?.path ?? null,
      pdfHashHr: stored.hr?.hash ?? null,
      pdfPathEn: stored.en?.path ?? null,
      pdfHashEn: stored.en?.hash ?? null,
      updatedAt: sql`datetime('now')`,
    })
    .where("id", "=", invoiceId)
    .execute();

  const updated = await getInvoice(invoiceId);
  if (!updated) throw notFound("Invoice not found");
  return updated;
}
