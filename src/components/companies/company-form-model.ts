import { DEFAULT_PAYMENT_TERMS_DAYS } from "@/lib/defaults";
import {
  CompanyFieldsSchema,
  type CompanyFieldsInput,
} from "@/lib/companies.schema";
import type { CompanyWithRelations } from "@/lib/companies";

export type CompanyDetailFieldsInput = Omit<CompanyFieldsInput, "logoPath">;

export const companyFieldValidators = {
  name: { onSubmit: CompanyFieldsSchema.shape.name },
  address: { onSubmit: CompanyFieldsSchema.shape.address },
  phone: { onSubmit: CompanyFieldsSchema.shape.phone },
  oib: { onSubmit: CompanyFieldsSchema.shape.oib },
  iban: { onSubmit: CompanyFieldsSchema.shape.iban },
  swift: { onSubmit: CompanyFieldsSchema.shape.swift },
  emailFromAddress: { onSubmit: CompanyFieldsSchema.shape.emailFromAddress },
  emailFromName: { onSubmit: CompanyFieldsSchema.shape.emailFromName },
  defaultPaymentTermsDays: { onSubmit: CompanyFieldsSchema.shape.defaultPaymentTermsDays },
  issuerName: { onSubmit: CompanyFieldsSchema.shape.issuerName },
};

export const companyDetailDefaults: CompanyDetailFieldsInput = {
  name: "",
  address: "",
  phone: "",
  oib: "",
  taglineHr: "",
  taglineEn: "",
  iban: "",
  swift: "",
  legalTextDomestic: "",
  legalTextForeignHr: "",
  legalTextForeignEn: "",
  emailFromAddress: "",
  emailFromName: "",
  emailSubjectTemplate: "",
  emailBodyTemplate: "",
  defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
  issuerName: "",
};

export const createCompanyDefaults: CompanyFieldsInput = {
  ...companyDetailDefaults,
  logoPath: null,
};

export const companyDetailFields = {
  name: "name",
  address: "address",
  phone: "phone",
  oib: "oib",
  taglineHr: "taglineHr",
  taglineEn: "taglineEn",
  iban: "iban",
  swift: "swift",
  legalTextDomestic: "legalTextDomestic",
  legalTextForeignHr: "legalTextForeignHr",
  legalTextForeignEn: "legalTextForeignEn",
  emailFromAddress: "emailFromAddress",
  emailFromName: "emailFromName",
  emailSubjectTemplate: "emailSubjectTemplate",
  emailBodyTemplate: "emailBodyTemplate",
  defaultPaymentTermsDays: "defaultPaymentTermsDays",
  issuerName: "issuerName",
} satisfies { [K in keyof CompanyDetailFieldsInput]-?: K };

export function companyDefaults(company: CompanyWithRelations): CompanyFieldsInput {
  return {
    name: company.name,
    address: company.address,
    phone: company.phone,
    oib: company.oib,
    logoPath: company.logoPath,
    taglineHr: company.taglineHr ?? "",
    taglineEn: company.taglineEn ?? "",
    iban: company.iban,
    swift: company.swift,
    legalTextDomestic: company.legalTextDomestic ?? "",
    legalTextForeignHr: company.legalTextForeignHr ?? "",
    legalTextForeignEn: company.legalTextForeignEn ?? "",
    emailFromAddress: company.emailFromAddress,
    emailFromName: company.emailFromName,
    emailSubjectTemplate: company.emailSubjectTemplate ?? "",
    emailBodyTemplate: company.emailBodyTemplate ?? "",
    defaultPaymentTermsDays: company.defaultPaymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS,
    issuerName: company.issuerName,
  };
}
