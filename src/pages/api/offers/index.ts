import type { APIRoute } from "astro";
import { createOffer, listOffers } from "@/lib/offers";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateOfferSchema } from "@/lib/offers.schema";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  let companyId: number | undefined;
  const rawCompanyId = url.searchParams.get("companyId");
  if (rawCompanyId !== null) {
    const parsed = Number(rawCompanyId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return errorResponse("Invalid companyId", 400);
    }
    companyId = parsed;
  }

  const offers = await listOffers(companyId);
  return jsonResponse(offers);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateOfferSchema);
    const offer = await createOffer(body);
    return jsonResponse(offer, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
