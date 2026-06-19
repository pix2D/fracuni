import { z } from "zod/v4";

export const SendEmailSchema = z.object({
  to: z.string()
    .trim()
    .min(1, "Recipient email is required")
    .refine((value) => z.email().safeParse(value).success, "Recipient email must be valid"),
  subject: z.string(),
  body: z.string(),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;
