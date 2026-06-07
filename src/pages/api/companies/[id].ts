import type { APIRoute } from "astro";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";
import { z } from "zod/v4";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  oib: z.string().regex(/^\d{11}$/, "OIB must be exactly 11 digits").optional(),
  logoPath: z.string().nullish(),
  taglineHr: z.string().nullish(),
  taglineEn: z.string().nullish(),
  iban: z.string().min(1).optional(),
  swift: z.string().min(1).optional(),
  legalTextDomestic: z.string().nullish(),
  legalTextForeignHr: z.string().nullish(),
  legalTextForeignEn: z.string().nullish(),
  emailFromAddress: z.string().min(1).optional(),
  emailFromName: z.string().min(1).optional(),
  emailSubjectTemplate: z.string().nullish(),
  emailBodyTemplate: z.string().nullish(),
  defaultPaymentTermsDays: z.number().int().positive().optional(),
  issuerName: z.string().min(1).optional(),
});

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
