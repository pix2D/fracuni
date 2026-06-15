import { describe, it, expect } from "vitest";
import { expandPlaceholders } from "@/lib/placeholders";

describe("expandPlaceholders", () => {
  const date = new Date(2026, 5, 7); // 7 June 2026

  it("expands day, month and year with zero-padding", () => {
    expect(expandPlaceholders("Usluge {day}.{month}.{year}.", date)).toBe(
      "Usluge 07.06.2026.",
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
