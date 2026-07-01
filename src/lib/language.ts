import { isDomestic } from "@/lib/countries";

export const DOCUMENT_LANGUAGES = ["hr", "en"] as const;
export type DocumentLanguage = (typeof DOCUMENT_LANGUAGES)[number];

export function isDocumentLanguage(value: string | null): value is DocumentLanguage {
  return value === "hr" || value === "en";
}

export function parseDocumentLanguage(value: string | null): DocumentLanguage | null {
  return isDocumentLanguage(value) ? value : null;
}

export function defaultDocumentLanguageForCountry(countryCode: string | null | undefined): DocumentLanguage {
  if (!countryCode) return "hr";
  return isDomestic(countryCode) ? "hr" : "en";
}

export function documentLanguagesForCountry(countryCode: string | null | undefined): DocumentLanguage[] {
  if (!countryCode) return ["hr"];
  return isDomestic(countryCode) ? ["hr"] : [...DOCUMENT_LANGUAGES];
}
