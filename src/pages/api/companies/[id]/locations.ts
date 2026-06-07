import type { APIRoute } from "astro";
import { createLocation } from "@/lib/companies";
import { z } from "zod/v4";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

const CreateLocationSchema = z.object({
  number: z.number().int().positive(),
  nameHr: z.string().min(1),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const companyId = parseIdParam(params.id, "company");
    const body = await parseJsonRequest(request, CreateLocationSchema);
    const location = await createLocation(companyId, body);
    return jsonResponse(location, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
