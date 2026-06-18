import type { APIRoute } from "astro";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { UpdateCompanySchema } from "@/lib/companies.schema";

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "company");
    const company = await getCompany(id);
    if (!company) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(company);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "company");
    const body = await parseJsonRequest(request, UpdateCompanySchema);
    const company = await updateCompany(id, body);
    return jsonResponse(company);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "company");
    await deleteCompany(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
