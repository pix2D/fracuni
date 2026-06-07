import type { APIRoute } from "astro";
import { createCompany, listCompanies } from "@/lib/companies";

export const GET: APIRoute = async () => {
  const companies = await listCompanies();
  return new Response(JSON.stringify(companies), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const company = await createCompany(body);
  return new Response(JSON.stringify(company), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
