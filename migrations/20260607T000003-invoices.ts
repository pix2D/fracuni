import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("invoices")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    // Discriminator: this slice creates "invoice" only; "credit_note" shares the table later.
    .addColumn("type", "text", (col) => col.notNull().defaultTo("invoice"))
    .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
    .addColumn("company_id", "integer", (col) =>
      col.notNull().references("companies.id").onDelete("restrict"),
    )
    // Nullable for draft permissiveness — a Draft may be saved with missing fields.
    .addColumn("client_id", "integer", (col) => col.references("clients.id").onDelete("restrict"))
    .addColumn("location_id", "integer", (col) => col.references("locations.id").onDelete("restrict"))
    .addColumn("payment_method_id", "integer", (col) =>
      col.references("payment_methods.id").onDelete("restrict"),
    )
    .addColumn("currency", "text")
    .addColumn("email", "text")
    .addColumn("issue_date", "text")
    .addColumn("delivery_date", "text")
    .addColumn("due_date", "text")
    .addColumn("payment_terms_days", "integer")
    .addColumn("notes_hr", "text")
    .addColumn("notes_en", "text")
    // Assigned at finalization (later slice); always null for a Draft.
    .addColumn("document_number", "text")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
    .execute();

  await db.schema
    .createTable("line_items")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("invoice_id", "integer", (col) =>
      col.notNull().references("invoices.id").onDelete("cascade"),
    )
    // 1-based row order; recalculated from array position on every save.
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("description_hr", "text")
    .addColumn("description_en", "text")
    .addColumn("quantity", "real")
    .addColumn("unit_price", "real")
    .execute();

  await db.schema
    .createIndex("line_items_invoice_id")
    .on("line_items")
    .column("invoice_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("line_items").execute();
  await db.schema.dropTable("invoices").execute();
}
