import { getDb } from "@/lib/db";
import type { Selectable, Transaction } from "kysely";
import { sql } from "kysely";
import type { DB, Invoices, LineItems } from "@/lib/db.generated";
import { invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { DocumentType, InvoiceStatus } from "@/lib/documents";

export type { DocumentType, InvoiceStatus };

// SQLite introspection reports autoincrement PKs as nullable; they never are after insert/select.
type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

export type LineItem = NonNullId<Selectable<LineItems>>;

export type LineItemInput = {
  descriptionHr?: string | null;
  descriptionEn?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
};

export interface Invoice extends NonNullId<Selectable<Invoices>> {
  lineItems: LineItem[];
}

export type InvoiceInput = {
  type?: DocumentType;
  companyId: number;
  clientId?: number | null;
  locationId?: number | null;
  paymentMethodId?: number | null;
  currency?: string | null;
  email?: string | null;
  issueDate?: string | null;
  deliveryDate?: string | null;
  dueDate?: string | null;
  notesHr?: string | null;
  notesEn?: string | null;
  // Set only on a Credit Note created from an existing Invoice; the source
  // Invoice's (immutable) Document Number. Never changes once written.
  originalInvoiceNumber?: string | null;
  lineItems?: LineItemInput[];
};

function toLineItem(row: Selectable<LineItems>): LineItem {
  return { ...row, id: row.id! };
}

function toInvoice(row: Selectable<Invoices>, lineItemRows: Selectable<LineItems>[]): Invoice {
  return {
    ...row,
    id: row.id!,
    lineItems: lineItemRows.map(toLineItem),
  };
}

function isSqliteError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function mapForeignKeyError(error: unknown): never {
  if (isSqliteError(error, "SQLITE_CONSTRAINT_FOREIGNKEY")) {
    throw invalidRequest("Referenced company, client, location, or payment method does not exist");
  }
  throw error;
}

function positiveMagnitude(value: number | null | undefined): number | null | undefined {
  return value == null ? value : Math.abs(value);
}

function negativeMagnitude(value: number | null | undefined): number | null | undefined {
  if (value == null) return value;
  const magnitude = Math.abs(value);
  return magnitude === 0 ? 0 : -magnitude;
}

function normalizeLineItem(type: DocumentType, item: LineItemInput): LineItemInput {
  if (type !== DOCUMENT_TYPE.CREDIT_NOTE) return item;
  return {
    ...item,
    quantity: positiveMagnitude(item.quantity),
    unitPrice: negativeMagnitude(item.unitPrice),
  };
}

async function insertLineItems(
  trx: Transaction<DB>,
  invoiceId: number,
  lineItems: LineItemInput[],
  type: DocumentType,
): Promise<void> {
  if (lineItems.length === 0) return;
  await trx
    .insertInto("lineItems")
    .values(
      lineItems.map((input, index) => {
        const item = normalizeLineItem(type, input);
        return {
          invoiceId,
          position: index + 1,
          descriptionHr: item.descriptionHr ?? null,
          descriptionEn: item.descriptionEn ?? null,
          quantity: item.quantity ?? null,
          unitPrice: item.unitPrice ?? null,
        };
      }),
    )
    .execute();
}

async function loadLineItems(
  db: Transaction<DB> | ReturnType<typeof getDb>,
  invoiceId: number,
): Promise<Selectable<LineItems>[]> {
  return db
    .selectFrom("lineItems")
    .selectAll()
    .where("invoiceId", "=", invoiceId)
    .orderBy("position")
    .execute();
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    let row: Selectable<Invoices>;
    try {
      row = await trx
        .insertInto("invoices")
        .values({
          type: input.type ?? DOCUMENT_TYPE.INVOICE,
          status: INVOICE_STATUS.DRAFT,
          companyId: input.companyId,
          clientId: input.clientId ?? null,
          locationId: input.locationId ?? null,
          paymentMethodId: input.paymentMethodId ?? null,
          currency: input.currency ?? null,
          email: input.email ?? null,
          issueDate: input.issueDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          dueDate: input.dueDate ?? null,
          notesHr: input.notesHr ?? null,
          notesEn: input.notesEn ?? null,
          originalInvoiceNumber: input.originalInvoiceNumber ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (error: unknown) {
      mapForeignKeyError(error);
    }

    await insertLineItems(trx, row.id!, input.lineItems ?? [], row.type as DocumentType);
    const lineItemRows = await loadLineItems(trx, row.id!);
    return toInvoice(row, lineItemRows);
  });
}

export interface ListInvoicesOptions {
  companyId?: number;
  type?: DocumentType;
}

export async function listInvoices(opts: ListInvoicesOptions = {}): Promise<Invoice[]> {
  const db = getDb();

  let query = db
    .selectFrom("invoices")
    .selectAll()
    .where("type", "=", opts.type ?? DOCUMENT_TYPE.INVOICE)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc");

  if (opts.companyId !== undefined) {
    query = query.where("companyId", "=", opts.companyId);
  }

  const rows = await query.execute();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id!);
  const lineItemRows = await db
    .selectFrom("lineItems")
    .selectAll()
    .where("invoiceId", "in", ids)
    .orderBy("position")
    .execute();

  return rows.map((row) =>
    toInvoice(
      row,
      lineItemRows.filter((li) => li.invoiceId === row.id!),
    ),
  );
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const db = getDb();

  const row = await db
    .selectFrom("invoices")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) return null;

  const lineItemRows = await loadLineItems(db, id);
  return toInvoice(row, lineItemRows);
}

export async function updateInvoice(
  id: number,
  input: Partial<InvoiceInput>,
): Promise<Invoice> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom("invoices")
      .select(["status", "type"])
      .where("id", "=", id)
      .executeTakeFirst();
    if (!current) throw notFound("Invoice not found");

    // Invoices and Credit Notes become immutable once finalized. Offers share this
    // table but have their own lifecycle and are intentionally left to the offer
    // module/routes.
    if (current.type !== DOCUMENT_TYPE.OFFER && current.status !== INVOICE_STATUS.DRAFT) {
      throw invalidOperation(
        `A ${current.status} invoice is immutable and cannot be edited`,
      );
    }

    const updates: Record<string, unknown> = { updatedAt: sql`datetime('now')` };
    if (input.type !== undefined) updates.type = input.type;
    if (input.companyId !== undefined) updates.companyId = input.companyId;
    if (input.clientId !== undefined) updates.clientId = input.clientId;
    if (input.locationId !== undefined) updates.locationId = input.locationId;
    if (input.paymentMethodId !== undefined) updates.paymentMethodId = input.paymentMethodId;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.email !== undefined) updates.email = input.email;
    if (input.issueDate !== undefined) updates.issueDate = input.issueDate;
    if (input.deliveryDate !== undefined) updates.deliveryDate = input.deliveryDate;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
    if (input.notesHr !== undefined) updates.notesHr = input.notesHr;
    if (input.notesEn !== undefined) updates.notesEn = input.notesEn;

    let row: Selectable<Invoices> | undefined;
    try {
      row = await trx
        .updateTable("invoices")
        .set(updates)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();
    } catch (error: unknown) {
      mapForeignKeyError(error);
    }

    if (!row) throw notFound("Invoice not found");

    // Line items are replaced wholesale so positions stay contiguous after reordering.
    if (input.lineItems !== undefined) {
      await trx.deleteFrom("lineItems").where("invoiceId", "=", id).execute();
      await insertLineItems(trx, id, input.lineItems, (input.type ?? current.type) as DocumentType);
    }

    const lineItemRows = await loadLineItems(trx, id);
    return toInvoice(row, lineItemRows);
  });
}

export async function deleteInvoice(id: number): Promise<void> {
  const db = getDb();

  const row = await db
    .selectFrom("invoices")
    .select("status")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) throw notFound("Invoice not found");
  if (row.status !== INVOICE_STATUS.DRAFT) {
    throw invalidOperation("Only Draft invoices can be deleted");
  }

  await db.deleteFrom("invoices").where("id", "=", id).execute();
}
