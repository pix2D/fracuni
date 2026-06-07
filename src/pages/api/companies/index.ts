import type { APIRoute } from "astro";
import { createCompany, listCompanies } from "@/lib/companies";
import { z } from "zod/v4";

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
  const companies = await listCompanies();
  return new Response(JSON.stringify(companies), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = CreateCompanySchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: result.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const company = await createCompany(result.data);
    return new Response(JSON.stringify(company), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return new Response(JSON.stringify({ error: "A company with this OIB already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  }
};
