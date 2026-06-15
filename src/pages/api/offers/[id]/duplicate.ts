import type { APIRoute } from "astro";
import { duplicateDocument } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

// Duplicate an Offer into a new Draft Offer with today's date and re-expanded
// Service Catalog placeholders. Returns the new draft.
export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "offer");
    const duplicate = await duplicateDocument(id);
    return jsonResponse(duplicate, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
