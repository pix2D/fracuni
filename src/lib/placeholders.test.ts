import { describe, it, expect } from "vitest";
import { expandPlaceholders, expandEmailTemplate } from "@/lib/placeholders";

describe("expandPlaceholders", () => {
  const date = new Date(2026, 5, 7); // 7 June 2026

  it("expands day, month number, month name and year", () => {
    expect(expandPlaceholders("Usluge {day}. {monthName} {month}/{year}.", date)).toBe(
      "Usluge 07. lipanj 06/2026.",
    );
  });

  it("uses English month names for non-Croatian clients", () => {
    expect(expandPlaceholders("Services for {monthName} {year}", { date, domestic: false })).toBe(
      "Services for June 2026",
    );
  });

  it("expands repeated placeholders", () => {
    expect(expandPlaceholders("{month}/{year} — {month}/{year}", date)).toBe(
      "06/2026 — 06/2026",
    );
  });

  it("leaves text without placeholders untouched", () => {
    expect(expandPlaceholders("Konzultacije", date)).toBe("Konzultacije");
  });

  it("defaults to today when no date is given", () => {
    const now = new Date();
    const year = String(now.getFullYear());
    expect(expandPlaceholders("{year}")).toBe(year);
  });
});

describe("expandEmailTemplate", () => {
  const vars = {
    documentNumber: "1/1/1",
    clientName: "Acme GmbH",
    companyName: "Orion Test Works d.o.o.",
    date: new Date(2026, 5, 7),
    locale: "en" as const,
  };

  it("expands document number, client name, company name and date placeholders", () => {
    expect(
      expandEmailTemplate("Invoice {documentNumber} for {clientName} from {companyName} - {monthName} {year}", vars),
    ).toBe("Invoice 1/1/1 for Acme GmbH from Orion Test Works d.o.o. - June 2026");
  });

  it("expands repeated placeholders", () => {
    expect(expandEmailTemplate("{clientName} — {clientName}", vars)).toBe(
      "Acme GmbH — Acme GmbH",
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(expandEmailTemplate("Hello {unknown}", vars)).toBe("Hello {unknown}");
  });
});
