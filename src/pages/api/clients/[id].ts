import type { APIRoute } from "astro";
import { getClient, updateClient, deleteClient } from "@/lib/clients";
import { handleApiError, errorResponse, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { invalidRequest } from "@/lib/app-errors";
import { ClientFieldsSchema, UpdateClientSchema, type ClientInput } from "@/lib/clients.schema";

function patchValue<T>(value: T | undefined, current: T): T {
  return value === undefined ? current : value;
}

function mergeClientPatch(current: NonNullable<Awaited<ReturnType<typeof getClient>>>, patch: Partial<ClientInput>): ClientInput {
  return {
    name: patchValue(patch.name, current.name),
    clientType: patchValue(patch.clientType, current.clientType),
    country: patchValue(patch.country, current.country),
    address: patchValue(patch.address, current.address),
    oib: patchValue(patch.oib, current.oib),
    vatNumber: patchValue(patch.vatNumber, current.vatNumber),
    defaultCurrency: patchValue(patch.defaultCurrency, current.defaultCurrency),
    defaultPaymentTermsDays: patchValue(patch.defaultPaymentTermsDays, current.defaultPaymentTermsDays),
    defaultOfferValidityDays: patchValue(patch.defaultOfferValidityDays, current.defaultOfferValidityDays),
    email: patchValue(patch.email, current.email),
    taxIds: patch.taxIds ?? current.taxIds.map((taxId) => ({ label: taxId.label, value: taxId.value })),
  };
}

function validateMergedClient(input: ClientInput): ClientInput {
  const result = ClientFieldsSchema.safeParse(input);
  if (!result.success) {
    throw invalidRequest("Validation failed", { issues: result.error.issues });
  }
  return result.data;
}

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
    const current = await getClient(id);
    if (!current) {
      return errorResponse("Not found", 404);
    }
    const client = await updateClient(id, validateMergedClient(mergeClientPatch(current, body)));
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
