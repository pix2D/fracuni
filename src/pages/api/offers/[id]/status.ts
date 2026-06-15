import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { transitionOfferStatus } from "@/lib/document-engine";
import { OFFER_STATUS } from "@/lib/documents";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

// Manual lifecycle moves only: Finalized → Accepted / Rejected and the
// Rejected → Finalized "un-reject". Finalization has its own endpoint.
const StatusSchema = z.object({
  status: z.enum([OFFER_STATUS.FINALIZED, OFFER_STATUS.ACCEPTED, OFFER_STATUS.REJECTED]),
});

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const { status } = await parseJsonRequest(request, StatusSchema);
    const offer = await transitionOfferStatus(id, status);
    return jsonResponse(offer);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
