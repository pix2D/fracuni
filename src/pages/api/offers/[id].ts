import type { APIRoute } from "astro";
import { getOffer, updateOffer, deleteOffer } from "@/lib/offers";
import {
  handleApiError,
  errorResponse,
  jsonResponse,
  parseIdParam,
  parseJsonRequest,
} from "@/lib/api";
import { UpdateOfferSchema } from "@/lib/offers.schema";

async function loadOfferOr404(id: number): Promise<Response | null> {
  const offer = await getOffer(id);
  if (!offer) return errorResponse("Not found", 404);
  return null;
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const offer = await getOffer(id);
    if (!offer) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(offer);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const missing = await loadOfferOr404(id);
    if (missing) return missing;
    const body = await parseJsonRequest(request, UpdateOfferSchema);
    const offer = await updateOffer(id, body);
    return jsonResponse(offer);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const missing = await loadOfferOr404(id);
    if (missing) return missing;
    await deleteOffer(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
