import { type Kysely } from "kysely";

// Offers reuse the `invoices` table (discriminated by type='offer'): they share
// the line-item, totals and PDF machinery. They differ in two ways this
// migration provides for:
//
//  1. Numbering. Offers number simply per (Company, calendar year) — NOT per
//     Payment Method like Invoices/Credit Notes — so they get their own
//     sequence table rather than sharing document_number_sequences.
//  2. Validity. The "Vrijedi do" date cascades Settings → Client → manual. The
//     final valid-until date is stored in due_date, just like Invoices store their
//     final due date; validity days remain form/defaulting state only.
//
// Column reuse on `invoices` for an offer row: issue_date = offer date,
// due_date = valid-until, delivery_date and exchange-rate fields stay null.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("clients")
    .addColumn("default_offer_validity_days", "integer")
    .execute();

  // One counter per (Company, calendar year). Atomic upsert
  // (INSERT … ON CONFLICT DO UPDATE last_value = last_value + 1) seeds at 1 or
  // increments, guaranteeing gap-free, duplicate-free assignment. The sequence
  // resets each year because the year is part of the key.
  await db.schema
    .createTable("offer_number_sequences")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("company_id", "integer", (col) =>
      col.notNull().references("companies.id").onDelete("cascade"),
    )
    .addColumn("year", "integer", (col) => col.notNull())
    .addColumn("last_value", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("offer_number_sequences_key_unique")
    .on("offer_number_sequences")
    .columns(["company_id", "year"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("offer_number_sequences").execute();
  await db.schema.alterTable("clients").dropColumn("default_offer_validity_days").execute();
}
