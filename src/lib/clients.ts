import { getDb } from "@/lib/db";
import type { Selectable } from "kysely";
import { sql } from "kysely";
import type { Clients, ClientTaxIds } from "@/lib/db.generated";
import { conflict, notFound } from "@/lib/app-errors";
import { parseClientType, type ClientType } from "@/lib/client-types";
import { normalizeClientInput, normalizeClientPatch, type ClientInput } from "@/lib/clients.schema";

export type { ClientInput, ClientTaxIdInput as TaxIdInput } from "@/lib/clients.schema";

type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

export type TaxId = NonNullId<Selectable<ClientTaxIds>>;

type ClientRow = NonNullId<Selectable<Clients>>;

export interface Client extends Omit<ClientRow, "clientType"> {
  clientType: ClientType;
  taxIds: TaxId[];
}

function toTaxId(row: Selectable<ClientTaxIds>): TaxId {
  return { ...row, id: row.id! };
}

function toClient(row: Selectable<Clients>, taxIdRows: Selectable<ClientTaxIds>[]): Client {
  return {
    ...row,
    id: row.id!,
    clientType: parseClientType(row.clientType),
    taxIds: taxIdRows.map(toTaxId),
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

export async function createClient(input: ClientInput): Promise<Client> {
  const db = getDb();
  const { taxIds, ...clientData } = normalizeClientInput(input);

  return await db.transaction().execute(async (trx) => {
    let row: Selectable<Clients>;
    try {
      row = await trx
        .insertInto("clients")
        .values({
          name: clientData.name,
          clientType: clientData.clientType,
          country: clientData.country,
          address: clientData.address ?? null,
          oib: clientData.oib ?? null,
          vatNumber: clientData.vatNumber ?? null,
          defaultCurrency: clientData.defaultCurrency ?? null,
          defaultPaymentTermsDays: clientData.defaultPaymentTermsDays ?? null,
          defaultOfferValidityDays: clientData.defaultOfferValidityDays ?? null,
          email: clientData.email ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A client with this OIB already exists");
      }
      throw error;
    }

    const clientId = row.id!;
    let taxIdRows: Selectable<ClientTaxIds>[] = [];

    if (taxIds && taxIds.length > 0) {
      taxIdRows = await trx
        .insertInto("clientTaxIds")
        .values(taxIds.map((t) => ({ clientId, label: t.label, value: t.value })))
        .returningAll()
        .execute();
    }

    return toClient(row, taxIdRows);
  });
}

export interface ListClientsOptions {
  search?: string;
  archived?: boolean;
}

export async function listClients(opts: ListClientsOptions = {}): Promise<Client[]> {
  const db = getDb();

  let query = db.selectFrom("clients").selectAll().orderBy("name");

  if (!opts.archived) {
    query = query.where("archivedAt", "is", null);
  }

  if (opts.search) {
    query = query.where("name", "like", `%${opts.search}%`);
  }

  const rows = await query.execute();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id!);
  const taxIdRows = await db
    .selectFrom("clientTaxIds")
    .selectAll()
    .where("clientId", "in", ids)
    .execute();

  return rows.map((row) =>
    toClient(
      row,
      taxIdRows.filter((t) => t.clientId === row.id!),
    ),
  );
}

export async function getClient(id: number): Promise<Client | null> {
  const db = getDb();

  const row = await db
    .selectFrom("clients")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) return null;

  const taxIdRows = await db
    .selectFrom("clientTaxIds")
    .selectAll()
    .where("clientId", "=", id)
    .execute();

  return toClient(row, taxIdRows);
}

export async function updateClient(id: number, input: Partial<ClientInput>): Promise<Client> {
  const db = getDb();
  const { taxIds, ...clientData } = normalizeClientPatch(input);

  return await db.transaction().execute(async (trx) => {
    const updates: Record<string, unknown> = { updatedAt: sql`datetime('now')` };
    if (clientData.name !== undefined) updates.name = clientData.name;
    if (clientData.clientType !== undefined) updates.clientType = clientData.clientType;
    if (clientData.country !== undefined) updates.country = clientData.country;
    if (clientData.address !== undefined) updates.address = clientData.address;
    if (clientData.oib !== undefined) updates.oib = clientData.oib;
    if (clientData.vatNumber !== undefined) updates.vatNumber = clientData.vatNumber;
    if (clientData.defaultCurrency !== undefined) updates.defaultCurrency = clientData.defaultCurrency;
    if (clientData.defaultPaymentTermsDays !== undefined) updates.defaultPaymentTermsDays = clientData.defaultPaymentTermsDays;
    if (clientData.defaultOfferValidityDays !== undefined) updates.defaultOfferValidityDays = clientData.defaultOfferValidityDays;
    if (clientData.email !== undefined) updates.email = clientData.email;

    let row: Selectable<Clients> | undefined;
    try {
      row = await trx
        .updateTable("clients")
        .set(updates)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A client with this OIB already exists");
      }
      throw error;
    }

    if (!row) throw notFound("Client not found");

    if (taxIds !== undefined) {
      await trx.deleteFrom("clientTaxIds").where("clientId", "=", id).execute();

      if (taxIds.length > 0) {
        await trx
          .insertInto("clientTaxIds")
          .values(taxIds.map((t) => ({ clientId: id, label: t.label, value: t.value })))
          .execute();
      }
    }

    const taxIdRows = await trx
      .selectFrom("clientTaxIds")
      .selectAll()
      .where("clientId", "=", id)
      .execute();

    return toClient(row, taxIdRows);
  });
}

export async function deleteClient(id: number): Promise<void> {
  const db = getDb();
  const result = await db.deleteFrom("clients").where("id", "=", id).executeTakeFirst();
  if (result.numDeletedRows === 0n) throw notFound("Client not found");
}

export async function archiveClient(id: number): Promise<Client> {
  const db = getDb();

  const result = await db
    .updateTable("clients")
    .set({ archivedAt: sql`datetime('now')`, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .where("archivedAt", "is", null)
    .returningAll()
    .executeTakeFirst();

  if (!result) throw notFound("Client not found or already archived");

  const taxIdRows = await db
    .selectFrom("clientTaxIds")
    .selectAll()
    .where("clientId", "=", id)
    .execute();

  return toClient(result, taxIdRows);
}

export async function unarchiveClient(id: number): Promise<Client> {
  const db = getDb();

  const result = await db
    .updateTable("clients")
    .set({ archivedAt: null, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .where("archivedAt", "is not", null)
    .returningAll()
    .executeTakeFirst();

  if (!result) throw notFound("Client not found or not archived");

  const taxIdRows = await db
    .selectFrom("clientTaxIds")
    .selectAll()
    .where("clientId", "=", id)
    .execute();

  return toClient(result, taxIdRows);
}
