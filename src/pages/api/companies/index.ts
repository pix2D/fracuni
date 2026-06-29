import type { APIRoute } from "astro";
import { createCompany, getCompany, listCompaniesWithRelations } from "@/lib/companies";
import { notFound } from "@/lib/app-errors";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateCompanySchema } from "@/lib/companies.schema";

export const GET: APIRoute = async () => {
  const companies = await listCompaniesWithRelations();
  return jsonResponse(companies);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateCompanySchema);
    const created = await createCompany(body);
    const company = await getCompany(created.id);
    if (!company) throw notFound("Company not found");
    return jsonResponse(company, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
