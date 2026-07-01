import type { LineItemRow } from "@/components/LineItemsEditor";
import { isDomestic } from "@/lib/countries";
import { isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { decideServiceVat, type ServiceVatDecision } from "@/lib/tax-engine";
import { computeInvoiceTotals, type InvoiceTotals } from "@/lib/invoice-totals";
import { parseDecimalInput } from "@/lib/decimal-input";
import { DOCUMENT_TYPE } from "@/lib/documents";
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
import type { Invoice, InvoiceInput } from "@/lib/invoices";
import type { Settings } from "@/lib/settings";

export type InvoiceDocumentType = typeof DOCUMENT_TYPE.INVOICE | typeof DOCUMENT_TYPE.CREDIT_NOTE;
export type InvoiceSubmitIntent = DocumentSubmitIntent;

export interface InvoiceFormValues {
  clientId: string;
  locationId: string;
  paymentMethodId: string;
  currency: string;
  email: string;
  issueDate: Date | undefined;
  deliveryDate: Date | undefined;
  dueDate: Date | undefined;
  termsDays: number | undefined;
  notesHr: string;
  notesEn: string;
  lineItems: LineItemRow[];
  dueDateManual: boolean;
}

export type InvoiceDateFieldsInput = Pick<
  InvoiceFormValues,
  "issueDate" | "deliveryDate" | "dueDate" | "termsDays" | "dueDateManual"
>;

export type InvoiceLineItemsInput = DocumentLineItemsInput;
export type InvoiceNotesInput = DocumentNotesInput;

export const invoiceDateDefaults: InvoiceDateFieldsInput = {
  issueDate: undefined,
  deliveryDate: undefined,
  dueDate: undefined,
  termsDays: undefined,
  dueDateManual: false,
};

export const invoiceLineItemsDefaults: InvoiceLineItemsInput = documentLineItemsDefaults;

export const invoiceNotesDefaults: InvoiceNotesInput = documentNotesDefaults;

export const invoiceFormDefaults: InvoiceFormValues = {
  clientId: "",
  locationId: "",
  paymentMethodId: "",
  currency: "",
  email: "",
  ...invoiceDateDefaults,
  ...invoiceLineItemsDefaults,
  ...invoiceNotesDefaults,
};

export const invoiceFormFields = {
  clientId: "clientId",
  locationId: "locationId",
  paymentMethodId: "paymentMethodId",
  currency: "currency",
  email: "email",
  issueDate: "issueDate",
  deliveryDate: "deliveryDate",
  dueDate: "dueDate",
  termsDays: "termsDays",
  notesHr: "notesHr",
  notesEn: "notesEn",
  lineItems: "lineItems",
  dueDateManual: "dueDateManual",
} satisfies { [K in keyof InvoiceFormValues]-?: K };

export const invoiceDateFields = {
  issueDate: "issueDate",
  deliveryDate: "deliveryDate",
  dueDate: "dueDate",
  termsDays: "termsDays",
  dueDateManual: "dueDateManual",
} satisfies { [K in keyof InvoiceDateFieldsInput]-?: K };

export const invoiceLineItemFields = documentLineItemFields;

export const invoiceNoteFields = documentNoteFields;

export function resolvePaymentTerms(
  company: CompanyWithRelations,
  settings: Settings,
  client?: Client,
): number {
  return client?.defaultPaymentTermsDays ?? company.defaultPaymentTermsDays ?? settings.defaultPaymentTermsDays;
}

export function defaultCurrency(settings: Settings, client?: Client): string {
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

export function selectedClient(values: InvoiceFormValues, clients: Client[]): Client | undefined {
  const clientId = parseId(values.clientId);
  return clientId ? clients.find((client) => client.id === clientId) : undefined;
}

export function isDomesticInvoice(values: InvoiceFormValues, clients: Client[]): boolean {
  const client = selectedClient(values, clients);
  return client ? isDomestic(client.country) : true;
}

export function invoiceVatDecision(values: InvoiceFormValues, clients: Client[]): ServiceVatDecision | null {
  const client = selectedClient(values, clients);
  if (!client) return null;
  return decideServiceVat({
    clientType: client.clientType,
    clientCountry: client.country,
    clientVatNumber: client.vatNumber,
  });
}

export function invoiceCurrencyCode(values: InvoiceFormValues): CurrencyCode | null {
  return isCurrencyCode(values.currency) ? values.currency : null;
}

export function invoiceTotals(
  values: InvoiceFormValues,
  clients: Client[],
  settings: Settings,
  documentType: InvoiceDocumentType,
): InvoiceTotals | null {
  const currencyCode = invoiceCurrencyCode(values);
  if (!currencyCode) return null;

  const decision = invoiceVatDecision(values, clients);
  const chargeVat = decision?.chargesVat ?? false;
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;

  const items = values.lineItems.map((item) => {
    const quantity = parseDecimalInput(item.quantity) ?? 0;
    const unitPrice = parseDecimalInput(item.unitPrice) ?? 0;
    return {
      quantity: isCreditNote ? Math.abs(quantity) : quantity,
      unitPrice: isCreditNote ? -Math.abs(unitPrice) : unitPrice,
    };
  });

  return computeInvoiceTotals(items, currencyCode, {
    chargeVat,
    vatRate: settings.defaultVatRate,
  });
}

export function invoiceDefaults({
  company,
  clients,
  settings,
  documentType,
  invoice,
}: {
  company: CompanyWithRelations;
  clients: Client[];
  settings: Settings;
  documentType: InvoiceDocumentType;
  invoice?: Invoice;
}): InvoiceFormValues {
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;

  if (invoice) {
    const client = clients.find((candidate) => candidate.id === invoice.clientId);
    const issueDate = strToDate(invoice.issueDate);
    const dueDate = strToDate(invoice.dueDate);

    return {
      clientId: invoice.clientId ? String(invoice.clientId) : "",
      locationId: invoice.locationId ? String(invoice.locationId) : "",
      paymentMethodId: invoice.paymentMethodId ? String(invoice.paymentMethodId) : "",
      currency: invoice.currency ?? defaultCurrency(settings, client),
      email: invoice.email ?? "",
      issueDate,
      deliveryDate: strToDate(invoice.deliveryDate),
      dueDate,
      termsDays: daysBetween(issueDate, dueDate) ?? resolvePaymentTerms(company, settings, client),
      notesHr: invoice.notesHr ?? "",
      notesEn: invoice.notesEn ?? "",
      lineItems: invoice.lineItems.map((lineItem) => ({
        descriptionHr: lineItem.descriptionHr ?? "",
        descriptionEn: lineItem.descriptionEn ?? "",
        quantity: lineItem.quantity != null ? String(isCreditNote ? Math.abs(lineItem.quantity) : lineItem.quantity) : "",
        unitPrice: lineItem.unitPrice != null ? String(isCreditNote ? Math.abs(lineItem.unitPrice) : lineItem.unitPrice) : "",
      })),
      dueDateManual: true,
    };
  }

  const today = new Date();
  const terms = resolvePaymentTerms(company, settings);
  const defaultLocation = company.locations.find((location) => location.isDefault) ?? company.locations[0];
  const defaultPaymentMethod =
    company.paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ?? company.paymentMethods[0];

  return {
    clientId: "",
    locationId: defaultLocation ? String(defaultLocation.id) : "",
    paymentMethodId: defaultPaymentMethod ? String(defaultPaymentMethod.id) : "",
    currency: defaultCurrency(settings),
    email: "",
    issueDate: today,
    deliveryDate: today,
    dueDate: addTermsToDate(today, terms),
    termsDays: terms,
    notesHr: "",
    notesEn: "",
    lineItems: documentLineItemsDefaults.lineItems.map((lineItem) => ({ ...lineItem })),
    dueDateManual: false,
  };
}

export function invoicePayloadFromValues(
  values: InvoiceFormValues,
  documentType: InvoiceDocumentType,
  domestic: boolean,
): InvoiceInput {
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;
  const payloadNumber = (value: string): number | null => {
    const parsed = parseDecimalInput(value);
    if (parsed === null) return null;
    return isCreditNote ? Math.abs(parsed) : parsed;
  };

  return {
    type: documentType,
    clientId: parseId(values.clientId),
    locationId: parseId(values.locationId),
    paymentMethodId: parseId(values.paymentMethodId),
    currency: values.currency.trim() || null,
    email: values.email.trim() || null,
    issueDate: dateToStr(values.issueDate),
    deliveryDate: dateToStr(values.deliveryDate),
    dueDate: dateToStr(values.dueDate),
    notesHr: values.notesHr.trim() || null,
    notesEn: domestic ? null : values.notesEn.trim() || null,
    lineItems: values.lineItems.filter(lineItemHasPayload).map((lineItem) => ({
      descriptionHr: lineItem.descriptionHr.trim() || null,
      descriptionEn: domestic ? null : lineItem.descriptionEn.trim() || null,
      quantity: payloadNumber(lineItem.quantity),
      unitPrice: payloadNumber(lineItem.unitPrice),
    })),
  };
}

export function validateInvoiceForm(
  values: InvoiceFormValues,
  intent: InvoiceSubmitIntent,
  context: {
    company: CompanyWithRelations;
    clients: Client[];
    settings: Settings;
  },
) {
  const fields: Partial<Record<keyof InvoiceFormValues, string>> = {};

  validateEnteredIds(values, context, fields);
  validateOptionalFields(values, context.settings, fields);
  validateLineItems(values, intent, fields);

  if (intent === "finalize") {
    if (!values.clientId) fields.clientId = "Client is required before finalization.";
    if (!values.locationId) fields.locationId = "Location is required before finalization.";
    if (!values.paymentMethodId) fields.paymentMethodId = "Payment method is required before finalization.";
    if (!values.currency) fields.currency = "Currency is required before finalization.";
    if (!dateToStr(values.issueDate)) fields.issueDate = "Issue date is required before finalization.";
  }

  if (Object.keys(fields).length === 0) return undefined;

  return {
    form: "Review the highlighted fields and try again.",
    fields,
  };
}

export function addTermsToDate(date: Date | undefined, termsDays: number | undefined): Date | undefined {
  return addDaysToDate(date, termsDays);
}

function parseId(value: string): number | null {
  return parseFormId(value);
}

function validateEnteredIds(
  values: InvoiceFormValues,
  context: { company: CompanyWithRelations; clients: Client[] },
  fields: Partial<Record<keyof InvoiceFormValues, string>>,
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
  values: InvoiceFormValues,
  settings: Settings,
  fields: Partial<Record<keyof InvoiceFormValues, string>>,
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
  if (values.termsDays != null && (!Number.isInteger(values.termsDays) || values.termsDays < 0)) {
    fields.termsDays = "Payment terms must be a whole number of days.";
  }
}

function validateLineItems(
  values: InvoiceFormValues,
  intent: InvoiceSubmitIntent,
  fields: Partial<Record<keyof InvoiceFormValues, string>>,
): void {
  const error = validateDocumentLineItems(values.lineItems, intent);
  if (error) fields.lineItems = error;
}
