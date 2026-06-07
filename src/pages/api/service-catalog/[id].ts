import type { APIRoute } from "astro";
import { getCatalogEntry, updateCatalogEntry, deleteCatalogEntry } from "@/lib/service-catalog";
import { z } from "zod/v4";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

const UpdateCatalogEntrySchema = z.object({
  descriptionHr: z.string().min(1).optional(),
  descriptionEn: z.string().nullish(),
});

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "catalog entry");
    const entry = await getCatalogEntry(id);
    if (!entry) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(entry);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "catalog entry");
    const body = await parseJsonRequest(request, UpdateCatalogEntrySchema);
    const entry = await updateCatalogEntry(id, body);
    return jsonResponse(entry);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "catalog entry");
    await deleteCatalogEntry(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
