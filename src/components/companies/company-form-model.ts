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
  legalTextServiceDomesticHr: "",
  legalTextServiceEuB2cHr: "",
  legalTextServiceEuB2cEn: "",
  legalTextServiceEuB2bReverseChargeHr: "",
  legalTextServiceEuB2bReverseChargeEn: "",
  legalTextServiceEuB2bWithoutVatIdHr: "",
  legalTextServiceEuB2bWithoutVatIdEn: "",
  legalTextServiceNonEuB2cHr: "",
  legalTextServiceNonEuB2cEn: "",
  legalTextServiceNonEuB2bHr: "",
  legalTextServiceNonEuB2bEn: "",
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
  legalTextServiceDomesticHr: "legalTextServiceDomesticHr",
  legalTextServiceEuB2cHr: "legalTextServiceEuB2cHr",
  legalTextServiceEuB2cEn: "legalTextServiceEuB2cEn",
  legalTextServiceEuB2bReverseChargeHr: "legalTextServiceEuB2bReverseChargeHr",
  legalTextServiceEuB2bReverseChargeEn: "legalTextServiceEuB2bReverseChargeEn",
  legalTextServiceEuB2bWithoutVatIdHr: "legalTextServiceEuB2bWithoutVatIdHr",
  legalTextServiceEuB2bWithoutVatIdEn: "legalTextServiceEuB2bWithoutVatIdEn",
  legalTextServiceNonEuB2cHr: "legalTextServiceNonEuB2cHr",
  legalTextServiceNonEuB2cEn: "legalTextServiceNonEuB2cEn",
  legalTextServiceNonEuB2bHr: "legalTextServiceNonEuB2bHr",
  legalTextServiceNonEuB2bEn: "legalTextServiceNonEuB2bEn",
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
    legalTextServiceDomesticHr: company.legalTextServiceDomesticHr ?? "",
    legalTextServiceEuB2cHr: company.legalTextServiceEuB2cHr ?? "",
    legalTextServiceEuB2cEn: company.legalTextServiceEuB2cEn ?? "",
    legalTextServiceEuB2bReverseChargeHr: company.legalTextServiceEuB2bReverseChargeHr ?? "",
    legalTextServiceEuB2bReverseChargeEn: company.legalTextServiceEuB2bReverseChargeEn ?? "",
    legalTextServiceEuB2bWithoutVatIdHr: company.legalTextServiceEuB2bWithoutVatIdHr ?? "",
    legalTextServiceEuB2bWithoutVatIdEn: company.legalTextServiceEuB2bWithoutVatIdEn ?? "",
    legalTextServiceNonEuB2cHr: company.legalTextServiceNonEuB2cHr ?? "",
    legalTextServiceNonEuB2cEn: company.legalTextServiceNonEuB2cEn ?? "",
    legalTextServiceNonEuB2bHr: company.legalTextServiceNonEuB2bHr ?? "",
    legalTextServiceNonEuB2bEn: company.legalTextServiceNonEuB2bEn ?? "",
    emailFromAddress: company.emailFromAddress,
    emailFromName: company.emailFromName,
    emailSubjectTemplate: company.emailSubjectTemplate ?? "",
    emailBodyTemplate: company.emailBodyTemplate ?? "",
    defaultPaymentTermsDays: company.defaultPaymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS,
    issuerName: company.issuerName,
  };
}
