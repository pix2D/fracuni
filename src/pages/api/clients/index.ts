import type { APIRoute } from "astro";
import { createClient, listClients } from "@/lib/clients";
import { z } from "zod/v4";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";

const TaxIdSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const CreateClientSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  address: z.string().nullish(),
  oib: z.string().nullish(),
  vatNumber: z.string().nullish(),
  defaultCurrency: z.string().nullish(),
  defaultPaymentTermsDays: z.number().int().positive().nullish(),
  email: z.string().nullish(),
  taxIds: z.array(TaxIdSchema).optional(),
});

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
