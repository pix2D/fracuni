import { describe, expect, it } from "vitest";
import {
  defaultDocumentLanguageForCountry,
  documentLanguagesForCountry,
  parseDocumentLanguage,
} from "@/lib/language";

describe("document language helpers", () => {
  it("parses only supported document languages", () => {
    expect(parseDocumentLanguage("hr")).toBe("hr");
    expect(parseDocumentLanguage("en")).toBe("en");
    expect(parseDocumentLanguage("de")).toBeNull();
    expect(parseDocumentLanguage(null)).toBeNull();
  });

  it("defaults missing and domestic country to Croatian", () => {
    expect(defaultDocumentLanguageForCountry(null)).toBe("hr");
    expect(defaultDocumentLanguageForCountry(undefined)).toBe("hr");
    expect(defaultDocumentLanguageForCountry("HR")).toBe("hr");
  });

  it("defaults foreign countries to English but still generates Croatian and English PDFs", () => {
    expect(defaultDocumentLanguageForCountry("DE")).toBe("en");
    expect(documentLanguagesForCountry("DE")).toEqual(["hr", "en"]);
  });
});
