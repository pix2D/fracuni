import type { APIRoute } from "astro";
import { getCompanyProfile } from "@/lib/companies";
import {
  listDocumentNumberSequences,
  setDocumentNumberNextSequence,
} from "@/lib/document-number-sequences";
import {
  DocumentNumberSequenceYearSchema,
  SetDocumentNumberSequenceSchema,
} from "@/lib/document-number-sequences.schema";
import { invalidRequest } from "@/lib/app-errors";
import { errorResponse, handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";

function parseYear(request: Request): number {
  const raw = new URL(request.url).searchParams.get("year");
  const parsed = raw === null ? undefined : Number(raw);
  const result = DocumentNumberSequenceYearSchema.safeParse(parsed);
  if (!result.success) {
    throw invalidRequest("Invalid year", { issues: result.error.issues });
  }
  return result.data;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile not found", 404);

    const year = parseYear(request);
    return jsonResponse(await listDocumentNumberSequences(year));
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile not found", 404);

    const body = await parseJsonRequest(request, SetDocumentNumberSequenceSchema);
    return jsonResponse(
      await setDocumentNumberNextSequence(
        body.year,
        body.paymentMethodId,
        body.nextSequence,
      ),
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
