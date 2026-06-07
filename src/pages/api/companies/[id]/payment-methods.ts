import type { APIRoute } from "astro";
import { createPaymentMethod } from "@/lib/companies";

export const POST: APIRoute = async ({ params, request }) => {
  const companyId = Number(params.id);
  const body = await request.json();
  const pm = await createPaymentMethod(companyId, body);
  return new Response(JSON.stringify(pm), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
