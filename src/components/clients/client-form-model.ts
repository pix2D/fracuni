import { CLIENT_TYPE } from "@/lib/client-types";
import { COUNTRIES } from "@/lib/countries";
import { CURRENCY_CODES } from "@/lib/currency";
import {
  ClientFieldsBaseSchema,
  ClientTaxIdSchema,
  type ClientFieldsInput,
} from "@/lib/clients.schema";
import type { Client } from "@/lib/clients";

export type ClientDetailFieldsInput = Omit<ClientFieldsInput, "taxIds">;
export type ClientTaxIdsInput = Pick<ClientFieldsInput, "taxIds">;

export const clientCountryOptions = COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
}));

export const clientTypeOptions = [
  { value: CLIENT_TYPE.BUSINESS, label: "Business" },
  { value: CLIENT_TYPE.PERSON, label: "Person" },
];

export const clientCurrencyOptions = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}));

export const clientFieldValidators = {
  name: { onSubmit: ClientFieldsBaseSchema.shape.name },
  clientType: { onSubmit: ClientFieldsBaseSchema.shape.clientType },
  country: { onSubmit: ClientFieldsBaseSchema.shape.country },
  address: { onSubmit: ClientFieldsBaseSchema.shape.address },
  oib: { onSubmit: ClientFieldsBaseSchema.shape.oib },
  vatNumber: { onSubmit: ClientFieldsBaseSchema.shape.vatNumber },
  defaultCurrency: { onSubmit: ClientFieldsBaseSchema.shape.defaultCurrency },
  defaultPaymentTermsDays: { onSubmit: ClientFieldsBaseSchema.shape.defaultPaymentTermsDays },
  defaultOfferValidityDays: { onSubmit: ClientFieldsBaseSchema.shape.defaultOfferValidityDays },
  email: { onSubmit: ClientFieldsBaseSchema.shape.email },
  taxIds: { onSubmit: ClientFieldsBaseSchema.shape.taxIds },
};

export const clientTaxIdFieldValidators = {
  label: { onSubmit: ClientTaxIdSchema.shape.label },
  value: { onSubmit: ClientTaxIdSchema.shape.value },
};

export const clientDetailDefaults: ClientDetailFieldsInput = {
  name: "",
  clientType: CLIENT_TYPE.BUSINESS,
  country: "",
  address: "",
  oib: "",
  vatNumber: "",
  defaultCurrency: "",
  defaultPaymentTermsDays: undefined,
  defaultOfferValidityDays: undefined,
  email: "",
};

export const clientTaxIdsDefaults: ClientTaxIdsInput = {
  taxIds: [],
};

export const clientDefaults: ClientFieldsInput = {
  ...clientDetailDefaults,
  ...clientTaxIdsDefaults,
};

export const clientDetailFields = {
  name: "name",
  clientType: "clientType",
  country: "country",
  address: "address",
  oib: "oib",
  vatNumber: "vatNumber",
  defaultCurrency: "defaultCurrency",
  defaultPaymentTermsDays: "defaultPaymentTermsDays",
  defaultOfferValidityDays: "defaultOfferValidityDays",
  email: "email",
} satisfies { [K in keyof ClientDetailFieldsInput]-?: K };

export const clientTaxIdsFields = {
  taxIds: "taxIds",
} satisfies { [K in keyof ClientTaxIdsInput]-?: K };

export function clientDefaultsFromClient(client: Client): ClientFieldsInput {
  return {
    name: client.name,
    clientType: client.clientType,
    country: client.country,
    address: client.address ?? "",
    oib: client.oib ?? "",
    vatNumber: client.vatNumber ?? "",
    defaultCurrency: client.defaultCurrency ?? "",
    defaultPaymentTermsDays: client.defaultPaymentTermsDays ?? undefined,
    defaultOfferValidityDays: client.defaultOfferValidityDays ?? undefined,
    email: client.email ?? "",
    taxIds: client.taxIds.map((taxId) => ({
      label: taxId.label,
      value: taxId.value,
    })),
  };
}
