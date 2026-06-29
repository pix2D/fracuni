import { z } from "zod/v4";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);
const optionalText = z.string().trim().nullish();
const positiveInteger = (label: string) => z.number().int(`${label} must be a whole number`).positive(`${label} must be greater than 0`);

export const CompanyFieldsSchema = z.object({
  name: requiredText("Company name"),
  address: requiredText("Address"),
  phone: requiredText("Phone"),
  oib: z.string().trim().regex(/^\d{11}$/, "OIB must be exactly 11 digits"),
  logoPath: optionalText,
  taglineHr: optionalText,
  taglineEn: optionalText,
  iban: requiredText("IBAN"),
  swift: requiredText("SWIFT/BIC"),
  legalTextDomestic: optionalText,
  legalTextForeignHr: optionalText,
  legalTextForeignEn: optionalText,
  emailFromAddress: requiredText("From address").pipe(z.email("From address must be a valid email")),
  emailFromName: requiredText("From name"),
  emailSubjectTemplate: optionalText,
  emailBodyTemplate: optionalText,
  defaultPaymentTermsDays: positiveInteger("Default payment terms"),
  issuerName: requiredText("Issuer name"),
});

export const CompanyNumberedSettingSchema = z.object({
  number: positiveInteger("Number"),
  nameHr: requiredText("Name (HR)"),
  nameEn: optionalText,
  isDefault: z.boolean().optional(),
});

export const CreateCompanySchema = CompanyFieldsSchema;

export const UpdateCompanySchema = CompanyFieldsSchema.partial();

export type CompanyFieldsInput = z.infer<typeof CompanyFieldsSchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
export type CompanyNumberedSettingInput = z.infer<typeof CompanyNumberedSettingSchema>;
