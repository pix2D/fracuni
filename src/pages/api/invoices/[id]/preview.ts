import type { APIRoute } from "astro";
import { getClient } from "@/lib/clients";
import { getCompany } from "@/lib/companies";
import { isDomestic } from "@/lib/countries";
import { getDataDir } from "@/lib/data-dir";
import { DOCUMENT_TYPE } from "@/lib/documents";
import { getInvoice } from "@/lib/invoices";
import { buildPdfPreviewDocumentData, type PdfLang } from "@/lib/pdf-document";
import { readLogoDataUri } from "@/lib/pdf-generator";
import { renderDocumentHtml } from "@/lib/pdf-template";
import { getSettings } from "@/lib/settings";
import { handleApiError, errorResponse, parseIdParam } from "@/lib/api";

function parseLang(value: string | null): PdfLang | null {
  if (value === "hr" || value === "en") return value;
  return null;
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const url = new URL(request.url);
    const rawLang = url.searchParams.get("lang");
    const requestedLang = parseLang(rawLang);
    if (rawLang && !requestedLang) return errorResponse("Invalid language", 400);

    const invoice = await getInvoice(id);
    if (
      !invoice ||
      (invoice.type !== DOCUMENT_TYPE.INVOICE && invoice.type !== DOCUMENT_TYPE.CREDIT_NOTE)
    ) {
      return errorResponse("Not found", 404);
    }

    const company = await getCompany(invoice.companyId);
    if (!company) return errorResponse("Company not found", 404);

    const [client, settings] = await Promise.all([
      invoice.clientId ? getClient(invoice.clientId) : Promise.resolve(null),
      getSettings(),
    ]);
    const location =
      invoice.locationId != null
        ? company.locations.find((candidate) => candidate.id === invoice.locationId)
        : null;
    const paymentMethod =
      invoice.paymentMethodId != null
        ? company.paymentMethods.find((candidate) => candidate.id === invoice.paymentMethodId)
        : null;

    const lang = requestedLang ?? (client && !isDomestic(client.country) ? "en" : "hr");
    const logoDataUri = await readLogoDataUri(company.logoPath, getDataDir());
    const data = buildPdfPreviewDocumentData({
      lang,
      invoice,
      company,
      client,
      location,
      paymentMethod,
      vatRate: settings.defaultVatRate,
      logoDataUri,
    });

    return new Response(renderDocumentHtml(data), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
