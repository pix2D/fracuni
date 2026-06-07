import { getDb } from "@/lib/db";
import type { Selectable } from "kysely";
import { sql } from "kysely";
import type { ServiceCatalog } from "@/lib/db.generated";
import { notFound } from "@/lib/app-errors";

type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

export type CatalogEntry = NonNullId<Selectable<ServiceCatalog>>;

export type CatalogEntryInput = {
  descriptionHr: string;
  descriptionEn?: string | null;
};

function toEntry(row: Selectable<ServiceCatalog>): CatalogEntry {
  return { ...row, id: row.id! };
}

export async function createCatalogEntry(input: CatalogEntryInput): Promise<CatalogEntry> {
  const db = getDb();
  const row = await db
    .insertInto("serviceCatalog")
    .values({
      descriptionHr: input.descriptionHr,
      descriptionEn: input.descriptionEn ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return toEntry(row);
}

export interface ListCatalogOptions {
  search?: string;
}

export async function listCatalogEntries(opts: ListCatalogOptions = {}): Promise<CatalogEntry[]> {
  const db = getDb();
  let query = db.selectFrom("serviceCatalog").selectAll().orderBy("descriptionHr");

  if (opts.search) {
    const term = `%${opts.search}%`;
    query = query.where((eb) =>
      eb.or([
        eb("descriptionHr", "like", term),
        eb("descriptionEn", "like", term),
      ]),
    );
  }

  const rows = await query.execute();
  return rows.map(toEntry);
}

export async function getCatalogEntry(id: number): Promise<CatalogEntry | null> {
  const db = getDb();
  const row = await db
    .selectFrom("serviceCatalog")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
  return row ? toEntry(row) : null;
}

export async function updateCatalogEntry(id: number, input: Partial<CatalogEntryInput>): Promise<CatalogEntry> {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: sql`datetime('now')` };
  if (input.descriptionHr !== undefined) updates.descriptionHr = input.descriptionHr;
  if (input.descriptionEn !== undefined) updates.descriptionEn = input.descriptionEn;

  const row = await db
    .updateTable("serviceCatalog")
    .set(updates)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();

  if (!row) throw notFound("Catalog entry not found");
  return toEntry(row);
}

export async function deleteCatalogEntry(id: number): Promise<void> {
  const db = getDb();
  const result = await db.deleteFrom("serviceCatalog").where("id", "=", id).executeTakeFirst();
  if (result.numDeletedRows === 0n) throw notFound("Catalog entry not found");
}
