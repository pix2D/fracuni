import type { APIRoute } from "astro";
import { createCatalogEntry, listCatalogEntries } from "@/lib/service-catalog";
import { z } from "zod/v4";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";

const CreateCatalogEntrySchema = z.object({
  descriptionHr: z.string().min(1),
  descriptionEn: z.string().nullish(),
});

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;

  const entries = await listCatalogEntries({ search });
  return jsonResponse(entries);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateCatalogEntrySchema);
    const entry = await createCatalogEntry(body);
    return jsonResponse(entry, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
