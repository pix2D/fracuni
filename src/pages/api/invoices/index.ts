import type { APIRoute } from "astro";
import { createInvoice, listInvoices } from "@/lib/invoices";
import { DOCUMENT_TYPE, type DocumentType } from "@/lib/documents";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateInvoiceSchema } from "@/lib/invoices.schema";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  let companyId: number | undefined;
  const rawCompanyId = url.searchParams.get("companyId");
  if (rawCompanyId !== null) {
    const parsed = Number(rawCompanyId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return errorResponse("Invalid companyId", 400);
    }
    companyId = parsed;
  }

  const type = (url.searchParams.get("type") as DocumentType | null) ?? undefined;

  const invoices = await listInvoices({ companyId, type });
  return jsonResponse(invoices);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateInvoiceSchema);
    const invoice = await createInvoice({ ...body, type: body.type ?? DOCUMENT_TYPE.INVOICE });
    return jsonResponse(invoice, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
