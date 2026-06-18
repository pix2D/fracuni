import { describe, it, expect } from "vitest";
import {
  createCompany,
  createCompanyWithSetup,
  getCompany,
  listCompanies,
  updateCompany,
  deleteCompany,
  createLocation,
  updateLocation,
  deleteLocation,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
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

describe("companies", () => {
  it("creates a company and retrieves it by id", async () => {
    const created = await createCompany(COMPANY_INPUT);

    expect(created.id).toBeTypeOf("number");
    expect(created.name).toBe("Firefly One d.o.o.");

    const fetched = await getCompany(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Firefly One d.o.o.");
    expect(fetched!.address).toBe("Ilica 1, 10000 Zagreb");
    expect(fetched!.oib).toBe("12345678901");
    expect(fetched!.iban).toBe("HR1234567890123456789");
    expect(fetched!.swift).toBe("ZABAHR2X");
    expect(fetched!.emailSubjectTemplate).toBe("Račun {broj}");
    expect(fetched!.defaultPaymentTermsDays).toBe(15);
    expect(fetched!.issuerName).toBe("Marko Marković");
  });

  it("creates a company with initial Locations and Payment Methods atomically", async () => {
    const created = await createCompanyWithSetup({
      ...COMPANY_INPUT,
      defaultPaymentTermsDays: 15,
      locations: [
        { number: 1, nameHr: "Zagreb", nameEn: "Zagreb", isDefault: true },
        { number: 2, nameHr: "Split", nameEn: "Split", isDefault: false },
      ],
      paymentMethods: [
        { number: 1, nameHr: "Transakcijski", nameEn: "Bank transfer", isDefault: true },
      ],
    });

    expect(created.name).toBe("Firefly One d.o.o.");
    expect(created.locations).toMatchObject([
      { number: 1, nameHr: "Zagreb", isDefault: true },
      { number: 2, nameHr: "Split", isDefault: false },
    ]);
    expect(created.paymentMethods).toMatchObject([
      { number: 1, nameHr: "Transakcijski", isDefault: true },
    ]);
  });

  it("lists companies ordered by name", async () => {
    await createCompany({ ...COMPANY_INPUT, name: "Zebra d.o.o.", oib: "11111111111" });
    await createCompany({ ...COMPANY_INPUT, name: "Alpha d.o.o.", oib: "22222222222" });

    const list = await listCompanies();
    expect(list).toHaveLength(2);
    expect(list[0]!.name).toBe("Alpha d.o.o.");
    expect(list[1]!.name).toBe("Zebra d.o.o.");
  });

  it("throws a typed conflict error for duplicate Company OIB", async () => {
    await createCompany(COMPANY_INPUT);

    await expect(createCompany(COMPANY_INPUT)).rejects.toMatchObject({
      code: "conflict",
      message: "A company with this OIB already exists",
      status: 409,
    });
  });

  it("updates a company", async () => {
    const created = await createCompany(COMPANY_INPUT);
    const updated = await updateCompany(created.id, { name: "New Name d.o.o.", defaultPaymentTermsDays: 30 });

    expect(updated.name).toBe("New Name d.o.o.");
    expect(updated.defaultPaymentTermsDays).toBe(30);
    expect(updated.address).toBe("Ilica 1, 10000 Zagreb");
  });

  it("deletes a company with no document references", async () => {
    const created = await createCompany(COMPANY_INPUT);
    await deleteCompany(created.id);

    const fetched = await getCompany(created.id);
    expect(fetched).toBeNull();
  });
});

describe("locations", () => {
  it("first location auto-becomes default", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const loc = await createLocation(company.id, { number: 1, nameHr: "Zagreb" });

    expect(loc.isDefault).toBe(true);
    expect(loc.companyId).toBe(company.id);
  });

  it("setting a new default unsets the old one", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await createLocation(company.id, { number: 1, nameHr: "Zagreb" });
    const loc2 = await createLocation(company.id, { number: 2, nameHr: "Split", isDefault: true });

    expect(loc2.isDefault).toBe(true);

    const fetched = await getCompany(company.id);
    const defaultLocs = fetched!.locations.filter((l) => l.isDefault);
    expect(defaultLocs).toHaveLength(1);
    expect(defaultLocs[0]!.id).toBe(loc2.id);
  });

  it("cannot delete the only location", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const loc = await createLocation(company.id, { number: 1, nameHr: "Zagreb" });

    await expect(deleteLocation(loc.id)).rejects.toThrow("Cannot delete the only location");
  });

  it("deleting the default promotes another location", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const loc1 = await createLocation(company.id, { number: 1, nameHr: "Zagreb" });
    await createLocation(company.id, { number: 2, nameHr: "Split" });

    await deleteLocation(loc1.id);

    const fetched = await getCompany(company.id);
    expect(fetched!.locations).toHaveLength(1);
    expect(fetched!.locations[0]!.isDefault).toBe(true);
  });

  it("updates a location", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const loc = await createLocation(company.id, { number: 1, nameHr: "Zagreb", nameEn: "Zagreb" });

    const updated = await updateLocation(loc.id, { nameHr: "Novi Zagreb", nameEn: "New Zagreb" });
    expect(updated.nameHr).toBe("Novi Zagreb");
    expect(updated.nameEn).toBe("New Zagreb");
  });

  it("cannot unset the default location directly", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const loc = await createLocation(company.id, { number: 1, nameHr: "Zagreb" });

    await expect(updateLocation(loc.id, { isDefault: false })).rejects.toThrow(
      "Cannot unset the default location",
    );
  });
});

describe("payment methods", () => {
  it("first payment method auto-becomes default", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const pm = await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });

    expect(pm.isDefault).toBe(true);
    expect(pm.companyId).toBe(company.id);
  });

  it("setting a new default unsets the old one", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });
    const pm2 = await createPaymentMethod(company.id, { number: 2, nameHr: "Transakcijski", isDefault: true });

    const fetched = await getCompany(company.id);
    const defaults = fetched!.paymentMethods.filter((p) => p.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.id).toBe(pm2.id);
  });

  it("cannot delete the only payment method", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const pm = await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });

    await expect(deletePaymentMethod(pm.id)).rejects.toThrow("Cannot delete the only payment method");
  });

  it("deleting the default promotes another payment method", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const pm1 = await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });
    await createPaymentMethod(company.id, { number: 2, nameHr: "Gotovina" });

    await deletePaymentMethod(pm1.id);

    const fetched = await getCompany(company.id);
    expect(fetched!.paymentMethods).toHaveLength(1);
    expect(fetched!.paymentMethods[0]!.isDefault).toBe(true);
  });

  it("cannot unset the default payment method directly", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const pm = await createPaymentMethod(company.id, { number: 1, nameHr: "Virman" });

    await expect(updatePaymentMethod(pm.id, { isDefault: false })).rejects.toThrow(
      "Cannot unset the default payment method",
    );
  });
});
