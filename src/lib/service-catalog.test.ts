import { describe, expect, it } from "vitest";
import { createCatalogEntry, deleteCatalogEntry, getCatalogEntry, listCatalogEntries, updateCatalogEntry } from "@/lib/service-catalog";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

describe("service catalog", () => {
  it("creates and retrieves a catalog entry", async () => {
    const entry = await createCatalogEntry({
      descriptionHr: "Konzultacije za {month}/{year}",
      descriptionEn: "Consulting for {month}/{year}",
    });

    expect(entry.id).toBeTypeOf("number");
    expect(entry.descriptionHr).toBe("Konzultacije za {month}/{year}");
    expect(entry.descriptionEn).toBe("Consulting for {month}/{year}");

    const fetched = await getCatalogEntry(entry.id);
    expect(fetched).toEqual(entry);
  });

  it("lists all entries ordered by description_hr", async () => {
    await createCatalogEntry({ descriptionHr: "Održavanje", descriptionEn: "Maintenance" });
    await createCatalogEntry({ descriptionHr: "Dizajn", descriptionEn: "Design" });

    const entries = await listCatalogEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.descriptionHr).toBe("Dizajn");
    expect(entries[1]!.descriptionHr).toBe("Održavanje");
  });

  it("filters entries by search term across both descriptions", async () => {
    await createCatalogEntry({ descriptionHr: "Konzultacije", descriptionEn: "Consulting" });
    await createCatalogEntry({ descriptionHr: "Dizajn", descriptionEn: "Design" });

    const byHr = await listCatalogEntries({ search: "konz" });
    expect(byHr).toHaveLength(1);
    expect(byHr[0]!.descriptionHr).toBe("Konzultacije");

    const byEn = await listCatalogEntries({ search: "design" });
    expect(byEn).toHaveLength(1);
    expect(byEn[0]!.descriptionEn).toBe("Design");
  });

  it("updates a catalog entry", async () => {
    const entry = await createCatalogEntry({
      descriptionHr: "Stari opis",
      descriptionEn: "Old description",
    });

    const updated = await updateCatalogEntry(entry.id, {
      descriptionHr: "Novi opis",
    });

    expect(updated.descriptionHr).toBe("Novi opis");
    expect(updated.descriptionEn).toBe("Old description");
  });

  it("throws not found when updating non-existent entry", async () => {
    await expect(
      updateCatalogEntry(99999, { descriptionHr: "test" }),
    ).rejects.toThrow("not found");
  });

  it("deletes a catalog entry", async () => {
    const entry = await createCatalogEntry({ descriptionHr: "Za brisanje" });
    await deleteCatalogEntry(entry.id);

    const fetched = await getCatalogEntry(entry.id);
    expect(fetched).toBeNull();
  });

  it("throws not found when deleting non-existent entry", async () => {
    await expect(deleteCatalogEntry(99999)).rejects.toThrow("not found");
  });
});
