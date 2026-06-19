import type { APIRoute } from "astro";
import { markInvoicePaid } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { MarkPaidSchema } from "@/lib/mark-paid.schema";

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const { paymentDate } = await parseJsonRequest(request, MarkPaidSchema);
    const invoice = await markInvoicePaid(id, paymentDate);
    return jsonResponse(invoice);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
