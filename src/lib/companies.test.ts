import { describe, it, expect } from "vitest";
import {
  upsertCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  createLocation,
  updateLocation,
  deleteLocation,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { getDb } from "@/lib/db";
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
  emailSubjectTemplate: "Račun {broj}",
  emailBodyTemplate: "Poštovani, u prilogu šaljemo račun.",
  defaultPaymentTermsDays: 15,
  issuerName: "Marko Marković",
};

describe("company profile", () => {
  it("creates a company profile and retrieves it", async () => {
    const created = await upsertCompanyProfile(COMPANY_INPUT);

    expect(created.id).toBeTypeOf("number");
    expect(created.name).toBe("Orion Test Works d.o.o.");

    const fetched = await getCompanyProfile();
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Orion Test Works d.o.o.");
    expect(fetched!.address).toBe("Ilica 1, 10000 Zagreb");
    expect(fetched!.oib).toBe("12345678901");
    expect(fetched!.iban).toBe("HR1234567890123456789");
    expect(fetched!.swift).toBe("ZABAHR2X");
    expect(fetched!.emailSubjectTemplate).toBe("Račun {broj}");
    expect(fetched!.legalTextServiceEuB2bWithoutVatIdEn).toBe("EU B2B without VAT ID text...");
    expect(fetched!.defaultPaymentTermsDays).toBe(15);
    expect(fetched!.issuerName).toBe("Marko Marković");
  });

  it("creates a company profile with no Locations or Payment Methods", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);

    const fetched = await getCompanyProfile();
    expect(fetched).toMatchObject({
      name: "Orion Test Works d.o.o.",
      locations: [],
      paymentMethods: [],
    });
  });

  it("upserts the singleton company profile", async () => {
    const first = await upsertCompanyProfile(COMPANY_INPUT);
    const second = await upsertCompanyProfile({
      ...COMPANY_INPUT,
      name: "Updated Orion Test Works d.o.o.",
      defaultPaymentTermsDays: 30,
    });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Updated Orion Test Works d.o.o.");
    expect(second.defaultPaymentTermsDays).toBe(30);
  });

  it("enforces a single company profile row in the database", async () => {
    await expect(
      getDb()
        .insertInto("companyProfile")
        .values({ ...COMPANY_INPUT, id: 2, oib: "99999999999" })
        .execute(),
    ).rejects.toThrow();
  });

  it("updates the company profile", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    const updated = await updateCompanyProfile({ name: "New Name d.o.o.", defaultPaymentTermsDays: 30 });

    expect(updated.name).toBe("New Name d.o.o.");
    expect(updated.defaultPaymentTermsDays).toBe(30);
    expect(updated.address).toBe("Ilica 1, 10000 Zagreb");
  });
});

describe("locations", () => {
  it("first location auto-becomes default", async () => {
    const loc = await createLocation({ number: 1, nameHr: "Zagreb" });

    expect(loc.isDefault).toBe(true);
  });

  it("setting a new default unsets the old one", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    await createLocation({ number: 1, nameHr: "Zagreb" });
    const loc2 = await createLocation({ number: 2, nameHr: "Split", isDefault: true });

    expect(loc2.isDefault).toBe(true);

    const fetched = await getCompanyProfile();
    const defaultLocs = fetched!.locations.filter((l) => l.isDefault);
    expect(defaultLocs).toHaveLength(1);
    expect(defaultLocs[0]!.id).toBe(loc2.id);
  });

  it("cannot delete the only location", async () => {
    const loc = await createLocation({ number: 1, nameHr: "Zagreb" });

    await expect(deleteLocation(loc.id)).rejects.toThrow("Cannot delete the only location");
  });

  it("deleting the default promotes another location", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    const loc1 = await createLocation({ number: 1, nameHr: "Zagreb" });
    await createLocation({ number: 2, nameHr: "Split" });

    await deleteLocation(loc1.id);

    const fetched = await getCompanyProfile();
    expect(fetched!.locations).toHaveLength(1);
    expect(fetched!.locations[0]!.isDefault).toBe(true);
  });

  it("updates a location", async () => {
    const loc = await createLocation({ number: 1, nameHr: "Zagreb", nameEn: "Zagreb" });

    const updated = await updateLocation(loc.id, { nameHr: "Novi Zagreb", nameEn: "New Zagreb" });
    expect(updated.nameHr).toBe("Novi Zagreb");
    expect(updated.nameEn).toBe("New Zagreb");
  });

  it("cannot unset the default location directly", async () => {
    const loc = await createLocation({ number: 1, nameHr: "Zagreb" });

    await expect(updateLocation(loc.id, { isDefault: false })).rejects.toThrow(
      "Cannot unset the default location",
    );
  });
});

describe("payment methods", () => {
  it("first payment method auto-becomes default", async () => {
    const pm = await createPaymentMethod({ number: 1, nameHr: "Virman" });

    expect(pm.isDefault).toBe(true);
  });

  it("setting a new default unsets the old one", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    await createPaymentMethod({ number: 1, nameHr: "Virman" });
    const pm2 = await createPaymentMethod({ number: 2, nameHr: "Transakcijski", isDefault: true });

    const fetched = await getCompanyProfile();
    const defaults = fetched!.paymentMethods.filter((p) => p.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.id).toBe(pm2.id);
  });

  it("cannot delete the only payment method", async () => {
    const pm = await createPaymentMethod({ number: 1, nameHr: "Virman" });

    await expect(deletePaymentMethod(pm.id)).rejects.toThrow("Cannot delete the only payment method");
  });

  it("deleting the default promotes another payment method", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    const pm1 = await createPaymentMethod({ number: 1, nameHr: "Virman" });
    await createPaymentMethod({ number: 2, nameHr: "Gotovina" });

    await deletePaymentMethod(pm1.id);

    const fetched = await getCompanyProfile();
    expect(fetched!.paymentMethods).toHaveLength(1);
    expect(fetched!.paymentMethods[0]!.isDefault).toBe(true);
  });

  it("cannot unset the default payment method directly", async () => {
    const pm = await createPaymentMethod({ number: 1, nameHr: "Virman" });

    await expect(updatePaymentMethod(pm.id, { isDefault: false })).rejects.toThrow(
      "Cannot unset the default payment method",
    );
  });
});
