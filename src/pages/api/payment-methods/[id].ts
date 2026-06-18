import type { APIRoute } from "astro";
import { updatePaymentMethod, deletePaymentMethod } from "@/lib/companies";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { CompanyNumberedSettingSchema } from "@/lib/companies.schema";

const UpdatePaymentMethodSchema = CompanyNumberedSettingSchema.partial();

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "payment method");
    const body = await parseJsonRequest(request, UpdatePaymentMethodSchema);
    const pm = await updatePaymentMethod(id, body);
    return jsonResponse(pm);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "payment method");
    await deletePaymentMethod(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
