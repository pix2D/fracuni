import type { APIRoute } from "astro";
import { finalizeOffer } from "@/lib/document-engine";
import { generateInvoicePdfs } from "@/lib/pdf-generator";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    // Assign the offer number first; only once it is a committed record do we
    // render its PDF artifact(s). No VIES/HNB gates apply to Offers.
    await finalizeOffer(id);
    const offer = await generateInvoicePdfs(id);
    return jsonResponse(offer);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
