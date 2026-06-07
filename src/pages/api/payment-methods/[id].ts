import type { APIRoute } from "astro";
import { updatePaymentMethod, deletePaymentMethod } from "@/lib/companies";
import { appErrorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { z } from "zod/v4";

const UpdatePaymentMethodSchema = z.object({
  number: z.number().int().positive().optional(),
  nameHr: z.string().min(1).optional(),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseIdParam(params.id, "payment method");
  if (id instanceof Response) return id;

  const body = await parseJsonRequest(request, UpdatePaymentMethodSchema);
  if (body instanceof Response) return body;

  try {
    const pm = await updatePaymentMethod(id, body);
    return jsonResponse(pm);
  } catch (error: unknown) {
    const response = appErrorResponse(error);
    if (response) return response;
    throw error;
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseIdParam(params.id, "payment method");
  if (id instanceof Response) return id;

  try {
    await deletePaymentMethod(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const response = appErrorResponse(error);
    if (response) return response;
    throw error;
  }
};
