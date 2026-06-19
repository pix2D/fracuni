import { describe, it, expect } from "vitest";
import { CLIENT_TYPE } from "@/lib/client-types";
import { determineTaxTreatment, calculateTaxBreakdown, verifyAndDetermine } from "@/lib/tax-engine";
import type { TaxInput } from "@/lib/tax-engine";

describe("determineTaxTreatment", () => {
  it("charges Croatian PDV for Croatian clients", () => {
    expect(
      determineTaxTreatment({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "HR",
        clientVatNumber: null,
      }),
    ).toBe("croatian-pdv");

    expect(
      determineTaxTreatment({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "HR",
        clientVatNumber: null,
      }),
    ).toBe("croatian-pdv");
  });

  it("reverse-charges EU business clients with a VAT number", () => {
    const result = determineTaxTreatment({
      clientType: CLIENT_TYPE.BUSINESS,
      clientCountry: "DE",
      clientVatNumber: "DE123456789",
    });

    expect(result).toBe("reverse-charge");
  });

  it("charges Croatian PDV for EU business clients without a VAT number", () => {
    const result = determineTaxTreatment({
      clientType: CLIENT_TYPE.BUSINESS,
      clientCountry: "DE",
      clientVatNumber: null,
    });

    expect(result).toBe("croatian-pdv");
  });

  it("charges Croatian PDV for EU person clients", () => {
    const result = determineTaxTreatment({
      clientType: CLIENT_TYPE.PERSON,
      clientCountry: "DE",
      clientVatNumber: null,
    });

    expect(result).toBe("croatian-pdv");
  });

  it("treats non-EU business and person clients as outside scope", () => {
    expect(
      determineTaxTreatment({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "US",
        clientVatNumber: null,
      }),
    ).toBe("outside-scope");

    expect(
      determineTaxTreatment({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "US",
        clientVatNumber: null,
      }),
    ).toBe("outside-scope");
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

function taxInput(overrides: Partial<TaxInput> = {}): TaxInput {
  const base: TaxInput = {
    clientType: CLIENT_TYPE.BUSINESS,
    clientCountry: "HR",
    clientVatNumber: null,
    vatRate: 25,
    baseAmount: 1000,
    companyLegalTexts: COMPANY_LEGAL_TEXTS,
  };

  return { ...base, ...overrides };
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

function mockFetch(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

const failIfCalled: typeof fetch = async () => {
  throw new Error("Unexpected VIES call");
};

describe("verifyAndDetermine", () => {
  it("returns Croatian PDV result with breakdown and legal text", async () => {
    const result = await verifyAndDetermine(taxInput());

    expect(result).toEqual({
      ok: true,
      type: "croatian-pdv",
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });

  it("returns reverse charge for EU business client with valid VAT", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: "DE123456789",
      }),
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

  it("returns error for EU business client with invalid VAT", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: "DE123456789",
      }),
      mockFetch(INVALID_VIES_RESPONSE),
    );

    expect(result).toEqual({
      ok: false,
      error: "VAT number DE123456789 is not valid according to VIES",
      code: "vies_invalid",
    });
  });

  it("returns error when VIES API is unreachable", async () => {
    const failFetch: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };

    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: "DE123456789",
      }),
      failFetch,
    );

    expect(result).toEqual({
      ok: false,
      error: "Network error: VIES service unreachable",
      code: "vies_error",
    });
  });

  it("charges Croatian PDV for EU business clients without VAT and does not call VIES", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: null,
      }),
      failIfCalled,
    );

    expect(result).toEqual({
      ok: true,
      type: "croatian-pdv",
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });

  it("charges Croatian PDV for EU person clients and does not call VIES", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "DE",
        clientVatNumber: null,
      }),
      failIfCalled,
    );

    expect(result).toEqual({
      ok: true,
      type: "croatian-pdv",
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });

  it("returns outside-scope result for non-EU business and person clients", async () => {
    const business = await verifyAndDetermine(
      taxInput({
        clientCountry: "US",
      }),
      failIfCalled,
    );
    const person = await verifyAndDetermine(
      taxInput({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "US",
      }),
      failIfCalled,
    );

    expect(business).toEqual({
      ok: true,
      type: "outside-scope",
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: {},
    });
    expect(person).toEqual({
      ok: true,
      type: "outside-scope",
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: {},
    });
  });

  it("uses parameterized VAT rate for Croatian PDV invoices", async () => {
    const result = await verifyAndDetermine(taxInput({ vatRate: 13 }));

    expect(result).toEqual({
      ok: true,
      type: "croatian-pdv",
      breakdown: { base: 1000, pdv: 130, total: 1130 },
      legalTexts: { domestic: "Obračun prema članku 79." },
    });
  });
});
