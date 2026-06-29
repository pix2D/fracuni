import { describe, expect, it } from "vitest";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { GET as getCompanies, POST as createCompanyRoute } from "@/pages/api/companies/index";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const COMPANY_INPUT: CompanyInput = {
  name: "Firefly One d.o.o.",
  address: "Ilica 1, 10000 Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  taglineHr: "Vaš pouzdani partner",
  taglineEn: "Your trusted partner",
  iban: "HR1234567890123456789",
  swift: "ZABAHR2X",
  legalTextDomestic: "Oslobođeno PDV-a...",
  legalTextForeignHr: "Prijenos porezne obveze...",
  legalTextForeignEn: "Reverse charge applies...",
  emailFromAddress: "info@firefly.hr",
  emailFromName: "Firefly One",
  emailSubjectTemplate: "Račun {broj}",
  emailBodyTemplate: "Poštovani, u prilogu šaljemo račun.",
  defaultPaymentTermsDays: 15,
  issuerName: "Marko Marković",
};

describe("GET /api/companies", () => {
  it("returns companies with their Locations and Payment Methods", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await createLocation(company.id, { number: 1, nameHr: "Zagreb" });
    await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });

    const response = await getCompanies(apiContext());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: company.id,
      locations: [{ number: 1, nameHr: "Zagreb", isDefault: true }],
      paymentMethods: [{ number: 1, nameHr: "Virman", isDefault: true }],
    });
  });
});

describe("POST /api/companies", () => {
  it("creates a Company without initial Locations or Payment Methods", async () => {
    const response = await createCompanyRoute(apiContext({
      request: new Request("http://test.local/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(COMPANY_INPUT),
      }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      name: "Firefly One d.o.o.",
      locations: [],
      paymentMethods: [],
    });
  });

  it("ignores setup defaults during validation", async () => {
    const response = await createCompanyRoute(apiContext({
      request: new Request("http://test.local/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...COMPANY_INPUT,
          oib: "99999999999",
          locations: [{ number: 1, nameHr: "Zagreb", isDefault: false }],
          paymentMethods: [{ number: 1, nameHr: "Transakcijski", isDefault: true }],
        }),
      }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      name: "Firefly One d.o.o.",
      locations: [],
      paymentMethods: [],
    });
  });
});
