import type { APIRoute } from "astro";
import { convertOfferToInvoice } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

// Convert an Accepted Offer into a new Draft Invoice. Returns the new invoice so
// the client can navigate to it. The Offer is left untouched.
export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const invoice = await convertOfferToInvoice(id);
    return jsonResponse(invoice, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
