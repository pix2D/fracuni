import { addDays, differenceInCalendarDays, format, isValid } from "date-fns";
import { EMPTY_LINE_ITEM, type LineItemRow } from "@/components/LineItemsEditor";
import { isDomestic } from "@/lib/countries";
import { isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { chargesCroatianPdv, determineTaxTreatment, type TaxTreatment } from "@/lib/tax-engine";
import { computeInvoiceTotals, type InvoiceTotals } from "@/lib/invoice-totals";
import { parseDecimalInput } from "@/lib/decimal-input";
import { DOCUMENT_TYPE } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Invoice, InvoiceInput } from "@/lib/invoices";
import type { Settings } from "@/lib/settings";

export type InvoiceDocumentType = typeof DOCUMENT_TYPE.INVOICE | typeof DOCUMENT_TYPE.CREDIT_NOTE;
export type InvoiceSubmitIntent = "save" | "finalize";

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

export type InvoiceLineItemsInput = Pick<InvoiceFormValues, "lineItems">;
export type InvoiceNotesInput = Pick<InvoiceFormValues, "notesHr" | "notesEn">;

export const invoiceDateDefaults: InvoiceDateFieldsInput = {
  issueDate: undefined,
  deliveryDate: undefined,
  dueDate: undefined,
  termsDays: undefined,
  dueDateManual: false,
};

export const invoiceLineItemsDefaults: InvoiceLineItemsInput = {
  lineItems: [{ ...EMPTY_LINE_ITEM }],
};

export const invoiceNotesDefaults: InvoiceNotesInput = {
  notesHr: "",
  notesEn: "",
};

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

export const invoiceLineItemFields = {
  lineItems: "lineItems",
} satisfies { [K in keyof InvoiceLineItemsInput]-?: K };

export const invoiceNoteFields = {
  notesHr: "notesHr",
  notesEn: "notesEn",
} satisfies { [K in keyof InvoiceNotesInput]-?: K };

export function strToDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return isValid(date) ? date : undefined;
}

export function dateToStr(date: Date | undefined): string | null {
  return date && isValid(date) ? format(date, "yyyy-MM-dd") : null;
}

export function daysBetween(start: Date | undefined, end: Date | undefined): number | undefined {
  if (!start || !end) return undefined;
  return differenceInCalendarDays(end, start);
}

export function resolvePaymentTerms(
  company: CompanyWithRelations,
  settings: Settings,
  client?: Client,
): number {
  return client?.defaultPaymentTermsDays ?? company.defaultPaymentTermsDays ?? settings.defaultPaymentTermsDays;
}

export function defaultCurrency(settings: Settings, client?: Client): string {
  if (client?.defaultCurrency && settings.supportedCurrencies.includes(client.defaultCurrency)) {
    return client.defaultCurrency;
  }
  return settings.supportedCurrencies[0] ?? "EUR";
}

export function clientOptions(clients: Client[]) {
  return clients.map((client) => ({
    value: String(client.id),
    label: client.name,
  }));
}

export function locationOptions(company: CompanyWithRelations) {
  return company.locations.map((location) => ({
    value: String(location.id),
    label: `${location.number} - ${location.nameHr}`,
  }));
}

export function paymentMethodOptions(company: CompanyWithRelations) {
  return company.paymentMethods.map((paymentMethod) => ({
    value: String(paymentMethod.id),
    label: `${paymentMethod.number} - ${paymentMethod.nameHr}`,
  }));
}

export function currencyOptions(settings: Settings) {
  return settings.supportedCurrencies.map((code) => ({
    value: code,
    label: code,
  }));
}

export function selectedClient(values: InvoiceFormValues, clients: Client[]): Client | undefined {
  const clientId = parseId(values.clientId);
  return clientId ? clients.find((client) => client.id === clientId) : undefined;
}

export function isDomesticInvoice(values: InvoiceFormValues, clients: Client[]): boolean {
  const client = selectedClient(values, clients);
  return client ? isDomestic(client.country) : true;
}

export function invoiceTaxTreatment(values: InvoiceFormValues, clients: Client[]): TaxTreatment | null {
  const client = selectedClient(values, clients);
  if (!client) return null;
  return determineTaxTreatment({
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

  const treatment = invoiceTaxTreatment(values, clients);
  const chargeVat = treatment ? chargesCroatianPdv(treatment) : false;
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
    dueDate: addDays(today, terms),
    termsDays: terms,
    notesHr: "",
    notesEn: "",
    lineItems: [{ ...EMPTY_LINE_ITEM }],
    dueDateManual: false,
  };
}

export function invoicePayloadFromValues(
  values: InvoiceFormValues,
  companyId: number,
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
    companyId,
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
    if (!isValidFormDate(values.issueDate)) fields.issueDate = "Issue date is required before finalization.";
  }

  if (Object.keys(fields).length === 0) return undefined;

  return {
    form: "Review the highlighted fields and try again.",
    fields,
  };
}

export function addTermsToDate(date: Date | undefined, termsDays: number | undefined): Date | undefined {
  if (!date || termsDays == null || !Number.isInteger(termsDays)) return undefined;
  return addDays(date, termsDays);
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidFormDate(date: Date | undefined): boolean {
  return !!date && isValid(date);
}

function lineItemHasPayload(lineItem: LineItemRow): boolean {
  return (
    lineItem.descriptionHr.trim() !== "" ||
    lineItem.descriptionEn.trim() !== "" ||
    parseDecimalInput(lineItem.unitPrice) !== null
  );
}

function lineItemHasInvalidNumber(lineItem: LineItemRow): boolean {
  const quantity = parseDecimalInput(lineItem.quantity);
  const unitPrice = parseDecimalInput(lineItem.unitPrice);

  if (lineItem.quantity.trim() !== "" && quantity === null) return true;
  if (lineItem.unitPrice.trim() !== "" && unitPrice === null) return true;
  return (quantity !== null && quantity < 0) || (unitPrice !== null && unitPrice < 0);
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
  if (values.currency && !isCurrencyCode(values.currency)) {
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
  let completeItems = 0;

  for (const lineItem of values.lineItems) {
    if (lineItemHasInvalidNumber(lineItem)) {
      fields.lineItems = "Line item quantity and unit price must be valid non-negative numbers.";
      return;
    }

    if (!lineItemHasPayload(lineItem)) continue;

    const quantity = parseDecimalInput(lineItem.quantity);
    const unitPrice = parseDecimalInput(lineItem.unitPrice);
    const complete = lineItem.descriptionHr.trim() !== "" && quantity !== null && quantity > 0 && unitPrice !== null;

    if (complete) {
      completeItems += 1;
    } else if (intent === "finalize") {
      fields.lineItems = "Finalization requires every included line item to have an HR description, quantity, and unit price.";
      return;
    }
  }

  if (intent === "finalize" && completeItems === 0) {
    fields.lineItems = "Add at least one complete line item before finalization.";
  }
}
