import type { APIRoute } from "astro";
import { DOCUMENT_TYPE } from "@/lib/documents";
import { getInvoice } from "@/lib/invoices";
import { documentPreviewResponse } from "@/lib/document-preview";
import { handleApiError, errorResponse, parseIdParam } from "@/lib/api";

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const invoice = await getInvoice(id);
    if (
      !invoice ||
      (invoice.type !== DOCUMENT_TYPE.INVOICE && invoice.type !== DOCUMENT_TYPE.CREDIT_NOTE)
    ) {
      return errorResponse("Not found", 404);
    }

    return documentPreviewResponse(invoice, request);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
