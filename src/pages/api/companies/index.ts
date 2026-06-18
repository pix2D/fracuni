import type { APIRoute } from "astro";
import { createCompanyWithSetup, listCompaniesWithRelations } from "@/lib/companies";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateCompanySchema } from "@/lib/companies.schema";

export const GET: APIRoute = async () => {
  const companies = await listCompaniesWithRelations();
  return jsonResponse(companies);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateCompanySchema);
    const company = await createCompanyWithSetup(body);
    return jsonResponse(company, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
