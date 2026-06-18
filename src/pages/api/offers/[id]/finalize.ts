import type { APIRoute } from "astro";
import { finalizeOfferWithPdfs } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const offer = await finalizeOfferWithPdfs(id);
    return jsonResponse(offer);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
