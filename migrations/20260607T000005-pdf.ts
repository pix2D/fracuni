import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Generated at finalization (and regenerated on a Finalized edit). Domestic
  // documents produce only the Croatian PDF, so the _en columns stay null;
  // foreign documents fill both. The hash is the SHA-256 of the stored file,
  // kept for tamper-evidence / bookkeeper handoff. Paths are relative to the
  // data directory (e.g. "pdfs/firefly-one/2026/06/1-1-1-acme.pdf").
  await db.schema.alterTable("invoices").addColumn("pdf_path_hr", "text").execute();
  await db.schema.alterTable("invoices").addColumn("pdf_hash_hr", "text").execute();
  await db.schema.alterTable("invoices").addColumn("pdf_path_en", "text").execute();
  await db.schema.alterTable("invoices").addColumn("pdf_hash_en", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("invoices").dropColumn("pdf_hash_en").execute();
  await db.schema.alterTable("invoices").dropColumn("pdf_path_en").execute();
  await db.schema.alterTable("invoices").dropColumn("pdf_hash_hr").execute();
  await db.schema.alterTable("invoices").dropColumn("pdf_path_hr").execute();
}
