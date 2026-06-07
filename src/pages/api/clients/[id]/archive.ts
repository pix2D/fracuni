import type { APIRoute } from "astro";
import { archiveClient } from "@/lib/clients";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "client");
    const client = await archiveClient(id);
    return jsonResponse(client);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
