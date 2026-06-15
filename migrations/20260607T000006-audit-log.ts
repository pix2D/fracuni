import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Append-only trail of post-finalization edits. A Finalized document remains
  // editable until it is Sent; every such edit writes one row here describing
  // what changed, so the document's history is auditable for the tax office.
  // Drafts and the Sent/Paid transitions are intentionally not logged here —
  // this table is scoped to "changes to a legal document".
  await db.schema
    .createTable("audit_log")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("invoice_id", "integer", (col) =>
      col.notNull().references("invoices.id").onDelete("cascade"),
    )
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("audit_log_invoice_id")
    .on("audit_log")
    .column("invoice_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("audit_log").execute();
}
