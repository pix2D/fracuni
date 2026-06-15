import type { APIRoute } from "astro";
import { getInvoice } from "@/lib/invoices";
import { listAuditEntries } from "@/lib/audit-log";
import { handleApiError, errorResponse, jsonResponse, parseIdParam } from "@/lib/api";

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const invoice = await getInvoice(id);
    if (!invoice) {
      return errorResponse("Not found", 404);
    }
    const entries = await listAuditEntries(id);
    return jsonResponse(entries);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
