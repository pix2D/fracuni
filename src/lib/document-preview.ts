import { getClient } from "@/lib/clients";
import { getCompany } from "@/lib/companies";
import { isDomestic } from "@/lib/countries";
import { getDataDir } from "@/lib/data-dir";
import { INVOICE_STATUS } from "@/lib/documents";
import { getExchangeRatePreview } from "@/lib/hnb";
import type { Invoice } from "@/lib/invoices";
import { buildPdfPreviewDocumentData, type PdfLang } from "@/lib/pdf-document";
import { readLogoDataUri } from "@/lib/pdf-generator";
import { renderDocumentHtml } from "@/lib/pdf-template";
import { getSettings } from "@/lib/settings";
import { errorResponse } from "@/lib/api";

function parseLang(value: string | null): PdfLang | null {
  if (value === "hr" || value === "en") return value;
  return null;
}

function isDraft(document: Invoice): boolean {
  return document.status === INVOICE_STATUS.DRAFT;
}

export async function documentPreviewResponse(document: Invoice, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawLang = url.searchParams.get("lang");
  const requestedLang = parseLang(rawLang);
  if (rawLang && !requestedLang) return errorResponse("Invalid language", 400);

  const company = await getCompany(document.companyId);
  if (!company) return errorResponse("Company not found", 404);

  const [client, settings] = await Promise.all([
    document.clientId ? getClient(document.clientId) : Promise.resolve(null),
    getSettings(),
  ]);
  const location =
    document.locationId != null
      ? company.locations.find((candidate) => candidate.id === document.locationId)
      : null;
  const paymentMethod =
    document.paymentMethodId != null
      ? company.paymentMethods.find((candidate) => candidate.id === document.paymentMethodId)
      : null;

  const lang = requestedLang ?? (client && !isDomestic(client.country) ? "en" : "hr");
  const [logoDataUri, previewExchangeRate] = await Promise.all([
    readLogoDataUri(company.logoPath, getDataDir()),
    isDraft(document)
      ? getExchangeRatePreview(document.currency, document.issueDate)
      : Promise.resolve(null),
  ]);
  const data = buildPdfPreviewDocumentData({
    lang,
    invoice: document,
    company,
    client,
    location,
    paymentMethod,
    vatRate: settings.defaultVatRate,
    logoDataUri,
    previewExchangeRate,
  });

  return new Response(renderDocumentHtml(data), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
