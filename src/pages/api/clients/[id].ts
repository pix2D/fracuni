import type { APIRoute } from "astro";
import { getClient, updateClient, deleteClient } from "@/lib/clients";
import { z } from "zod/v4";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";

const TaxIdSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const UpdateClientSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  address: z.string().nullish(),
  oib: z.string().nullish(),
  vatNumber: z.string().nullish(),
  defaultCurrency: z.string().nullish(),
  defaultPaymentTermsDays: z.number().int().positive().nullish(),
  defaultOfferValidityDays: z.number().int().positive().nullish(),
  email: z.string().nullish(),
  taxIds: z.array(TaxIdSchema).optional(),
});

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
