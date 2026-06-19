import type { APIRoute } from "astro";
import { getClient, updateClient, deleteClient } from "@/lib/clients";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { UpdateClientSchema } from "@/lib/clients.schema";

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "client");
    const client = await getClient(id);
    if (!client) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(client);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "client");
    const body = await parseJsonRequest(request, UpdateClientSchema);
    const client = await updateClient(id, body);
    return jsonResponse(client);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "client");
    await deleteClient(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
