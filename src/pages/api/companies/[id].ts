import type { APIRoute } from "astro";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";
import { z } from "zod/v4";

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

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export const GET: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    return new Response(JSON.stringify({ error: "Invalid company ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const company = await getCompany(id);
  if (!company) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(company), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    return new Response(JSON.stringify({ error: "Invalid company ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = UpdateCompanySchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: result.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const company = await updateCompany(id, result.data);
    return new Response(JSON.stringify(company), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Company not found") {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (e.message.includes("UNIQUE constraint failed")) {
        return new Response(JSON.stringify({ error: "A company with this OIB already exists" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    throw e;
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    return new Response(JSON.stringify({ error: "Invalid company ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await deleteCompany(id);
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Cannot delete")) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  }
};
