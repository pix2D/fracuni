import { z } from "zod/v4";

export const DocumentNumberSequenceYearSchema = z
  .number({ error: "Year is required" })
  .int("Year must be a whole number")
  .min(2000, "Year must be 2000 or later")
  .max(9999, "Year must be a valid calendar year");

export const SetDocumentNumberSequenceSchema = z.object({
  year: DocumentNumberSequenceYearSchema,
  paymentMethodId: z
    .number({ error: "Payment Method is required" })
    .int("Payment Method must be a whole number")
    .positive("Payment Method is required"),
  nextSequence: z
    .number({ error: "Next sequence is required" })
    .int("Next sequence must be a whole number")
    .positive("Next sequence must be greater than 0"),
});

export type SetDocumentNumberSequenceInput = z.infer<typeof SetDocumentNumberSequenceSchema>;
