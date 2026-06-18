import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { getInvoice, updateInvoice, deleteInvoice } from "@/lib/invoices";
import { notFound } from "@/lib/app-errors";
import {
  handleApiError,
  errorResponse,
  jsonResponse,
  parseIdParam,
  parseJsonRequest,
} from "@/lib/api";

const LineItemSchema = z.object({
  descriptionHr: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
});

const UpdateInvoiceSchema = z.object({
  clientId: z.number().int().positive().nullish(),
  locationId: z.number().int().positive().nullish(),
  paymentMethodId: z.number().int().positive().nullish(),
  currency: z.string().nullish(),
  email: z.string().nullish(),
  issueDate: z.string().nullish(),
  deliveryDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  notesHr: z.string().nullish(),
  notesEn: z.string().nullish(),
  lineItems: z.array(LineItemSchema).optional(),
});

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const invoice = await getInvoice(id);
    if (!invoice) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(invoice);
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const body = await parseJsonRequest(request, UpdateInvoiceSchema);

    const existing = await getInvoice(id);
    if (!existing) throw notFound("Invoice not found");

    return jsonResponse(await updateInvoice(id, body));
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    await deleteInvoice(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
