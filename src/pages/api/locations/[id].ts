import type { APIRoute } from "astro";
import { updateLocation, deleteLocation } from "@/lib/companies";

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  const location = await updateLocation(id, body);
  return new Response(JSON.stringify(location), {
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  try {
    await deleteLocation(id);
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 409 });
  }
};
