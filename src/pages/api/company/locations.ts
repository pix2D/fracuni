import type { APIRoute } from "astro";
import { createLocation, getCompanyProfile } from "@/lib/companies";
import { errorResponse, handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CompanyNumberedSettingSchema } from "@/lib/companies.schema";

export const POST: APIRoute = async ({ request }) => {
  try {
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile not found", 404);

    const body = await parseJsonRequest(request, CompanyNumberedSettingSchema);
    const location = await createLocation(body);
    return jsonResponse(location, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
