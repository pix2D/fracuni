import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { getOffer, updateOffer, deleteOffer } from "@/lib/offers";
import {
  handleApiError,
  errorResponse,
  jsonResponse,
  parseIdParam,
  parseJsonRequest,
} from "@/lib/api";
import { DOCUMENT_TYPE } from "@/lib/documents";

const LineItemSchema = z.object({
  descriptionHr: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
});

const UpdateOfferSchema = z.object({
  clientId: z.number().int().positive().nullish(),
  locationId: z.number().int().positive().nullish(),
  paymentMethodId: z.number().int().positive().nullish(),
  currency: z.string().nullish(),
  email: z.string().nullish(),
  issueDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  notesHr: z.string().nullish(),
  notesEn: z.string().nullish(),
  lineItems: z.array(LineItemSchema).optional(),
});

async function loadOfferOr404(id: number): Promise<Response | null> {
  const offer = await getOffer(id);
  if (!offer || offer.type !== DOCUMENT_TYPE.OFFER) return errorResponse("Not found", 404);
  return null;
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const offer = await getOffer(id);
    if (!offer || offer.type !== DOCUMENT_TYPE.OFFER) {
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
