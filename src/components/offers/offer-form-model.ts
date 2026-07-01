import type { LineItemRow } from "@/components/LineItemsEditor";
import { isDomestic } from "@/lib/countries";
import { isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { decideServiceVat, type ServiceVatDecision } from "@/lib/tax-engine";
import { computeInvoiceTotals, type InvoiceTotals } from "@/lib/invoice-totals";
import { parseDecimalInput } from "@/lib/decimal-input";
import {
  addDaysToDate,
  dateToStr,
  daysBetween,
  defaultDocumentCurrency,
  documentClientOptions,
  documentCurrencyOptions,
  documentLineItemFields,
  documentLineItemsDefaults,
  documentLocationOptions,
  documentNoteFields,
  documentNotesDefaults,
  documentPaymentMethodOptions,
  isSupportedCurrency,
  lineItemHasPayload,
  parseFormId,
  strToDate,
  validateDocumentLineItems,
  type DocumentLineItemsInput,
  type DocumentNotesInput,
  type DocumentSubmitIntent,
} from "@/components/documents/document-form-model";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Offer, OfferInput } from "@/lib/offers";
import type { Settings } from "@/lib/settings";

export type OfferSubmitIntent = DocumentSubmitIntent;

export interface OfferFormValues {
  clientId: string;
  locationId: string;
  paymentMethodId: string;
  currency: string;
  email: string;
  offerDate: Date | undefined;
  validUntil: Date | undefined;
  validityDays: number | undefined;
  notesHr: string;
  notesEn: string;
  lineItems: LineItemRow[];
  validUntilManual: boolean;
}

export type OfferDateFieldsInput = Pick<
  OfferFormValues,
  "offerDate" | "validUntil" | "validityDays" | "validUntilManual"
>;
export type OfferLineItemsInput = DocumentLineItemsInput;
export type OfferNotesInput = DocumentNotesInput;

export const offerDateDefaults: OfferDateFieldsInput = {
  offerDate: undefined,
  validUntil: undefined,
  validityDays: undefined,
  validUntilManual: false,
};

export const offerLineItemsDefaults: OfferLineItemsInput = documentLineItemsDefaults;
export const offerNotesDefaults: OfferNotesInput = documentNotesDefaults;

export const offerFormDefaults: OfferFormValues = {
  clientId: "",
  locationId: "",
  paymentMethodId: "",
  currency: "",
  email: "",
  ...offerDateDefaults,
  ...offerLineItemsDefaults,
  ...offerNotesDefaults,
};

export const offerFormFields = {
  clientId: "clientId",
  locationId: "locationId",
  paymentMethodId: "paymentMethodId",
  currency: "currency",
  email: "email",
  offerDate: "offerDate",
  validUntil: "validUntil",
  validityDays: "validityDays",
  notesHr: "notesHr",
  notesEn: "notesEn",
  lineItems: "lineItems",
  validUntilManual: "validUntilManual",
} satisfies { [K in keyof OfferFormValues]-?: K };

export const offerDateFields = {
  offerDate: "offerDate",
  validUntil: "validUntil",
  validityDays: "validityDays",
  validUntilManual: "validUntilManual",
} satisfies { [K in keyof OfferDateFieldsInput]-?: K };

export const offerLineItemFields = documentLineItemFields;
export const offerNoteFields = documentNoteFields;

export function resolveOfferValidity(settings: Settings, client?: Client): number {
  return client?.defaultOfferValidityDays ?? settings.defaultOfferValidityDays;
}

export function defaultOfferCurrency(settings: Settings, client?: Client): string {
  return defaultDocumentCurrency(settings, client);
}

export function clientOptions(clients: Client[]) {
  return documentClientOptions(clients);
}

export function locationOptions(company: CompanyWithRelations) {
  return documentLocationOptions(company);
}

export function paymentMethodOptions(company: CompanyWithRelations) {
  return documentPaymentMethodOptions(company);
}

export function currencyOptions(settings: Settings) {
  return documentCurrencyOptions(settings);
}

export function selectedOfferClient(values: OfferFormValues, clients: Client[]): Client | undefined {
  const clientId = parseId(values.clientId);
  return clientId ? clients.find((client) => client.id === clientId) : undefined;
}

export function isDomesticOffer(values: OfferFormValues, clients: Client[]): boolean {
  const client = selectedOfferClient(values, clients);
  return client ? isDomestic(client.country) : true;
}

export function offerVatDecision(values: OfferFormValues, clients: Client[]): ServiceVatDecision | null {
  const client = selectedOfferClient(values, clients);
  if (!client) return null;
  return decideServiceVat({
    clientType: client.clientType,
    clientCountry: client.country,
    clientVatNumber: client.vatNumber,
  });
}

export function offerCurrencyCode(values: OfferFormValues): CurrencyCode | null {
  return isCurrencyCode(values.currency) ? values.currency : null;
}

export function offerTotals(
  values: OfferFormValues,
  clients: Client[],
  settings: Settings,
): InvoiceTotals | null {
  const currencyCode = offerCurrencyCode(values);
  if (!currencyCode) return null;

  const decision = offerVatDecision(values, clients);
  const chargeVat = decision?.chargesVat ?? false;
  const items = values.lineItems.map((item) => ({
    quantity: parseDecimalInput(item.quantity) ?? 0,
    unitPrice: parseDecimalInput(item.unitPrice) ?? 0,
  }));

  return computeInvoiceTotals(items, currencyCode, {
    chargeVat,
    vatRate: settings.defaultVatRate,
  });
}

export function offerDefaults({
  company,
  clients,
  settings,
  offer,
}: {
  company: CompanyWithRelations;
  clients: Client[];
  settings: Settings;
  offer?: Offer;
}): OfferFormValues {
  if (offer) {
    const client = clients.find((candidate) => candidate.id === offer.clientId);
    const offerDate = strToDate(offer.issueDate);
    const validUntil = strToDate(offer.dueDate);

    return {
      clientId: offer.clientId ? String(offer.clientId) : "",
      locationId: offer.locationId ? String(offer.locationId) : "",
      paymentMethodId: offer.paymentMethodId ? String(offer.paymentMethodId) : "",
      currency: offer.currency ?? defaultOfferCurrency(settings, client),
      email: offer.email ?? "",
      offerDate,
      validUntil,
      validityDays: daysBetween(offerDate, validUntil) ?? resolveOfferValidity(settings, client),
      notesHr: offer.notesHr ?? "",
      notesEn: offer.notesEn ?? "",
      lineItems:
        offer.lineItems.length > 0
          ? offer.lineItems.map((lineItem) => ({
              descriptionHr: lineItem.descriptionHr ?? "",
              descriptionEn: lineItem.descriptionEn ?? "",
              quantity: lineItem.quantity != null ? String(lineItem.quantity) : "",
              unitPrice: lineItem.unitPrice != null ? String(lineItem.unitPrice) : "",
            }))
          : documentLineItemsDefaults.lineItems.map((lineItem) => ({ ...lineItem })),
      validUntilManual: true,
    };
  }

  const today = new Date();
  const validity = resolveOfferValidity(settings);
  const defaultLocation = company.locations.find((location) => location.isDefault) ?? company.locations[0];
  const defaultPaymentMethod =
    company.paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ?? company.paymentMethods[0];

  return {
    clientId: "",
    locationId: defaultLocation ? String(defaultLocation.id) : "",
    paymentMethodId: defaultPaymentMethod ? String(defaultPaymentMethod.id) : "",
    currency: defaultOfferCurrency(settings),
    email: "",
    offerDate: today,
    validUntil: addValidityToDate(today, validity),
    validityDays: validity,
    notesHr: "",
    notesEn: "",
    lineItems: documentLineItemsDefaults.lineItems.map((lineItem) => ({ ...lineItem })),
    validUntilManual: false,
  };
}

export function offerPayloadFromValues(
  values: OfferFormValues,
  domestic: boolean,
): OfferInput {
  return {
    clientId: parseId(values.clientId),
    locationId: parseId(values.locationId),
    paymentMethodId: parseId(values.paymentMethodId),
    currency: values.currency.trim() || null,
    email: values.email.trim() || null,
    issueDate: dateToStr(values.offerDate),
    dueDate: dateToStr(values.validUntil),
    notesHr: values.notesHr.trim() || null,
    notesEn: domestic ? null : values.notesEn.trim() || null,
    lineItems: values.lineItems.filter(lineItemHasPayload).map((lineItem) => ({
      descriptionHr: lineItem.descriptionHr.trim() || null,
      descriptionEn: domestic ? null : lineItem.descriptionEn.trim() || null,
      quantity: parseDecimalInput(lineItem.quantity),
      unitPrice: parseDecimalInput(lineItem.unitPrice),
    })),
  };
}

export function validateOfferForm(
  values: OfferFormValues,
  intent: OfferSubmitIntent,
  context: {
    company: CompanyWithRelations;
    clients: Client[];
    settings: Settings;
  },
) {
  const fields: Partial<Record<keyof OfferFormValues, string>> = {};

  validateEnteredIds(values, context, fields);
  validateOptionalFields(values, context.settings, fields);
  validateLineItems(values, intent, fields);

  if (intent === "finalize") {
    if (!values.clientId) fields.clientId = "Client is required before finalization.";
    if (!values.locationId) fields.locationId = "Location is required before finalization.";
    if (!values.paymentMethodId) fields.paymentMethodId = "Payment method is required before finalization.";
    if (!values.currency) fields.currency = "Currency is required before finalization.";
    if (!dateToStr(values.offerDate)) fields.offerDate = "Offer date is required before finalization.";
    if (!dateToStr(values.validUntil)) fields.validUntil = "Valid until date is required before finalization.";
  }

  if (Object.keys(fields).length === 0) return undefined;

  return {
    form: "Review the highlighted fields and try again.",
    fields,
  };
}

export function addValidityToDate(date: Date | undefined, validityDays: number | undefined): Date | undefined {
  return addDaysToDate(date, validityDays);
}

function parseId(value: string): number | null {
  return parseFormId(value);
}

function validateEnteredIds(
  values: OfferFormValues,
  context: { company: CompanyWithRelations; clients: Client[] },
  fields: Partial<Record<keyof OfferFormValues, string>>,
): void {
  const clientId = parseId(values.clientId);
  const locationId = parseId(values.locationId);
  const paymentMethodId = parseId(values.paymentMethodId);

  if (values.clientId && !clientId) fields.clientId = "Select a valid client.";
  if (values.locationId && !locationId) fields.locationId = "Select a valid location.";
  if (values.paymentMethodId && !paymentMethodId) fields.paymentMethodId = "Select a valid payment method.";

  if (clientId && !context.clients.some((client) => client.id === clientId)) {
    fields.clientId = "Select a valid client.";
  }
  if (locationId && !context.company.locations.some((location) => location.id === locationId)) {
    fields.locationId = "Select a valid location.";
  }
  if (paymentMethodId && !context.company.paymentMethods.some((paymentMethod) => paymentMethod.id === paymentMethodId)) {
    fields.paymentMethodId = "Select a valid payment method.";
  }
}

function validateOptionalFields(
  values: OfferFormValues,
  settings: Settings,
  fields: Partial<Record<keyof OfferFormValues, string>>,
): void {
  if (values.currency && !settings.supportedCurrencies.includes(values.currency)) {
    fields.currency = "Select a supported currency.";
  }
  if (values.currency && !isSupportedCurrency(values.currency, settings)) {
    fields.currency = "Select a currency supported by the currency engine.";
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    fields.email = "Enter a valid email address.";
  }
  if (values.validityDays != null && (!Number.isInteger(values.validityDays) || values.validityDays < 0)) {
    fields.validityDays = "Validity must be a whole number of days.";
  }
}

function validateLineItems(
  values: OfferFormValues,
  intent: OfferSubmitIntent,
  fields: Partial<Record<keyof OfferFormValues, string>>,
): void {
  const error = validateDocumentLineItems(values.lineItems, intent);
  if (error) fields.lineItems = error;
}
