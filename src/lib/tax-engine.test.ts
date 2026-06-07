import { describe, it, expect } from "vitest";
import { determineTaxTreatment, calculateTaxBreakdown, verifyAndDetermine } from "@/lib/tax-engine";
import type { TaxInput } from "@/lib/tax-engine";

describe("determineTaxTreatment", () => {
  it("returns domestic for Croatian client", () => {
    const result = determineTaxTreatment({ clientCountry: "HR", clientVatNumber: null });
    expect(result).toBe("domestic");
  });

  it("returns reverse-charge for foreign client with VAT number", () => {
    const result = determineTaxTreatment({ clientCountry: "DE", clientVatNumber: "DE123456789" });
    expect(result).toBe("reverse-charge");
  });

  it("returns international for foreign client without VAT number", () => {
    const result = determineTaxTreatment({ clientCountry: "US", clientVatNumber: null });
    expect(result).toBe("international");
  });
});

describe("calculateTaxBreakdown", () => {
  it("calculates 25% PDV on base amount", () => {
    const result = calculateTaxBreakdown(1000, 25);
    expect(result).toEqual({ base: 1000, pdv: 250, total: 1250 });
  });

  it("supports custom VAT rates", () => {
    const result = calculateTaxBreakdown(1000, 13);
    expect(result).toEqual({ base: 1000, pdv: 130, total: 1130 });
  });
});

const COMPANY_LEGAL_TEXTS = {
  domestic: "Obračun prema članku 79.",
  foreignHr: "Prijenos porezne obveze",
  foreignEn: "Reverse charge",
};

function domesticInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    clientCountry: "HR",
    clientVatNumber: null,
    vatRate: 25,
    baseAmount: 1000,
    companyLegalTexts: COMPANY_LEGAL_TEXTS,
    ...overrides,
  };
}

function foreignVatInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    clientCountry: "DE",
    clientVatNumber: "DE123456789",
    vatRate: 25,
    baseAmount: 1000,
    companyLegalTexts: COMPANY_LEGAL_TEXTS,
    ...overrides,
  };
}

function foreignNoVatInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    clientCountry: "US",
    clientVatNumber: null,
    vatRate: 25,
    baseAmount: 1000,
    companyLegalTexts: COMPANY_LEGAL_TEXTS,
    ...overrides,
  };
}

const VALID_VIES_RESPONSE = {
  valid: true,
  countryCode: "DE",
  vatNumber: "123456789",
  requestDate: "2026-06-07+02:00",
  name: "ACME GMBH",
  address: "MUSTERSTRASSE 1\n12345 BERLIN",
};

const INVALID_VIES_RESPONSE = {
  valid: false,
  countryCode: "DE",
  vatNumber: "000000000",
  requestDate: "2026-06-07+02:00",
  name: "---",
  address: "---",
};

function mockFetch(body: unknown, status = 200) {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("verifyAndDetermine", () => {
  it("returns domestic result with PDV breakdown and legal text", async () => {
    const result = await verifyAndDetermine(domesticInput());

    expect(result).toEqual({
      ok: true,
      type: "domestic",
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });

  it("returns reverse charge for foreign client with valid VAT", async () => {
    const result = await verifyAndDetermine(
      foreignVatInput(),
      mockFetch(VALID_VIES_RESPONSE),
    );

    expect(result).toMatchObject({
      ok: true,
      type: "reverse-charge",
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: {
        foreignHr: "Prijenos porezne obveze",
        foreignEn: "Reverse charge",
      },
    });

    if (result.ok && result.type === "reverse-charge") {
      expect(result.viesResult.valid).toBe(true);
      expect(result.viesResult.countryCode).toBe("DE");
      expect(result.viesResult.rawResponse).toBeDefined();
    }
  });

  it("returns error for foreign client with invalid VAT", async () => {
    const result = await verifyAndDetermine(
      foreignVatInput(),
      mockFetch(INVALID_VIES_RESPONSE),
    );

    expect(result).toEqual({
      ok: false,
      error: "VAT number DE123456789 is not valid according to VIES",
      code: "vies_invalid",
    });
  });

  it("returns error when VIES API is unreachable", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await verifyAndDetermine(
      foreignVatInput(),
      failFetch as typeof fetch,
    );

    expect(result).toEqual({
      ok: false,
      error: "Network error: VIES service unreachable",
      code: "vies_error",
    });
  });

  it("returns international result for foreign client without VAT", async () => {
    const result = await verifyAndDetermine(foreignNoVatInput());

    expect(result).toEqual({
      ok: true,
      type: "international",
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: {},
    });
  });

  it("uses parameterized VAT rate for domestic invoices", async () => {
    const result = await verifyAndDetermine(domesticInput({ vatRate: 13 }));

    expect(result).toEqual({
      ok: true,
      type: "domestic",
      breakdown: { base: 1000, pdv: 130, total: 1130 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });
});
