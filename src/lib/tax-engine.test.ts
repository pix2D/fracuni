import { describe, it, expect } from "vitest";
import { CLIENT_TYPE } from "@/lib/client-types";
import { calculateTaxBreakdown, decideServiceVat, verifyAndDetermine } from "@/lib/tax-engine";
import type { TaxInput } from "@/lib/tax-engine";

describe("decideServiceVat", () => {
  it("charges VAT for domestic service clients", () => {
    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "HR",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-domestic",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceDomestic",
    });

    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "HR",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-domestic",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceDomestic",
    });
  });

  it("charges VAT for EU B2C service clients", () => {
    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "DE",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-eu-b2c",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceEuB2c",
    });
  });

  it("uses reverse charge for EU B2B service clients with a VAT ID", () => {
    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "DE",
        clientVatNumber: "DE123456789",
      }),
    ).toMatchObject({
      scenario: "service-eu-b2b-reverse-charge",
      chargesVat: false,
      requiresVies: true,
      legalTextKey: "serviceEuB2bReverseCharge",
    });
  });

  it("charges VAT for EU B2B service clients without a VAT ID", () => {
    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "DE",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-eu-b2b-without-vat-id",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceEuB2bWithoutVatId",
    });
  });

  it("does not charge VAT for non-EU service clients", () => {
    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.BUSINESS,
        clientCountry: "US",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-non-eu-b2b",
      chargesVat: false,
      requiresVies: false,
      legalTextKey: "serviceNonEuB2b",
    });

    expect(
      decideServiceVat({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "US",
        clientVatNumber: null,
      }),
    ).toMatchObject({
      scenario: "service-non-eu-b2c",
      chargesVat: false,
      requiresVies: false,
      legalTextKey: "serviceNonEuB2c",
    });
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
  legalTextServiceDomesticHr: "Domestic service VAT",
  legalTextServiceEuB2cHr: "EU B2C HR",
  legalTextServiceEuB2cEn: "EU B2C EN",
  legalTextServiceEuB2bReverseChargeHr: "EU B2B reverse HR",
  legalTextServiceEuB2bReverseChargeEn: "EU B2B reverse EN",
  legalTextServiceEuB2bWithoutVatIdHr: "EU B2B no VAT ID HR",
  legalTextServiceEuB2bWithoutVatIdEn: "EU B2B no VAT ID EN",
  legalTextServiceNonEuB2cHr: "Non-EU B2C HR",
  legalTextServiceNonEuB2cEn: "Non-EU B2C EN",
  legalTextServiceNonEuB2bHr: "Non-EU B2B HR",
  legalTextServiceNonEuB2bEn: "Non-EU B2B EN",
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
  it("returns domestic service VAT result with breakdown and legal text", async () => {
    const result = await verifyAndDetermine(taxInput());

    expect(result).toMatchObject({
      ok: true,
      decision: { scenario: "service-domestic", chargesVat: true, legalTextKey: "serviceDomestic" },
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { hr: "Domestic service VAT", en: null },
      viesResult: null,
    });
  });

  it("returns reverse charge for EU B2B service client with valid VAT ID", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: "DE123456789",
      }),
      mockFetch(VALID_VIES_RESPONSE),
    );

    expect(result).toMatchObject({
      ok: true,
      decision: {
        scenario: "service-eu-b2b-reverse-charge",
        chargesVat: false,
        requiresVies: true,
        legalTextKey: "serviceEuB2bReverseCharge",
      },
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: {
        hr: "EU B2B reverse HR",
        en: "EU B2B reverse EN",
      },
    });

    if (result.ok) {
      expect(result.viesResult?.valid).toBe(true);
      expect(result.viesResult?.countryCode).toBe("DE");
      expect(result.viesResult?.rawResponse).toBeDefined();
    }
  });

  it("returns error for EU B2B service client with invalid VAT ID", async () => {
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

  it("charges VAT for EU B2B service clients without VAT ID and does not call VIES", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientCountry: "DE",
        clientVatNumber: null,
      }),
      failIfCalled,
    );

    expect(result).toMatchObject({
      ok: true,
      decision: { scenario: "service-eu-b2b-without-vat-id", chargesVat: true, requiresVies: false },
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { hr: "EU B2B no VAT ID HR", en: "EU B2B no VAT ID EN" },
      viesResult: null,
    });
  });

  it("charges VAT for EU B2C service clients and does not call VIES", async () => {
    const result = await verifyAndDetermine(
      taxInput({
        clientType: CLIENT_TYPE.PERSON,
        clientCountry: "DE",
        clientVatNumber: null,
      }),
      failIfCalled,
    );

    expect(result).toMatchObject({
      ok: true,
      decision: { scenario: "service-eu-b2c", chargesVat: true, requiresVies: false },
      breakdown: { base: 1000, pdv: 250, total: 1250 },
      legalTexts: { hr: "EU B2C HR", en: "EU B2C EN" },
      viesResult: null,
    });
  });

  it("does not charge VAT for non-EU service clients", async () => {
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

    expect(business).toMatchObject({
      ok: true,
      decision: { scenario: "service-non-eu-b2b", chargesVat: false },
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: { hr: "Non-EU B2B HR", en: "Non-EU B2B EN" },
    });
    expect(person).toMatchObject({
      ok: true,
      decision: { scenario: "service-non-eu-b2c", chargesVat: false },
      breakdown: { base: 1000, pdv: 0, total: 1000 },
      legalTexts: { hr: "Non-EU B2C HR", en: "Non-EU B2C EN" },
    });
  });

  it("uses parameterized VAT rate for VAT-charged service invoices", async () => {
    const result = await verifyAndDetermine(taxInput({ vatRate: 13 }));

    expect(result).toMatchObject({
      ok: true,
      decision: { scenario: "service-domestic", chargesVat: true },
      breakdown: { base: 1000, pdv: 130, total: 1130 },
      legalTexts: { hr: "Domestic service VAT", en: null },
    });
  });
});
