import type { APIRoute } from "astro";
import { finalizeInvoice } from "@/lib/document-engine";
import { generateInvoicePdfs } from "@/lib/pdf-generator";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    // Assign the Document Number and run the legal gates first; only once the
    // document is a committed legal record do we render its PDF artifact(s).
    await finalizeInvoice(id);
    const invoice = await generateInvoicePdfs(id);
    return jsonResponse(invoice);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
