import type { APIRoute } from "astro";
import {
  listDocumentNumberSequences,
  setDocumentNumberNextSequence,
} from "@/lib/document-number-sequences";
import {
  DocumentNumberSequenceYearSchema,
  SetDocumentNumberSequenceSchema,
} from "@/lib/document-number-sequences.schema";
import { invalidRequest } from "@/lib/app-errors";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

function parseYear(request: Request): number {
  const raw = new URL(request.url).searchParams.get("year");
  const parsed = raw === null ? undefined : Number(raw);
  const result = DocumentNumberSequenceYearSchema.safeParse(parsed);
  if (!result.success) {
    throw invalidRequest("Invalid year", { issues: result.error.issues });
  }
  return result.data;
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const companyId = parseIdParam(params.id, "company");
    const year = parseYear(request);
    return jsonResponse(await listDocumentNumberSequences(companyId, year));
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const companyId = parseIdParam(params.id, "company");
    const body = await parseJsonRequest(request, SetDocumentNumberSequenceSchema);
    return jsonResponse(
      await setDocumentNumberNextSequence(
        companyId,
        body.year,
        body.paymentMethodId,
        body.nextSequence,
      ),
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
