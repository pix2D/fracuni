import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // One row per send attempt (successful or failed) for an Invoice / Credit Note.
  // postmark_message_id is null on failure; status records "sent" or "error", and
  // error_message keeps the Postmark failure reason for the audit trail. The
  // recipient and subject are stored as actually sent (after per-send overrides).
  await db.schema
    .createTable("email_logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("invoice_id", "integer", (col) =>
      col.notNull().references("invoices.id").onDelete("cascade"),
    )
    .addColumn("recipient", "text", (col) => col.notNull())
    .addColumn("subject", "text", (col) => col.notNull())
    .addColumn("postmark_message_id", "text")
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("error_message", "text")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createIndex("email_logs_invoice_id")
    .on("email_logs")
    .column("invoice_id")
    .execute();

  // Recorded when a Sent Invoice is marked Paid. Null until then.
  await db.schema.alterTable("invoices").addColumn("payment_date", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("invoices").dropColumn("payment_date").execute();
  await db.schema.dropTable("email_logs").execute();
}
