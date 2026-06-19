import { addDays, differenceInCalendarDays, format, isValid } from "date-fns";
import { EMPTY_LINE_ITEM, type LineItemRow } from "@/components/LineItemsEditor";
import { isCurrencyCode } from "@/lib/currency";
import { parseDecimalInput } from "@/lib/decimal-input";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Settings } from "@/lib/settings";

export type DocumentSubmitIntent = "save" | "finalize";

export interface DocumentLineItemsInput {
  lineItems: LineItemRow[];
}

export interface DocumentNotesInput {
  notesHr: string;
  notesEn: string;
}

export const documentLineItemsDefaults: DocumentLineItemsInput = {
  lineItems: [{ ...EMPTY_LINE_ITEM }],
};

export const documentNotesDefaults: DocumentNotesInput = {
  notesHr: "",
  notesEn: "",
};

export const documentLineItemFields = {
  lineItems: "lineItems",
} satisfies { [K in keyof DocumentLineItemsInput]-?: K };

export const documentNoteFields = {
  notesHr: "notesHr",
  notesEn: "notesEn",
} satisfies { [K in keyof DocumentNotesInput]-?: K };

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

export function addDaysToDate(date: Date | undefined, days: number | undefined): Date | undefined {
  if (!date || days == null || !Number.isInteger(days)) return undefined;
  return addDays(date, days);
}

export function parseFormId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function defaultDocumentCurrency(settings: Settings, client?: Client): string {
  if (client?.defaultCurrency && settings.supportedCurrencies.includes(client.defaultCurrency)) {
    return client.defaultCurrency;
  }
  return settings.supportedCurrencies[0] ?? "EUR";
}

export function documentClientOptions(clients: Client[]) {
  return clients.map((client) => ({
    value: String(client.id),
    label: client.name,
  }));
}

export function documentLocationOptions(company: CompanyWithRelations) {
  return company.locations.map((location) => ({
    value: String(location.id),
    label: `${location.number} - ${location.nameHr}`,
  }));
}

export function documentPaymentMethodOptions(company: CompanyWithRelations) {
  return company.paymentMethods.map((paymentMethod) => ({
    value: String(paymentMethod.id),
    label: `${paymentMethod.number} - ${paymentMethod.nameHr}`,
  }));
}

export function documentCurrencyOptions(settings: Settings) {
  return settings.supportedCurrencies.map((code) => ({
    value: code,
    label: code,
  }));
}

export function lineItemHasPayload(lineItem: LineItemRow): boolean {
  return (
    lineItem.descriptionHr.trim() !== "" ||
    lineItem.descriptionEn.trim() !== "" ||
    parseDecimalInput(lineItem.unitPrice) !== null
  );
}

export function lineItemHasInvalidNumber(lineItem: LineItemRow): boolean {
  const quantity = parseDecimalInput(lineItem.quantity);
  const unitPrice = parseDecimalInput(lineItem.unitPrice);

  if (lineItem.quantity.trim() !== "" && quantity === null) return true;
  if (lineItem.unitPrice.trim() !== "" && unitPrice === null) return true;
  return (quantity !== null && quantity < 0) || (unitPrice !== null && unitPrice < 0);
}

export function lineItemIsComplete(lineItem: LineItemRow): boolean {
  const quantity = parseDecimalInput(lineItem.quantity);
  const unitPrice = parseDecimalInput(lineItem.unitPrice);
  return lineItem.descriptionHr.trim() !== "" && quantity !== null && quantity > 0 && unitPrice !== null;
}

export function validateDocumentLineItems(
  lineItems: LineItemRow[],
  intent: DocumentSubmitIntent,
): string | null {
  let completeItems = 0;

  for (const lineItem of lineItems) {
    if (lineItemHasInvalidNumber(lineItem)) {
      return "Line item quantity and unit price must be valid non-negative numbers.";
    }

    if (!lineItemHasPayload(lineItem)) continue;

    if (lineItemIsComplete(lineItem)) {
      completeItems += 1;
    } else if (intent === "finalize") {
      return "Finalization requires every included line item to have an HR description, quantity, and unit price.";
    }
  }

  if (intent === "finalize" && completeItems === 0) {
    return "Add at least one complete line item before finalization.";
  }

  return null;
}

export function isSupportedCurrency(value: string, settings: Settings): boolean {
  return settings.supportedCurrencies.includes(value) && isCurrencyCode(value);
}
