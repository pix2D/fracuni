import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { createInvoice, listInvoices, type DocumentType } from "@/lib/invoices";
import { handleApiError, errorResponse, jsonResponse, parseJsonRequest } from "@/lib/api";

const LineItemSchema = z.object({
  descriptionHr: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
});

// Drafts are permissive: only the owning company is required, everything else is optional.
const CreateInvoiceSchema = z.object({
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
    // This slice handles type=invoice only; the discriminator is fixed here.
    const invoice = await createInvoice({ ...body, type: "invoice" });
    return jsonResponse(invoice, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
