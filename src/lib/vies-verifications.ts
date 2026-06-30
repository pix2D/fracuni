import type { Selectable } from "kysely";
import type { ViesVerifications } from "@/lib/db.generated";
import { getDb } from "@/lib/db";

type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };
type BooleanValid<T extends { valid: unknown }> = Omit<T, "valid"> & { valid: boolean };

export type ViesVerification = BooleanValid<NonNullId<Selectable<ViesVerifications>>>;

function toViesVerification(row: Selectable<ViesVerifications>): ViesVerification {
  return { ...row, id: row.id!, valid: row.valid === 1 };
}

export async function getLatestViesVerification(
  invoiceId: number,
): Promise<ViesVerification | null> {
  const row = await getDb()
    .selectFrom("viesVerifications")
    .selectAll()
    .where("invoiceId", "=", invoiceId)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc")
    .executeTakeFirst();

  return row ? toViesVerification(row) : null;
}
