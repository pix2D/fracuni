import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("clients")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "text", (col) => col.notNull())
    // Frozen literals; runtime SSOT is CLIENT_TYPE in @/lib/client-types.
    .addColumn("client_type", "text", (col) => col.notNull().defaultTo("business"))
    .addColumn("country", "text", (col) => col.notNull())
    .addColumn("address", "text")
    .addColumn("oib", "text", (col) => col.unique())
    .addColumn("vat_number", "text")
    .addColumn("default_currency", "text")
    .addColumn("default_payment_terms_days", "integer")
    .addColumn("email", "text")
    .addColumn("archived_at", "text")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createTable("client_tax_ids")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("client_id", "integer", (col) => col.notNull().references("clients.id").onDelete("cascade"))
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("value", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("client_tax_ids").execute();
  await db.schema.dropTable("clients").execute();
}
