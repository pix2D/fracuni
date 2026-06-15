import type { APIRoute } from "astro";
import { finalizeInvoice } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const invoice = await finalizeInvoice(id);
    return jsonResponse(invoice);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
