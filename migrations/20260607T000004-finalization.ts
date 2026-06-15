import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Captured at finalization (non-EUR invoices only). The source currency is the
  // invoice's own currency; we store the rate and the HNB effective date so the
  // tax-relevant conversion is auditable. Null on EUR / Draft invoices.
  await db.schema
    .alterTable("invoices")
    .addColumn("exchange_rate", "real")
    .execute();
  await db.schema
    .alterTable("invoices")
    .addColumn("exchange_rate_date", "text")
    .execute();

  // Full VIES proof for the tax office: stored verbatim at finalization for
  // foreign clients with a VAT Number. raw_response keeps the entire payload.
  await db.schema
    .createTable("vies_verifications")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("invoice_id", "integer", (col) =>
      col.notNull().references("invoices.id").onDelete("cascade"),
    )
    .addColumn("country_code", "text", (col) => col.notNull())
    .addColumn("vat_number", "text", (col) => col.notNull())
    // SQLite has no boolean — 0/1. Converted at the boundary.
    .addColumn("valid", "integer", (col) => col.notNull())
    .addColumn("request_date", "text")
    .addColumn("name", "text")
    .addColumn("address", "text")
    .addColumn("raw_response", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("vies_verifications_invoice_id")
    .on("vies_verifications")
    .column("invoice_id")
    .execute();

  // One sequence counter per (Company, calendar year, Payment Method). The
  // Document Number's first segment is drawn from last_value. Invoices and
  // Credit Notes share a row (no document-type column), so they advance the
  // same sequence. The UNIQUE constraint plus an atomic upsert
  // (INSERT … ON CONFLICT DO UPDATE last_value = last_value + 1) guarantees
  // gap-free, duplicate-free assignment.
  await db.schema
    .createTable("document_number_sequences")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("company_id", "integer", (col) =>
      col.notNull().references("companies.id").onDelete("cascade"),
    )
    .addColumn("year", "integer", (col) => col.notNull())
    .addColumn("payment_method_id", "integer", (col) =>
      col.notNull().references("payment_methods.id").onDelete("restrict"),
    )
    .addColumn("last_value", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("document_number_sequences_key_unique")
    .on("document_number_sequences")
    .columns(["company_id", "year", "payment_method_id"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("document_number_sequences").execute();
  await db.schema.dropTable("vies_verifications").execute();
  await db.schema.alterTable("invoices").dropColumn("exchange_rate_date").execute();
  await db.schema.alterTable("invoices").dropColumn("exchange_rate").execute();
}
