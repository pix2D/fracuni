import type { APIRoute } from "astro";
import { getSettings, updateSettings } from "@/lib/settings";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";
import { UpdateSettingsSchema } from "@/lib/settings.schema";

export const GET: APIRoute = async () => {
  const settings = await getSettings();
  return jsonResponse(settings);
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, UpdateSettingsSchema);
    const settings = await updateSettings(body);
    return jsonResponse(settings);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
