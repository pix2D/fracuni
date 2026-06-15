import { describe, it, expect } from "vitest";
import { COUNTRIES, CROATIA, countryName, isDomestic } from "@/lib/countries";

describe("countries", () => {
  it("treats the Croatian ISO code as domestic", () => {
    expect(isDomestic(CROATIA)).toBe(true);
    expect(isDomestic("HR")).toBe(true);
  });

  it("treats foreign codes and the legacy display name as non-domestic", () => {
    expect(isDomestic("DE")).toBe(false);
    expect(isDomestic("Croatia")).toBe(false); // display name is not the canonical key
    expect(isDomestic(null)).toBe(false);
    expect(isDomestic(undefined)).toBe(false);
  });

  it("resolves display names from codes, falling back to the raw code", () => {
    expect(countryName("HR")).toBe("Croatia");
    expect(countryName("DE")).toBe("Germany");
    expect(countryName("ZZ")).toBe("ZZ");
    expect(countryName(null)).toBe("");
  });

  it("includes Croatia in the country list keyed by code", () => {
    expect(COUNTRIES.find((c) => c.code === CROATIA)?.name).toBe("Croatia");
  });
});
