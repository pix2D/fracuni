import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("companies")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("address", "text", (col) => col.notNull())
    .addColumn("phone", "text", (col) => col.notNull())
    .addColumn("oib", "text", (col) => col.notNull().unique())
    .addColumn("logo_path", "text")
    .addColumn("tagline_hr", "text")
    .addColumn("tagline_en", "text")
    .addColumn("iban", "text", (col) => col.notNull())
    .addColumn("swift", "text", (col) => col.notNull())
    .addColumn("legal_text_domestic", "text")
    .addColumn("legal_text_foreign_hr", "text")
    .addColumn("legal_text_foreign_en", "text")
    .addColumn("email_from_address", "text", (col) => col.notNull())
    .addColumn("email_from_name", "text", (col) => col.notNull())
    .addColumn("email_subject_template", "text")
    .addColumn("email_body_template", "text")
    .addColumn("default_payment_terms_days", "integer", (col) => col.notNull().defaultTo(15))
    .addColumn("issuer_name", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createTable("locations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("company_id", "integer", (col) => col.notNull().references("companies.id").onDelete("cascade"))
    .addColumn("number", "integer", (col) => col.notNull())
    .addColumn("name_hr", "text", (col) => col.notNull())
    .addColumn("name_en", "text")
    .addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("locations_company_number_unique")
    .on("locations")
    .columns(["company_id", "number"])
    .unique()
    .execute();

  await db.schema
    .createTable("payment_methods")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("company_id", "integer", (col) => col.notNull().references("companies.id").onDelete("cascade"))
    .addColumn("number", "integer", (col) => col.notNull())
    .addColumn("name_hr", "text", (col) => col.notNull())
    .addColumn("name_en", "text")
    .addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("payment_methods_company_number_unique")
    .on("payment_methods")
    .columns(["company_id", "number"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("payment_methods").execute();
  await db.schema.dropTable("locations").execute();
  await db.schema.dropTable("companies").execute();
}
