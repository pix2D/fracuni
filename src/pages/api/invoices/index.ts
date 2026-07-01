import type { APIRoute } from "astro";
import { createInvoice, listInvoices } from "@/lib/invoices";
import { getCompanyProfile } from "@/lib/companies";
import { DOCUMENT_TYPE, type DocumentType } from "@/lib/documents";
import { errorResponse, handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateInvoiceSchema } from "@/lib/invoices.schema";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") as DocumentType | null) ?? undefined;

  const invoices = await listInvoices({ type });
  return jsonResponse(invoices);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateInvoiceSchema);
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile must be set up before creating documents", 409);

    const invoice = await createInvoice({ ...body, type: body.type ?? DOCUMENT_TYPE.INVOICE });
    return jsonResponse(invoice, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
