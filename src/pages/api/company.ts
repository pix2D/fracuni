import type { APIRoute } from "astro";
import { getCompanyProfile, upsertCompanyProfile } from "@/lib/companies";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CompanyFieldsSchema } from "@/lib/companies.schema";

export const GET: APIRoute = async () => {
  const company = await getCompanyProfile();
  if (!company) return errorResponse("Company profile not found", 404);
  return jsonResponse(company);
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CompanyFieldsSchema);
    await upsertCompanyProfile(body);
    const company = await getCompanyProfile();
    if (!company) return errorResponse("Company profile not found", 404);
    return jsonResponse(company);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
