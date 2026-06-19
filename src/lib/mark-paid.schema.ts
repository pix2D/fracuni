import { z } from "zod/v4";

// YYYY-MM-DD, matching how dates are stored elsewhere on the invoice.
export const MarkPaidSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)"),
});

export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;
