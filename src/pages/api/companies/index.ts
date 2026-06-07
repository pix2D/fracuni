import type { APIRoute } from "astro";
import { createCompany, listCompaniesWithRelations } from "@/lib/companies";
import { z } from "zod/v4";
import { appErrorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";

const CreateCompanySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  oib: z.string().regex(/^\d{11}$/, "OIB must be exactly 11 digits"),
  logoPath: z.string().nullish(),
  taglineHr: z.string().nullish(),
  taglineEn: z.string().nullish(),
  iban: z.string().min(1),
  swift: z.string().min(1),
  legalTextDomestic: z.string().nullish(),
  legalTextForeignHr: z.string().nullish(),
  legalTextForeignEn: z.string().nullish(),
  emailFromAddress: z.string().min(1),
  emailFromName: z.string().min(1),
  emailSubjectTemplate: z.string().nullish(),
  emailBodyTemplate: z.string().nullish(),
  defaultPaymentTermsDays: z.number().int().positive(),
  issuerName: z.string().min(1),
});

export const GET: APIRoute = async () => {
  const companies = await listCompaniesWithRelations();
  return jsonResponse(companies);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonRequest(request, CreateCompanySchema);
  if (body instanceof Response) return body;

  try {
    const company = await createCompany(body);
    return jsonResponse(company, { status: 201 });
  } catch (error: unknown) {
    const response = appErrorResponse(error);
    if (response) return response;
    throw error;
  }
};
