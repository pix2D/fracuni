import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { markInvoicePaid } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

// YYYY-MM-DD, matching how dates are stored elsewhere on the invoice.
const MarkPaidSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)"),
});

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
