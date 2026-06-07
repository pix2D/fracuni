import type { APIRoute } from "astro";
import { createLocation } from "@/lib/companies";
import { z } from "zod/v4";

const CreateLocationSchema = z.object({
  number: z.number().int().positive(),
  nameHr: z.string().min(1),
  nameEn: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

export const POST: APIRoute = async ({ params, request }) => {
  const companyId = Number(params.id);
  if (!Number.isInteger(companyId) || companyId <= 0) {
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

  const result = CreateLocationSchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: result.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const location = await createLocation(companyId, result.data);
    return new Response(JSON.stringify(location), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return new Response(JSON.stringify({ error: "A location with this number already exists for this company" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (e instanceof Error && e.message.includes("FOREIGN KEY constraint failed")) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  }
};
