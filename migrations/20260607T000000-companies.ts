import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("company_profile")
    .addColumn("id", "integer", (col) => col.primaryKey().defaultTo(1).check(sql`id = 1`))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("address", "text", (col) => col.notNull())
    .addColumn("phone", "text", (col) => col.notNull())
    .addColumn("oib", "text", (col) => col.notNull().unique())
    .addColumn("logo_path", "text")
    .addColumn("tagline_hr", "text")
    .addColumn("tagline_en", "text")
    .addColumn("iban", "text", (col) => col.notNull())
    .addColumn("swift", "text", (col) => col.notNull())
    .addColumn("legal_text_service_domestic_hr", "text")
    .addColumn("legal_text_service_eu_b2c_hr", "text")
    .addColumn("legal_text_service_eu_b2c_en", "text")
    .addColumn("legal_text_service_eu_b2b_reverse_charge_hr", "text")
    .addColumn("legal_text_service_eu_b2b_reverse_charge_en", "text")
    .addColumn("legal_text_service_eu_b2b_without_vat_id_hr", "text")
    .addColumn("legal_text_service_eu_b2b_without_vat_id_en", "text")
    .addColumn("legal_text_service_non_eu_b2c_hr", "text")
    .addColumn("legal_text_service_non_eu_b2c_en", "text")
    .addColumn("legal_text_service_non_eu_b2b_hr", "text")
    .addColumn("legal_text_service_non_eu_b2b_en", "text")
    .addColumn("email_from_address", "text", (col) => col.notNull())
    .addColumn("email_from_name", "text", (col) => col.notNull())
    .addColumn("email_subject_template", "text")
    .addColumn("email_body_template", "text")
    // Frozen literal; runtime SSOT is DEFAULT_PAYMENT_TERMS_DAYS in @/lib/defaults.
    .addColumn("default_payment_terms_days", "integer", (col) => col.notNull().defaultTo(15))
    .addColumn("issuer_name", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createTable("locations")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("number", "integer", (col) => col.notNull())
    .addColumn("name_hr", "text", (col) => col.notNull())
    .addColumn("name_en", "text")
    .addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("locations_number_unique")
    .on("locations")
    .column("number")
    .unique()
    .execute();

  await db.schema
    .createTable("payment_methods")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("number", "integer", (col) => col.notNull())
    .addColumn("name_hr", "text", (col) => col.notNull())
    .addColumn("name_en", "text")
    .addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("payment_methods_number_unique")
    .on("payment_methods")
    .column("number")
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("payment_methods").execute();
  await db.schema.dropTable("locations").execute();
  await db.schema.dropTable("company_profile").execute();
}
