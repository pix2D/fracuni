import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";
import { configureDb, getDb, resetDb } from "@/lib/db";
import { createCompany, updateCompany } from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { GET as getLogo } from "@/pages/api/companies/[id]/logo";

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
  await fs.rm(path.resolve("data/logos"), { recursive: true, force: true });
  await resetDb();
});

const COMPANY_INPUT: CompanyInput = {
  name: "Firefly One d.o.o.",
  address: "Ilica 1, 10000 Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  taglineHr: null,
  taglineEn: null,
  iban: "HR1234567890123456789",
  swift: "ZABAHR2X",
  legalTextDomestic: null,
  legalTextForeignHr: null,
  legalTextForeignEn: null,
  emailFromAddress: "info@firefly.hr",
  emailFromName: "Firefly One",
  emailSubjectTemplate: null,
  emailBodyTemplate: null,
  defaultPaymentTermsDays: 15,
  issuerName: "Marko Marković",
};

describe("GET /api/companies/:id/logo", () => {
  it("serves the Company's stored logo from the data directory", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await fs.mkdir(path.resolve("data/logos"), { recursive: true });
    await fs.writeFile(path.resolve("data/logos/1.png"), Buffer.from([1, 2, 3]));
    await updateCompany(company.id, { logoPath: "logos/1.png" });

    const response = await getLogo({
      params: { id: String(company.id) },
    } as unknown as Parameters<typeof getLogo>[0]);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("does not serve paths outside the data directory", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await updateCompany(company.id, { logoPath: "../outside.png" });

    const response = await getLogo({
      params: { id: String(company.id) },
    } as unknown as Parameters<typeof getLogo>[0]);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Logo not found",
    });
  });
});
