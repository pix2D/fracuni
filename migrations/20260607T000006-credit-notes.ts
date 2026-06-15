import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // A Credit Note created from an existing Invoice records that Invoice's
  // Document Number so the refund is traceable to the original (User Story 32).
  // A snapshot of the text is enough: the source is Finalized, so its Document
  // Number is immutable and can never drift. Null on Invoices and on Credit
  // Notes created from scratch.
  await db.schema.alterTable("invoices").addColumn("original_invoice_number", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("invoices").dropColumn("original_invoice_number").execute();
}
