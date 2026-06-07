import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { getSettings, updateSettings } from "@/lib/settings";
import { handleApiError, jsonResponse, parseJsonRequest } from "@/lib/api";

const UpdateSettingsSchema = z.object({
  defaultVatRate: z.number().min(0).max(100).optional(),
  supportedCurrencies: z.array(z.string().min(1)).min(1).optional(),
  defaultPaymentTermsDays: z.number().int().positive().optional(),
  defaultOfferValidityDays: z.number().int().positive().optional(),
  postmarkApiKey: z.string().nullish(),
});

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
