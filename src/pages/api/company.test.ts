import { describe, expect, it } from "vitest";
import { createLocation, createPaymentMethod, upsertCompanyProfile } from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { GET, PUT } from "@/pages/api/company";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const COMPANY_INPUT: CompanyInput = {
  name: "Orion Test Works d.o.o.",
  address: "Ilica 1, 10000 Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  taglineHr: "Vaš pouzdani partner",
  taglineEn: "Your trusted partner",
  iban: "HR1234567890123456789",
  swift: "ZABAHR2X",
  legalTextServiceDomesticHr: "Oslobođeno PDV-a...",
  legalTextServiceEuB2cHr: "EU B2C tekst...",
  legalTextServiceEuB2cEn: "EU B2C text...",
  legalTextServiceEuB2bReverseChargeHr: "Prijenos porezne obveze...",
  legalTextServiceEuB2bReverseChargeEn: "Reverse charge applies...",
  legalTextServiceEuB2bWithoutVatIdHr: "EU B2B bez PDV ID tekst...",
  legalTextServiceEuB2bWithoutVatIdEn: "EU B2B without VAT ID text...",
  legalTextServiceNonEuB2cHr: "Non-EU B2C tekst...",
  legalTextServiceNonEuB2cEn: "Non-EU B2C text...",
  legalTextServiceNonEuB2bHr: "Non-EU B2B tekst...",
  legalTextServiceNonEuB2bEn: "Non-EU B2B text...",
  emailFromAddress: "info@orion-test-works.test",
  emailFromName: "Orion Test Works",
  emailSubjectTemplate: "Invoice {documentNumber}",
  emailBodyTemplate: "Hello, please find invoice {documentNumber}.",
  defaultPaymentTermsDays: 15,
  issuerName: "Marko Marković",
};

describe("GET /api/company", () => {
  it("returns the company profile with Locations and Payment Methods", async () => {
    const company = await upsertCompanyProfile(COMPANY_INPUT);
    await createLocation({ number: 1, nameHr: "Zagreb" });
    await createPaymentMethod({ number: 1, nameHr: "Virman" });

    const response = await GET(apiContext());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: company.id,
      locations: [{ number: 1, nameHr: "Zagreb", isDefault: true }],
      paymentMethods: [{ number: 1, nameHr: "Virman", isDefault: true }],
    });
  });

  it("returns 404 when the company profile has not been created", async () => {
    const response = await GET(apiContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Company profile not found",
    });
  });
});

describe("PUT /api/company", () => {
  it("upserts the company profile without initial Locations or Payment Methods", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(COMPANY_INPUT),
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: "Orion Test Works d.o.o.",
      locations: [],
      paymentMethods: [],
    });
  });

  it("ignores setup defaults during validation", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...COMPANY_INPUT,
          oib: "99999999999",
          locations: [{ number: 1, nameHr: "Zagreb", isDefault: false }],
          paymentMethods: [{ number: 1, nameHr: "Transakcijski", isDefault: true }],
        }),
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: "Orion Test Works d.o.o.",
      locations: [],
      paymentMethods: [],
    });
  });
});
