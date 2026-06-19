import type { APIRoute } from "astro";
import { getInvoice, updateInvoice, deleteInvoice } from "@/lib/invoices";
import { notFound } from "@/lib/app-errors";
import {
  handleApiError,
  errorResponse,
  jsonResponse,
  parseIdParam,
  parseJsonRequest,
} from "@/lib/api";
import { UpdateInvoiceSchema } from "@/lib/invoices.schema";

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const invoice = await getInvoice(id);
    if (!invoice) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(invoice);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const body = await parseJsonRequest(request, UpdateInvoiceSchema);

    const existing = await getInvoice(id);
    if (!existing) throw notFound("Invoice not found");

    return jsonResponse(await updateInvoice(id, body));
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    await deleteInvoice(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
