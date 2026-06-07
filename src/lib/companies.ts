import { getDb } from "@/lib/db";
import type { Insertable, Selectable } from "kysely";
import { sql } from "kysely";
import type { Companies, Locations, PaymentMethods } from "@/lib/db.generated";

// SQLite introspection reports autoincrement PKs as nullable; they never are after insert/select.
type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

// SQLite has no boolean — isDefault is stored as 0/1 integer. Convert at the boundary.
type BooleanDefault<T extends { isDefault: unknown }> = Omit<T, "isDefault"> & { isDefault: boolean };

export type Company = NonNullId<Selectable<Companies>>;
export type CompanyInput = Omit<Insertable<Companies>, "id" | "createdAt" | "updatedAt">;

export type Location = BooleanDefault<NonNullId<Selectable<Locations>>>;
export type LocationInput = {
  number: number;
  nameHr: string;
  nameEn?: string | null;
  isDefault?: boolean;
};

export type PaymentMethod = BooleanDefault<NonNullId<Selectable<PaymentMethods>>>;
export type PaymentMethodInput = {
  number: number;
  nameHr: string;
  nameEn?: string | null;
  isDefault?: boolean;
};

export interface CompanyWithRelations extends Company {
  locations: Location[];
  paymentMethods: PaymentMethod[];
}

function toCompany(row: Selectable<Companies>): Company {
  return { ...row, id: row.id! };
}

function toLocation(row: Selectable<Locations>): Location {
  return { ...row, id: row.id!, isDefault: row.isDefault === 1 };
}

function toPaymentMethod(row: Selectable<PaymentMethods>): PaymentMethod {
  return { ...row, id: row.id!, isDefault: row.isDefault === 1 };
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const db = getDb();
  const row = await db
    .insertInto("companies")
    .values(input)
    .returningAll()
    .executeTakeFirstOrThrow();
  return toCompany(row);
}

export async function listCompanies(): Promise<Company[]> {
  const db = getDb();
  const rows = await db
    .selectFrom("companies")
    .selectAll()
    .orderBy("name")
    .execute();
  return rows.map(toCompany);
}

export async function getCompany(id: number): Promise<CompanyWithRelations | null> {
  const db = getDb();

  const companyRow = await db
    .selectFrom("companies")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!companyRow) return null;

  const company = toCompany(companyRow);

  const locationRows = await db
    .selectFrom("locations")
    .selectAll()
    .where("companyId", "=", id)
    .orderBy("number")
    .execute();

  const pmRows = await db
    .selectFrom("paymentMethods")
    .selectAll()
    .where("companyId", "=", id)
    .orderBy("number")
    .execute();

  return {
    ...company,
    locations: locationRows.map(toLocation),
    paymentMethods: pmRows.map(toPaymentMethod),
  };
}

export async function updateCompany(
  id: number,
  input: Partial<CompanyInput>,
): Promise<Company> {
  const result = await getDb()
    .updateTable("companies")
    .set({ ...input, updatedAt: sql`datetime('now')` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();

  if (!result) throw new Error("Company not found");
  return toCompany(result);
}

// TODO: remove `as any` casts when invoices/offers tables exist in the schema
export async function deleteCompany(id: number): Promise<void> {
  const db = getDb();

  const hasInvoices = await db
    .selectFrom("invoices" as any)
    .select(sql`1`.as("one"))
    .where("companyId" as any, "=", id)
    .executeTakeFirst()
    .catch((e: unknown) => {
      if (e instanceof Error && e.message.includes("no such table")) return undefined;
      throw e;
    });

  if (hasInvoices) {
    throw new Error("Cannot delete company: documents reference it");
  }

  const hasOffers = await db
    .selectFrom("offers" as any)
    .select(sql`1`.as("one"))
    .where("companyId" as any, "=", id)
    .executeTakeFirst()
    .catch((e: unknown) => {
      if (e instanceof Error && e.message.includes("no such table")) return undefined;
      throw e;
    });

  if (hasOffers) {
    throw new Error("Cannot delete company: documents reference it");
  }

  await db.deleteFrom("companies").where("id", "=", id).execute();
}

export async function createLocation(companyId: number, input: LocationInput): Promise<Location> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("locations")
      .select("id")
      .where("companyId", "=", companyId)
      .execute();

    const shouldBeDefault = input.isDefault === true || existing.length === 0;

    if (shouldBeDefault) {
      await trx
        .updateTable("locations")
        .set({ isDefault: 0 })
        .where("companyId", "=", companyId)
        .execute();
    }

    const row = await trx
      .insertInto("locations")
      .values({
        companyId,
        number: input.number,
        nameHr: input.nameHr,
        nameEn: input.nameEn ?? null,
        isDefault: shouldBeDefault ? 1 : 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toLocation(row);
  });
}

export async function updateLocation(
  id: number,
  input: Partial<LocationInput>,
): Promise<Location> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom("locations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!current) throw new Error("Location not found");

    if (input.isDefault === true) {
      await trx
        .updateTable("locations")
        .set({ isDefault: 0 })
        .where("companyId", "=", current.companyId)
        .execute();
    }

    const row = await trx
      .updateTable("locations")
      .set({
        ...(input.number !== undefined && { number: input.number }),
        ...(input.nameHr !== undefined && { nameHr: input.nameHr }),
        ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault ? 1 : 0 }),
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return toLocation(row);
  });
}

export async function deleteLocation(id: number): Promise<void> {
  const db = getDb();

  await db.transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom("locations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!current) throw new Error("Location not found");

    const { countAll } = trx.fn;
    const { cnt } = await trx
      .selectFrom("locations")
      .select(countAll<number>().as("cnt"))
      .where("companyId", "=", current.companyId)
      .executeTakeFirstOrThrow();

    if (cnt <= 1) {
      throw new Error("Cannot delete the only location");
    }

    await trx.deleteFrom("locations").where("id", "=", id).execute();

    if (current.isDefault === 1) {
      const next = await trx
        .selectFrom("locations")
        .select("id")
        .where("companyId", "=", current.companyId)
        .orderBy("id")
        .executeTakeFirstOrThrow();

      await trx
        .updateTable("locations")
        .set({ isDefault: 1 })
        .where("id", "=", next.id)
        .execute();
    }
  });
}

export async function createPaymentMethod(
  companyId: number,
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("paymentMethods")
      .select("id")
      .where("companyId", "=", companyId)
      .execute();

    const shouldBeDefault = input.isDefault === true || existing.length === 0;

    if (shouldBeDefault) {
      await trx
        .updateTable("paymentMethods")
        .set({ isDefault: 0 })
        .where("companyId", "=", companyId)
        .execute();
    }

    const row = await trx
      .insertInto("paymentMethods")
      .values({
        companyId,
        number: input.number,
        nameHr: input.nameHr,
        nameEn: input.nameEn ?? null,
        isDefault: shouldBeDefault ? 1 : 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toPaymentMethod(row);
  });
}

export async function updatePaymentMethod(
  id: number,
  input: Partial<PaymentMethodInput>,
): Promise<PaymentMethod> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom("paymentMethods")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!current) throw new Error("Payment method not found");

    if (input.isDefault === true) {
      await trx
        .updateTable("paymentMethods")
        .set({ isDefault: 0 })
        .where("companyId", "=", current.companyId)
        .execute();
    }

    const row = await trx
      .updateTable("paymentMethods")
      .set({
        ...(input.number !== undefined && { number: input.number }),
        ...(input.nameHr !== undefined && { nameHr: input.nameHr }),
        ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault ? 1 : 0 }),
        updatedAt: sql`datetime('now')`,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return toPaymentMethod(row);
  });
}

export async function deletePaymentMethod(id: number): Promise<void> {
  const db = getDb();

  await db.transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom("paymentMethods")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!current) throw new Error("Payment method not found");

    const { countAll } = trx.fn;
    const { cnt } = await trx
      .selectFrom("paymentMethods")
      .select(countAll<number>().as("cnt"))
      .where("companyId", "=", current.companyId)
      .executeTakeFirstOrThrow();

    if (cnt <= 1) {
      throw new Error("Cannot delete the only payment method");
    }

    await trx.deleteFrom("paymentMethods").where("id", "=", id).execute();

    if (current.isDefault === 1) {
      const next = await trx
        .selectFrom("paymentMethods")
        .select("id")
        .where("companyId", "=", current.companyId)
        .orderBy("id")
        .executeTakeFirstOrThrow();

      await trx
        .updateTable("paymentMethods")
        .set({ isDefault: 1 })
        .where("id", "=", next.id)
        .execute();
    }
  });
}
