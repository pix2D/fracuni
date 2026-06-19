import { z } from "zod/v4";
import { COUNTRIES } from "@/lib/countries";
import { isCurrencyCode } from "@/lib/currency";

const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));
const EMAIL_SCHEMA = z.email("Email must be a valid email");

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);
const optionalText = z.string().trim().nullish();
const positiveInteger = (label: string) =>
  z.number().int(`${label} must be a whole number`).positive(`${label} must be greater than 0`).nullish();

export const ClientTaxIdSchema = z.object({
  label: requiredText("Tax ID label"),
  value: requiredText("Tax ID value"),
});

export const ClientFieldsSchema = z.object({
  name: requiredText("Client name"),
  country: requiredText("Country").refine((country) => COUNTRY_CODES.has(country), "Choose a supported country"),
  address: optionalText,
  oib: optionalText.refine((value) => !value || /^\d{11}$/.test(value), "OIB must be exactly 11 digits"),
  vatNumber: optionalText,
  defaultCurrency: optionalText.refine((value) => !value || isCurrencyCode(value), "Default currency must be supported"),
  defaultPaymentTermsDays: positiveInteger("Default payment terms"),
  defaultOfferValidityDays: positiveInteger("Default offer validity"),
  email: optionalText.refine((value) => !value || EMAIL_SCHEMA.safeParse(value).success, "Email must be a valid email"),
  taxIds: z.array(ClientTaxIdSchema).optional(),
});

export const CreateClientSchema = ClientFieldsSchema;
export const UpdateClientSchema = ClientFieldsSchema.partial();

export type ClientTaxIdInput = z.infer<typeof ClientTaxIdSchema>;
export type ClientFieldsInput = z.infer<typeof ClientFieldsSchema>;
export type ClientInput = z.infer<typeof ClientFieldsSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
