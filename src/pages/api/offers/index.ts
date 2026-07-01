import type { APIRoute } from "astro";
import { getCompanyProfile } from "@/lib/companies";
import { createOffer, listOffers } from "@/lib/offers";
import { errorResponse, handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateOfferSchema } from "@/lib/offers.schema";

export const GET: APIRoute = async () => {
  const offers = await listOffers();
  return jsonResponse(offers);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateOfferSchema);
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile must be set up before creating documents", 409);

    const offer = await createOffer(body);
    return jsonResponse(offer, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
