import { z } from "zod/v4";
import { DOCUMENT_TYPE } from "@/lib/documents";

const optionalText = z.string().trim().nullish();
const optionalDate = optionalText.refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Date must use YYYY-MM-DD",
);
const optionalFiniteNumber = z.number().refine(Number.isFinite, "Must be a valid number").nullish();
const positiveId = (label: string) => z.number().int(`${label} must be a whole number`).positive(`${label} is required`);

export const InvoiceLineItemSchema = z.object({
  descriptionHr: optionalText,
  descriptionEn: optionalText,
  quantity: optionalFiniteNumber,
  unitPrice: optionalFiniteNumber,
});

export const CreateInvoiceSchema = z.object({
  type: z.enum([DOCUMENT_TYPE.INVOICE, DOCUMENT_TYPE.CREDIT_NOTE]).optional(),
  companyId: positiveId("Company"),
  clientId: positiveId("Client").nullish(),
  locationId: positiveId("Location").nullish(),
  paymentMethodId: positiveId("Payment Method").nullish(),
  currency: optionalText,
  email: optionalText.refine((value) => !value || z.email().safeParse(value).success, "Email must be a valid email"),
  issueDate: optionalDate,
  deliveryDate: optionalDate,
  dueDate: optionalDate,
  notesHr: optionalText,
  notesEn: optionalText,
  lineItems: z.array(InvoiceLineItemSchema).optional(),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.omit({
  type: true,
  companyId: true,
}).partial();

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof InvoiceLineItemSchema>;
