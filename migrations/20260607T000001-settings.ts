import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("settings")
    .addColumn("id", "integer", (col) => col.primaryKey())
    .addColumn("default_vat_rate", "real", (col) => col.notNull().defaultTo(25.0))
    .addColumn("supported_currencies", "text", (col) =>
      col.notNull().defaultTo('["EUR","USD","CZK","DKK","HUF","ISK","NOK","PLN","RON","SEK"]'),
    )
    .addColumn("default_payment_terms_days", "integer", (col) => col.notNull().defaultTo(15))
    .addColumn("default_offer_validity_days", "integer", (col) => col.notNull().defaultTo(30))
    .addColumn("postmark_api_key", "text")
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("settings").execute();
}
