import { isDomestic } from "@/lib/countries";

export type PlaceholderLocale = "hr" | "en";

const MONTH_NAMES: Record<PlaceholderLocale, string[]> = {
  hr: [
    "siječanj",
    "veljača",
    "ožujak",
    "travanj",
    "svibanj",
    "lipanj",
    "srpanj",
    "kolovoz",
    "rujan",
    "listopad",
    "studeni",
    "prosinac",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

export const DATE_PLACEHOLDER_TOKENS = [
  { token: "{day}", description: "Day number" },
  { token: "{month}", description: "Month number" },
  { token: "{monthName}", description: "Month name" },
  { token: "{year}", description: "Year" },
] as const;

export const EMAIL_PLACEHOLDER_TOKENS = [
  { token: "{documentNumber}", description: "Document number" },
  { token: "{clientName}", description: "Client name" },
  { token: "{companyName}", description: "Company name" },
] as const;

export interface DatePlaceholderOptions {
  date?: Date;
  locale?: PlaceholderLocale;
  domestic?: boolean;
}

function normalizeDatePlaceholderOptions(
  options: Date | DatePlaceholderOptions = {},
): Required<Pick<DatePlaceholderOptions, "date" | "locale">> {
  if (options instanceof Date) {
    return { date: options, locale: "hr" };
  }

  return {
    date: options.date ?? new Date(),
    locale: options.locale ?? (options.domestic === false ? "en" : "hr"),
  };
}

export function placeholderLocaleForCountry(countryCode: string | null | undefined): PlaceholderLocale {
  return isDomestic(countryCode) ? "hr" : "en";
}

export function dateFromIsoDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

// Service Catalog descriptions and Email templates share these date placeholders.
// They are expanded for the relevant Client language when the template is used.
export function expandPlaceholders(
  text: string,
  options: Date | DatePlaceholderOptions = {},
): string {
  const { date, locale } = normalizeDatePlaceholderOptions(options);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const monthName = MONTH_NAMES[locale][date.getMonth()] ?? month;

  return text
    .replace(/\{day\}/g, day)
    .replace(/\{monthName\}/g, monthName)
    .replace(/\{month\}/g, month)
    .replace(/\{year\}/g, year);
}

// Variables a per-Company or per-Client email subject/body template may reference. They are
// expanded when building the send-dialog defaults for a finalized document.
export interface EmailTemplateVars {
  documentNumber: string;
  clientName: string;
  companyName: string;
  date?: Date;
  locale?: PlaceholderLocale;
}

// Email subject/body templates use {documentNumber}/{clientName}/{companyName}
// plus the shared date placeholders.
// Unknown placeholders are left untouched so a typo is visible rather than silently dropped.
export function expandEmailTemplate(text: string, vars: EmailTemplateVars): string {
  const expanded = text
    .replace(/\{documentNumber\}/g, vars.documentNumber)
    .replace(/\{clientName\}/g, vars.clientName)
    .replace(/\{companyName\}/g, vars.companyName);

  return expandPlaceholders(expanded, { date: vars.date, locale: vars.locale });
}
