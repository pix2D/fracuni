import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("service_catalog")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("description_hr", "text", (col) => col.notNull())
    .addColumn("description_en", "text")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("service_catalog").execute();
}
