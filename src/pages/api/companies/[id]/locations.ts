import type { APIRoute } from "astro";
import { createLocation } from "@/lib/companies";

export const POST: APIRoute = async ({ params, request }) => {
  const companyId = Number(params.id);
  const body = await request.json();
  const location = await createLocation(companyId, body);
  return new Response(JSON.stringify(location), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
