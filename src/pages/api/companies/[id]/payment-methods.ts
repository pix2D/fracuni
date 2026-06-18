import type { APIRoute } from "astro";
import { createPaymentMethod } from "@/lib/companies";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { CompanyNumberedSettingSchema } from "@/lib/companies.schema";

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const companyId = parseIdParam(params.id, "company");
    const body = await parseJsonRequest(request, CompanyNumberedSettingSchema);
    const pm = await createPaymentMethod(companyId, body);
    return jsonResponse(pm, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
