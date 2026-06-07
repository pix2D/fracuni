import type { APIRoute } from "astro";
import { updateLocation, deleteLocation } from "@/lib/companies";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { z } from "zod/v4";

const UpdateLocationSchema = z.object({
  number: z.number().int().positive().optional(),
  nameHr: z.string().min(1).optional(),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "location");
    const body = await parseJsonRequest(request, UpdateLocationSchema);
    const location = await updateLocation(id, body);
    return jsonResponse(location);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "location");
    await deleteLocation(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
