import { z } from "zod/v4";

const optionalText = z.string().trim().nullish();
const optionalDate = optionalText.refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Date must use YYYY-MM-DD",
);
const optionalFiniteNumber = z.number().refine(Number.isFinite, "Must be a valid number").nullish();
const positiveId = (label: string) => z.number().int(`${label} must be a whole number`).positive(`${label} is required`);

export const OfferLineItemSchema = z.object({
  descriptionHr: optionalText,
  descriptionEn: optionalText,
  quantity: optionalFiniteNumber,
  unitPrice: optionalFiniteNumber,
});

export const CreateOfferSchema = z.object({
  clientId: positiveId("Client").nullish(),
  locationId: positiveId("Location").nullish(),
  paymentMethodId: positiveId("Payment Method").nullish(),
  currency: optionalText,
  email: optionalText.refine((value) => !value || z.email().safeParse(value).success, "Email must be a valid email"),
  issueDate: optionalDate,
  dueDate: optionalDate,
  notesHr: optionalText,
  notesEn: optionalText,
  lineItems: z.array(OfferLineItemSchema).optional(),
});

export const UpdateOfferSchema = CreateOfferSchema.partial();

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
export type OfferLineItemInput = z.infer<typeof OfferLineItemSchema>;
