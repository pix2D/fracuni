import type { APIRoute } from "astro";
import { buildEmailDefaults, listEmailLogs, sendInvoiceEmail } from "@/lib/email";
import { handleApiError, jsonResponse, parseIdParam, parseJsonRequest } from "@/lib/api";
import { SendEmailSchema } from "@/lib/email.schema";

// Returns the pre-filled send-dialog defaults plus the document's send history.
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const [defaults, logs] = await Promise.all([buildEmailDefaults(id), listEmailLogs(id)]);
    return jsonResponse({ ...defaults, logs });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const body = await parseJsonRequest(request, SendEmailSchema);
    const result = await sendInvoiceEmail(id, body);
    return jsonResponse(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
