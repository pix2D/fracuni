import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("holidays_cache")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("year", "integer", (col) => col.notNull())
    .addColumn("date", "text", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("fetched_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("holidays_cache_year_idx")
    .on("holidays_cache")
    .column("year")
    .execute();

  await db.schema
    .createIndex("holidays_cache_year_date_unique")
    .on("holidays_cache")
    .columns(["year", "date"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("holidays_cache").execute();
}
