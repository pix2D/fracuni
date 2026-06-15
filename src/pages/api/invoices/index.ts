import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { createInvoice, listInvoices } from "@/lib/invoices";
import { DOCUMENT_TYPE, type DocumentType } from "@/lib/documents";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";

const LineItemSchema = z.object({
  descriptionHr: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
});

// Drafts are permissive: only the owning company is required, everything else is optional.
// `type` lets the same endpoint create a from-scratch Invoice or Credit Note;
// Credit Notes created from an Invoice go through the dedicated [id]/credit-note route.
const CreateInvoiceSchema = z.object({
  type: z.enum([DOCUMENT_TYPE.INVOICE, DOCUMENT_TYPE.CREDIT_NOTE]).optional(),
  companyId: z.number().int().positive(),
  clientId: z.number().int().positive().nullish(),
  locationId: z.number().int().positive().nullish(),
  paymentMethodId: z.number().int().positive().nullish(),
  currency: z.string().nullish(),
  email: z.string().nullish(),
  issueDate: z.string().nullish(),
  deliveryDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  paymentTermsDays: z.number().int().nullish(),
  notesHr: z.string().nullish(),
  notesEn: z.string().nullish(),
  lineItems: z.array(LineItemSchema).optional(),
});

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  let companyId: number | undefined;
  const rawCompanyId = url.searchParams.get("companyId");
  if (rawCompanyId !== null) {
    const parsed = Number(rawCompanyId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return errorResponse("Invalid companyId", 400);
    }
    companyId = parsed;
  }

  const type = (url.searchParams.get("type") as DocumentType | null) ?? undefined;

  const invoices = await listInvoices({ companyId, type });
  return jsonResponse(invoices);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonRequest(request, CreateInvoiceSchema);
    const invoice = await createInvoice({ ...body, type: body.type ?? DOCUMENT_TYPE.INVOICE });
    return jsonResponse(invoice, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
