import { COUNTRIES } from "@/lib/countries";
import {
  ClientFieldsSchema,
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

export const clientFieldValidators = {
  name: { onSubmit: ClientFieldsSchema.shape.name },
  country: { onSubmit: ClientFieldsSchema.shape.country },
  address: { onSubmit: ClientFieldsSchema.shape.address },
  oib: { onSubmit: ClientFieldsSchema.shape.oib },
  vatNumber: { onSubmit: ClientFieldsSchema.shape.vatNumber },
  defaultCurrency: { onSubmit: ClientFieldsSchema.shape.defaultCurrency },
  defaultPaymentTermsDays: { onSubmit: ClientFieldsSchema.shape.defaultPaymentTermsDays },
  defaultOfferValidityDays: { onSubmit: ClientFieldsSchema.shape.defaultOfferValidityDays },
  email: { onSubmit: ClientFieldsSchema.shape.email },
  taxIds: { onSubmit: ClientFieldsSchema.shape.taxIds },
};

export const clientTaxIdFieldValidators = {
  label: { onSubmit: ClientTaxIdSchema.shape.label },
  value: { onSubmit: ClientTaxIdSchema.shape.value },
};

export const clientDetailDefaults: ClientDetailFieldsInput = {
  name: "",
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
