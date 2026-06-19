import type { APIRoute } from "astro";
import { createClient, listClients } from "@/lib/clients";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { CreateClientSchema } from "@/lib/clients.schema";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const archived = url.searchParams.get("archived") === "true";

  const clients = await listClients({ search, archived });
  return jsonResponse(clients);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateClientSchema);
    const client = await createClient(body);
    return jsonResponse(client, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
