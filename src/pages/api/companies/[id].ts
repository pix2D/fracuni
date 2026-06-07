import type { APIRoute } from "astro";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const company = await getCompany(id);
  if (!company) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(company), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  const company = await updateCompany(id, body);
  return new Response(JSON.stringify(company), {
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  try {
    await deleteCompany(id);
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 409 });
  }
};
