import type { APIRoute } from "astro";
import { updateLocation, deleteLocation } from "@/lib/companies";
import { appErrorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { z } from "zod/v4";

const UpdateLocationSchema = z.object({
  number: z.number().int().positive().optional(),
  nameHr: z.string().min(1).optional(),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseIdParam(params.id, "location");
  if (id instanceof Response) return id;

  const body = await parseJsonRequest(request, UpdateLocationSchema);
  if (body instanceof Response) return body;

  try {
    const location = await updateLocation(id, body);
    return jsonResponse(location);
  } catch (error: unknown) {
    const response = appErrorResponse(error);
    if (response) return response;
    throw error;
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseIdParam(params.id, "location");
  if (id instanceof Response) return id;

  try {
    await deleteLocation(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const response = appErrorResponse(error);
    if (response) return response;
    throw error;
  }
};
