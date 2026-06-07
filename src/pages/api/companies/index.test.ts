import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";
import { configureDb, getDb, resetDb } from "@/lib/db";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { GET as getCompanies } from "@/pages/api/companies/index";

async function runMigrations() {
  const db = getDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve("migrations"),
    }),
  });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}

beforeEach(async () => {
  await resetDb();
  configureDb(":memory:");
  await runMigrations();
});

afterEach(async () => {
  await resetDb();
});

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

    const response = await getCompanies({} as unknown as Parameters<typeof getCompanies>[0]);

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
