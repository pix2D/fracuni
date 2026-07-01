import { z } from "zod/v4";
import { CLIENT_TYPE } from "@/lib/client-types";
import { COUNTRIES, isDomestic, isEuCountry } from "@/lib/countries";
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

export const ClientFieldsBaseSchema = z.object({
  name: requiredText("Client name"),
  clientType: z.enum([CLIENT_TYPE.BUSINESS, CLIENT_TYPE.PERSON], { error: "Client type is required" }),
  country: requiredText("Country").refine((country) => COUNTRY_CODES.has(country), "Choose a supported country"),
  address: optionalText,
  oib: optionalText.refine((value) => !value || /^\d{11}$/.test(value), "OIB must be exactly 11 digits"),
  vatNumber: optionalText,
  defaultCurrency: optionalText.refine((value) => !value || isCurrencyCode(value), "Default currency must be supported"),
  defaultPaymentTermsDays: positiveInteger("Default payment terms"),
  defaultOfferValidityDays: positiveInteger("Default offer validity"),
  email: optionalText.refine((value) => !value || EMAIL_SCHEMA.safeParse(value).success, "Email must be a valid email"),
  emailFromAddress: optionalText.refine(
    (value) => !value || EMAIL_SCHEMA.safeParse(value).success,
    "From address must be a valid email",
  ),
  emailFromName: optionalText,
  emailSubjectTemplate: optionalText,
  emailBodyTemplate: optionalText,
  taxIds: z.array(ClientTaxIdSchema).optional(),
});

export const ClientFieldsSchema = ClientFieldsBaseSchema.superRefine((value, ctx) => {
  if (value.clientType === CLIENT_TYPE.BUSINESS && isDomestic(value.country) && !value.oib?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "OIB is required for Croatian B2B clients",
      path: ["oib"],
    });
  }
});

export const CreateClientSchema = ClientFieldsSchema;
export const UpdateClientSchema = ClientFieldsBaseSchema.partial();

export type ClientTaxIdInput = z.infer<typeof ClientTaxIdSchema>;
export type ClientFieldsInput = z.infer<typeof ClientFieldsSchema>;
export type ClientInput = z.infer<typeof ClientFieldsSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function normalizeClientInput(input: ClientInput): ClientInput {
  const business = input.clientType === CLIENT_TYPE.BUSINESS;
  const domestic = isDomestic(input.country);
  const eu = isEuCountry(input.country);

  return {
    ...input,
    address: blankToNull(input.address),
    oib: business && domestic ? blankToNull(input.oib) : null,
    vatNumber: business && eu && !domestic ? blankToNull(input.vatNumber) : null,
    defaultCurrency: blankToNull(input.defaultCurrency)?.toUpperCase() ?? null,
    email: blankToNull(input.email),
    emailFromAddress: blankToNull(input.emailFromAddress),
    emailFromName: blankToNull(input.emailFromName),
    emailSubjectTemplate: blankToNull(input.emailSubjectTemplate),
    emailBodyTemplate: blankToNull(input.emailBodyTemplate),
    taxIds: input.taxIds?.filter((taxId) => taxId.label.trim() || taxId.value.trim()),
  };
}

export function normalizeClientPatch(input: Partial<ClientInput>): Partial<ClientInput> {
  const next: Partial<ClientInput> = {
    ...input,
    address: input.address !== undefined ? blankToNull(input.address) : undefined,
    oib: input.oib !== undefined ? blankToNull(input.oib) : undefined,
    vatNumber: input.vatNumber !== undefined ? blankToNull(input.vatNumber) : undefined,
    defaultCurrency: input.defaultCurrency !== undefined ? blankToNull(input.defaultCurrency)?.toUpperCase() ?? null : undefined,
    email: input.email !== undefined ? blankToNull(input.email) : undefined,
    emailFromAddress: input.emailFromAddress !== undefined ? blankToNull(input.emailFromAddress) : undefined,
    emailFromName: input.emailFromName !== undefined ? blankToNull(input.emailFromName) : undefined,
    emailSubjectTemplate: input.emailSubjectTemplate !== undefined ? blankToNull(input.emailSubjectTemplate) : undefined,
    emailBodyTemplate: input.emailBodyTemplate !== undefined ? blankToNull(input.emailBodyTemplate) : undefined,
    taxIds: input.taxIds?.filter((taxId) => taxId.label.trim() || taxId.value.trim()),
  };

  if (next.clientType && next.country) {
    const business = next.clientType === CLIENT_TYPE.BUSINESS;
    const domestic = isDomestic(next.country);
    const eu = isEuCountry(next.country);
    if (!business || !domestic) next.oib = null;
    if (!business || !eu || domestic) next.vatNumber = null;
  }

  return next;
}
