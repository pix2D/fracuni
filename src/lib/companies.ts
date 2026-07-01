import { getDb } from "@/lib/db";
import type { Insertable, Selectable } from "kysely";
import { sql } from "kysely";
import type { CompanyProfile, Locations, PaymentMethods } from "@/lib/db.generated";
import { conflict, invalidOperation, notFound } from "@/lib/app-errors";

const COMPANY_PROFILE_ID = 1;

// SQLite introspection reports autoincrement PKs as nullable; they never are after insert/select.
type NonNullId<T extends { id: unknown }> = Omit<T, "id"> & { id: number };

// SQLite has no boolean — isDefault is stored as 0/1 integer. Convert at the boundary.
type BooleanDefault<T extends { isDefault: unknown }> = Omit<T, "isDefault"> & { isDefault: boolean };

export type Company = NonNullId<Selectable<CompanyProfile>>;
export type CompanyInput = Omit<Insertable<CompanyProfile>, "id" | "createdAt" | "updatedAt">;

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

function toCompany(row: Selectable<CompanyProfile>): Company {
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

export async function getCompanyProfile(): Promise<CompanyWithRelations | null> {
  const db = getDb();

  const companyRow = await db
    .selectFrom("companyProfile")
    .selectAll()
    .where("id", "=", COMPANY_PROFILE_ID)
    .executeTakeFirst();

  if (!companyRow) return null;

  const [locationRows, paymentMethodRows] = await Promise.all([
    db.selectFrom("locations").selectAll().orderBy("number").execute(),
    db.selectFrom("paymentMethods").selectAll().orderBy("number").execute(),
  ]);

  return {
    ...toCompany(companyRow),
    locations: locationRows.map(toLocation),
    paymentMethods: paymentMethodRows.map(toPaymentMethod),
  };
}

export async function upsertCompanyProfile(input: CompanyInput): Promise<Company> {
  const db = getDb();
  try {
    const row = await db
      .insertInto("companyProfile")
      .values({ ...input, id: COMPANY_PROFILE_ID })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          ...input,
          updatedAt: sql`datetime('now')`,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return toCompany(row);
  } catch (error: unknown) {
    if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
      throw conflict("A company profile with this OIB already exists");
    }
    throw error;
  }
}

export async function updateCompanyProfile(input: Partial<CompanyInput>): Promise<Company> {
  let result: Selectable<CompanyProfile> | undefined;

  try {
    result = await getDb()
      .updateTable("companyProfile")
      .set({ ...input, updatedAt: sql`datetime('now')` })
      .where("id", "=", COMPANY_PROFILE_ID)
      .returningAll()
      .executeTakeFirst();
  } catch (error: unknown) {
    if (isSqliteError(error, "SQLITE_CONSTRAINT_UNIQUE")) {
      throw conflict("A company profile with this OIB already exists");
    }
    throw error;
  }

  if (!result) throw notFound("Company profile not found");
  return toCompany(result);
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const existing = await trx.selectFrom("locations").select("id").execute();
    const shouldBeDefault = shouldBecomeDefault(input.isDefault, existing.length);

    if (shouldBeDefault) {
      await trx.updateTable("locations").set({ isDefault: 0 }).execute();
    }

    try {
      const row = await trx
        .insertInto("locations")
        .values({
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
        throw conflict("A location with this number already exists");
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
      await trx.updateTable("locations").set({ isDefault: 0 }).execute();
    }

    if (input.isDefault === false && current.isDefault === 1) {
      throw invalidOperation("Cannot unset the default location; choose another default instead");
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
        throw conflict("A location with this number already exists");
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
      .executeTakeFirstOrThrow();

    assertCanDeleteNumberedSetting(cnt, "location");

    await trx.deleteFrom("locations").where("id", "=", id).execute();

    if (current.isDefault === 1) {
      const next = await trx
        .selectFrom("locations")
        .select("id")
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

export async function createPaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const existing = await trx.selectFrom("paymentMethods").select("id").execute();
    const shouldBeDefault = shouldBecomeDefault(input.isDefault, existing.length);

    if (shouldBeDefault) {
      await trx.updateTable("paymentMethods").set({ isDefault: 0 }).execute();
    }

    try {
      const row = await trx
        .insertInto("paymentMethods")
        .values({
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
        throw conflict("A payment method with this number already exists");
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
      await trx.updateTable("paymentMethods").set({ isDefault: 0 }).execute();
    }

    if (input.isDefault === false && current.isDefault === 1) {
      throw invalidOperation("Cannot unset the default payment method; choose another default instead");
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
        throw conflict("A payment method with this number already exists");
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
      .executeTakeFirstOrThrow();

    assertCanDeleteNumberedSetting(cnt, "payment method");

    await trx.deleteFrom("paymentMethods").where("id", "=", id).execute();

    if (current.isDefault === 1) {
      const next = await trx
        .selectFrom("paymentMethods")
        .select("id")
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
