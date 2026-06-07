import type { APIRoute } from "astro";
import { createPaymentMethod } from "@/lib/companies";
import { z } from "zod/v4";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

const CreatePaymentMethodSchema = z.object({
  number: z.number().int().positive(),
  nameHr: z.string().min(1),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const companyId = parseIdParam(params.id, "company");
    const body = await parseJsonRequest(request, CreatePaymentMethodSchema);
    const pm = await createPaymentMethod(companyId, body);
    return jsonResponse(pm, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
