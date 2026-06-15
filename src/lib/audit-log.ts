import { getDb } from "@/lib/db";
import type { Selectable, Transaction } from "kysely";
import type { AuditLog, DB } from "@/lib/db.generated";

// SQLite introspection reports autoincrement PKs as nullable; they never are after insert/select.
type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

export type AuditLogEntry = NonNullId<Selectable<AuditLog>>;

/**
 * Append an audit entry for a document edit. Takes a transaction so the entry is
 * written atomically with the change it describes — an edit and its log line
 * commit or roll back together.
 */
export async function recordAuditEntry(
  trx: Transaction<DB>,
  invoiceId: number,
  description: string,
): Promise<void> {
  await trx.insertInto("auditLog").values({ invoiceId, description }).execute();
}

/** Audit trail for one document, newest first. */
export async function listAuditEntries(invoiceId: number): Promise<AuditLogEntry[]> {
  const rows = await getDb()
    .selectFrom("auditLog")
    .selectAll()
    .where("invoiceId", "=", invoiceId)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc")
    .execute();
  return rows.map((row) => ({ ...row, id: row.id! }));
}
