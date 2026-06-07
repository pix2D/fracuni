import type { APIRoute } from "astro";
import { updatePaymentMethod, deletePaymentMethod } from "@/lib/companies";

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const body = await request.json();
  const pm = await updatePaymentMethod(id, body);
  return new Response(JSON.stringify(pm), {
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  try {
    await deletePaymentMethod(id);
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 409 });
  }
};
