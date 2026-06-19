import { z } from "zod/v4";
import { isCurrencyCode } from "@/lib/currency";

const positiveInteger = (label: string) =>
  z.number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .positive(`${label} must be greater than 0`);

const SupportedCurrencySchema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(isCurrencyCode, "Currency must be supported by the currency engine");

export const SettingsFieldsSchema = z.object({
  defaultVatRate: z.number({ error: "Default VAT rate is required" })
    .min(0, "Default VAT rate cannot be negative")
    .max(100, "Default VAT rate cannot be greater than 100"),
  supportedCurrencies: z.array(SupportedCurrencySchema)
    .min(1, "Add at least one supported currency")
    .superRefine((currencies, ctx) => {
      const seen = new Set<string>();
      currencies.forEach((currency, index) => {
        if (seen.has(currency)) {
          ctx.addIssue({
            code: "custom",
            message: "Supported currencies must be unique",
            path: [index],
          });
        }
        seen.add(currency);
      });
    }),
  defaultPaymentTermsDays: positiveInteger("Default payment terms"),
  defaultOfferValidityDays: positiveInteger("Default offer validity"),
  postmarkApiKey: z.string().trim().nullish(),
});

export const UpdateSettingsSchema = SettingsFieldsSchema.partial();

export type SettingsFieldsInput = z.input<typeof SettingsFieldsSchema>;
export type SettingsFieldsOutput = z.output<typeof SettingsFieldsSchema>;
export type UpdateSettingsInput = z.output<typeof UpdateSettingsSchema>;
