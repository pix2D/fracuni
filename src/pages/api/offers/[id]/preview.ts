import type { APIRoute } from "astro";
import { documentPreviewResponse } from "@/lib/document-preview";
import { getOffer } from "@/lib/offers";
import { handleApiError, errorResponse, parseIdParam } from "@/lib/api";

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const offer = await getOffer(id);
    if (!offer) return errorResponse("Not found", 404);

    return documentPreviewResponse(offer, request);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
