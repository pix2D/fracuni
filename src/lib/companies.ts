import { getDb } from "@/lib/db";
import type { Insertable, Selectable } from "kysely";
import { sql } from "kysely";
import type { Companies, Locations, PaymentMethods } from "@/lib/db.generated";
import { conflict, invalidOperation, notFound } from "@/lib/app-errors";

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

function shouldBecomeDefault(requestedDefault: boolean | undefined, existingCount: number): boolean {
  return requestedDefault === true || existingCount === 0;
}

function storedDefault(isDefault: boolean): 0 | 1 {
  return isDefault ? 1 : 0;
}

function assertCanDeleteNumberedSetting(count: number, settingName: "location" | "payment method"): void {
  if (count > 1) return;
  throw invalidOperation(`Cannot delete the only ${settingName}`);
}

function isSqliteError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const db = getDb();
  try {
    const row = await db
      .insertInto("companies")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toCompany(row);
  } catch (error: unknown) {
    if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
      throw conflict("A company with this OIB already exists");
    }
    throw error;
  }
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

export async function listCompaniesWithRelations(): Promise<CompanyWithRelations[]> {
  const db = getDb();
  const companyRows = await db
    .selectFrom("companies")
    .selectAll()
    .orderBy("name")
    .execute();

  const companies = companyRows.map(toCompany);
  const companyIds = companies.map((company) => company.id);
  if (companyIds.length === 0) return [];

  const locationRows = await db
    .selectFrom("locations")
    .selectAll()
    .where("companyId", "in", companyIds)
    .orderBy("number")
    .execute();

  const paymentMethodRows = await db
    .selectFrom("paymentMethods")
    .selectAll()
    .where("companyId", "in", companyIds)
    .orderBy("number")
    .execute();

  return companies.map((company) => ({
    ...company,
    locations: locationRows
      .filter((location) => location.companyId === company.id)
      .map(toLocation),
    paymentMethods: paymentMethodRows
      .filter((paymentMethod) => paymentMethod.companyId === company.id)
      .map(toPaymentMethod),
  }));
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
  try {
    const result = await getDb()
      .updateTable("companies")
      .set({ ...input, updatedAt: sql`datetime('now')` })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) throw notFound("Company not found");
    return toCompany(result);
  } catch (error: unknown) {
    if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
      throw conflict("A company with this OIB already exists");
    }
    throw error;
  }
}

export async function deleteCompany(id: number): Promise<void> {
  const db = getDb();
  const result = await db.deleteFrom("companies").where("id", "=", id).executeTakeFirst();
  if (result.numDeletedRows === 0n) throw notFound("Company not found");
}

export async function createLocation(companyId: number, input: LocationInput): Promise<Location> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("locations")
      .select("id")
      .where("companyId", "=", companyId)
      .execute();

    const shouldBeDefault = shouldBecomeDefault(input.isDefault, existing.length);

    if (shouldBeDefault) {
      await trx
        .updateTable("locations")
        .set({ isDefault: 0 })
        .where("companyId", "=", companyId)
        .execute();
    }

    try {
      const row = await trx
        .insertInto("locations")
        .values({
          companyId,
          number: input.number,
          nameHr: input.nameHr,
          nameEn: input.nameEn ?? null,
          isDefault: storedDefault(shouldBeDefault),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toLocation(row);
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A location with this number already exists for this company");
      }
      if (isSqliteError(error, "SQLITE_CONSTRAINT_FOREIGNKEY")) {
        throw notFound("Company not found");
      }
      throw error;
    }
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

    if (!current) throw notFound("Location not found");

    if (input.isDefault === true) {
      await trx
        .updateTable("locations")
        .set({ isDefault: 0 })
        .where("companyId", "=", current.companyId)
        .execute();
    }

    try {
      const row = await trx
        .updateTable("locations")
        .set({
          ...(input.number !== undefined && { number: input.number }),
          ...(input.nameHr !== undefined && { nameHr: input.nameHr }),
          ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
          ...(input.isDefault !== undefined && { isDefault: storedDefault(input.isDefault) }),
          updatedAt: sql`datetime('now')`,
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return toLocation(row);
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A location with this number already exists for this company");
      }
      throw error;
    }
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

    if (!current) throw notFound("Location not found");

    const { countAll } = trx.fn;
    const { cnt } = await trx
      .selectFrom("locations")
      .select(countAll<number>().as("cnt"))
      .where("companyId", "=", current.companyId)
      .executeTakeFirstOrThrow();

    assertCanDeleteNumberedSetting(cnt, "location");

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

    const shouldBeDefault = shouldBecomeDefault(input.isDefault, existing.length);

    if (shouldBeDefault) {
      await trx
        .updateTable("paymentMethods")
        .set({ isDefault: 0 })
        .where("companyId", "=", companyId)
        .execute();
    }

    try {
      const row = await trx
        .insertInto("paymentMethods")
        .values({
          companyId,
          number: input.number,
          nameHr: input.nameHr,
          nameEn: input.nameEn ?? null,
          isDefault: storedDefault(shouldBeDefault),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toPaymentMethod(row);
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A payment method with this number already exists for this company");
      }
      if (isSqliteError(error, "SQLITE_CONSTRAINT_FOREIGNKEY")) {
        throw notFound("Company not found");
      }
      throw error;
    }
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

    if (!current) throw notFound("Payment method not found");

    if (input.isDefault === true) {
      await trx
        .updateTable("paymentMethods")
        .set({ isDefault: 0 })
        .where("companyId", "=", current.companyId)
        .execute();
    }

    try {
      const row = await trx
        .updateTable("paymentMethods")
        .set({
          ...(input.number !== undefined && { number: input.number }),
          ...(input.nameHr !== undefined && { nameHr: input.nameHr }),
          ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
          ...(input.isDefault !== undefined && { isDefault: storedDefault(input.isDefault) }),
          updatedAt: sql`datetime('now')`,
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return toPaymentMethod(row);
    } catch (error: unknown) {
      if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
        throw conflict("A payment method with this number already exists for this company");
      }
      throw error;
    }
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

    if (!current) throw notFound("Payment method not found");

    const { countAll } = trx.fn;
    const { cnt } = await trx
      .selectFrom("paymentMethods")
      .select(countAll<number>().as("cnt"))
      .where("companyId", "=", current.companyId)
      .executeTakeFirstOrThrow();

    assertCanDeleteNumberedSetting(cnt, "payment method");

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
