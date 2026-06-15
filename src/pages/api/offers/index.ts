import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { createOffer, listOffers } from "@/lib/offers";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";

const LineItemSchema = z.object({
  descriptionHr: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
});

// Drafts are permissive: only the owning company is required. On an offer the
// date fields carry offer-specific meaning (issueDate = offer date,
// dueDate = valid-until, paymentTermsDays = validity period in days).
const CreateOfferSchema = z.object({
  companyId: z.number().int().positive(),
  clientId: z.number().int().positive().nullish(),
  locationId: z.number().int().positive().nullish(),
  paymentMethodId: z.number().int().positive().nullish(),
  currency: z.string().nullish(),
  email: z.string().nullish(),
  issueDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  paymentTermsDays: z.number().int().nullish(),
  notesHr: z.string().nullish(),
  notesEn: z.string().nullish(),
  lineItems: z.array(LineItemSchema).optional(),
});

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
