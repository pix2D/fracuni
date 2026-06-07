import { getDb } from "@/lib/db";
import { sql } from "kysely";

export interface CompanyInput {
  name: string;
  address: string;
  phone: string;
  oib: string;
  logoPath?: string;
  taglineHr?: string;
  taglineEn?: string;
  iban: string;
  swift: string;
  legalTextDomestic?: string;
  legalTextForeignHr?: string;
  legalTextForeignEn?: string;
  emailFromAddress: string;
  emailFromName: string;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  defaultPaymentTermsDays: number;
  issuerName: string;
}

export interface Company extends CompanyInput {
  id: number;
}

export interface LocationInput {
  number: number;
  nameHr: string;
  nameEn?: string;
  isDefault?: boolean;
}

export interface Location extends LocationInput {
  id: number;
  companyId: number;
  isDefault: boolean;
}

export interface PaymentMethodInput {
  number: number;
  nameHr: string;
  nameEn?: string;
  isDefault?: boolean;
}

export interface PaymentMethod extends PaymentMethodInput {
  id: number;
  companyId: number;
  isDefault: boolean;
}

export interface CompanyWithRelations extends Company {
  locations: Location[];
  paymentMethods: PaymentMethod[];
}

function rowToCompany(row: Record<string, unknown>): Company {
  return {
    id: row.id as number,
    name: row.name as string,
    address: row.address as string,
    phone: row.phone as string,
    oib: row.oib as string,
    logoPath: row.logo_path as string | undefined,
    taglineHr: row.tagline_hr as string | undefined,
    taglineEn: row.tagline_en as string | undefined,
    iban: row.iban as string,
    swift: row.swift as string,
    legalTextDomestic: row.legal_text_domestic as string,
    legalTextForeignHr: row.legal_text_foreign_hr as string,
    legalTextForeignEn: row.legal_text_foreign_en as string,
    emailFromAddress: row.email_from_address as string,
    emailFromName: row.email_from_name as string,
    emailSubjectTemplate: row.email_subject_template as string,
    emailBodyTemplate: row.email_body_template as string,
    defaultPaymentTermsDays: row.default_payment_terms_days as number,
    issuerName: row.issuer_name as string,
  };
}

function rowToLocation(row: Record<string, unknown>): Location {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    number: row.number as number,
    nameHr: row.name_hr as string,
    nameEn: row.name_en as string,
    isDefault: row.is_default === 1,
  };
}

function rowToPaymentMethod(row: Record<string, unknown>): PaymentMethod {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    number: row.number as number,
    nameHr: row.name_hr as string,
    nameEn: row.name_en as string,
    isDefault: row.is_default === 1,
  };
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const db = getDb();
  const result = await sql`
    INSERT INTO companies (name, address, phone, oib, logo_path, tagline_hr, tagline_en, iban, swift,
      legal_text_domestic, legal_text_foreign_hr, legal_text_foreign_en,
      email_from_address, email_from_name, email_subject_template, email_body_template,
      default_payment_terms_days, issuer_name)
    VALUES (${input.name}, ${input.address}, ${input.phone}, ${input.oib},
      ${input.logoPath ?? null}, ${input.taglineHr ?? null}, ${input.taglineEn ?? null},
      ${input.iban}, ${input.swift},
      ${input.legalTextDomestic ?? ""}, ${input.legalTextForeignHr ?? ""}, ${input.legalTextForeignEn ?? ""},
      ${input.emailFromAddress}, ${input.emailFromName},
      ${input.emailSubjectTemplate ?? ""}, ${input.emailBodyTemplate ?? ""},
      ${input.defaultPaymentTermsDays}, ${input.issuerName})
    RETURNING *
  `.execute(db);

  return rowToCompany(result.rows[0] as Record<string, unknown>);
}

export async function listCompanies(): Promise<Company[]> {
  const db = getDb();
  const result = await sql`SELECT * FROM companies ORDER BY name`.execute(db);
  return result.rows.map((r) => rowToCompany(r as Record<string, unknown>));
}

export async function getCompany(id: number): Promise<CompanyWithRelations | null> {
  const db = getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE id = ${id}`.execute(db);
  if (companyResult.rows.length === 0) return null;

  const company = rowToCompany(companyResult.rows[0] as Record<string, unknown>);

  const locationsResult = await sql`
    SELECT * FROM locations WHERE company_id = ${id} ORDER BY number
  `.execute(db);
  const locations = locationsResult.rows.map((r) => rowToLocation(r as Record<string, unknown>));

  const pmResult = await sql`
    SELECT * FROM payment_methods WHERE company_id = ${id} ORDER BY number
  `.execute(db);
  const paymentMethods = pmResult.rows.map((r) => rowToPaymentMethod(r as Record<string, unknown>));

  return { ...company, locations, paymentMethods };
}

export async function updateCompany(id: number, input: Partial<CompanyInput>): Promise<Company> {
  const db = getDb();

  const fieldMap: Record<string, string> = {
    name: "name",
    address: "address",
    phone: "phone",
    oib: "oib",
    logoPath: "logo_path",
    taglineHr: "tagline_hr",
    taglineEn: "tagline_en",
    iban: "iban",
    swift: "swift",
    legalTextDomestic: "legal_text_domestic",
    legalTextForeignHr: "legal_text_foreign_hr",
    legalTextForeignEn: "legal_text_foreign_en",
    emailFromAddress: "email_from_address",
    emailFromName: "email_from_name",
    emailSubjectTemplate: "email_subject_template",
    emailBodyTemplate: "email_body_template",
    defaultPaymentTermsDays: "default_payment_terms_days",
    issuerName: "issuer_name",
  };

  const parts: ReturnType<typeof sql>[] = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in input) {
      const value = (input as Record<string, unknown>)[key];
      parts.push(sql`${sql.ref(column)} = ${value}`);
    }
  }

  if (parts.length === 0) {
    const existing = await getCompany(id);
    if (!existing) throw new Error("Company not found");
    return existing;
  }

  parts.push(sql`updated_at = datetime('now')`);

  await sql`UPDATE companies SET ${sql.join(parts, sql`, `)} WHERE id = ${id}`.execute(db);

  const result = await sql`SELECT * FROM companies WHERE id = ${id}`.execute(db);
  if (result.rows.length === 0) throw new Error("Company not found");
  return rowToCompany(result.rows[0] as Record<string, unknown>);
}

export async function deleteCompany(id: number): Promise<void> {
  const db = getDb();
  // Check for referencing documents (invoices, offers) — block deletion if any exist
  try {
    const invoiceCheck = await sql`SELECT 1 FROM invoices WHERE company_id = ${id} LIMIT 1`.execute(db);
    if (invoiceCheck.rows.length > 0) {
      throw new Error("Cannot delete company: documents reference it");
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Cannot delete")) throw e;
    // Table doesn't exist yet — safe to proceed
  }

  try {
    const offerCheck = await sql`SELECT 1 FROM offers WHERE company_id = ${id} LIMIT 1`.execute(db);
    if (offerCheck.rows.length > 0) {
      throw new Error("Cannot delete company: documents reference it");
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Cannot delete")) throw e;
  }

  await sql`DELETE FROM companies WHERE id = ${id}`.execute(db);
}

export async function createLocation(companyId: number, input: LocationInput): Promise<Location> {
  const db = getDb();

  // If this is marked as default, or it's the first location, ensure default handling
  const existing = await sql`SELECT id FROM locations WHERE company_id = ${companyId}`.execute(db);
  const shouldBeDefault = input.isDefault || existing.rows.length === 0;

  if (shouldBeDefault) {
    await sql`UPDATE locations SET is_default = 0 WHERE company_id = ${companyId}`.execute(db);
  }

  const result = await sql`
    INSERT INTO locations (company_id, number, name_hr, name_en, is_default)
    VALUES (${companyId}, ${input.number}, ${input.nameHr}, ${input.nameEn ?? ""}, ${shouldBeDefault ? 1 : 0})
    RETURNING *
  `.execute(db);

  return rowToLocation(result.rows[0] as Record<string, unknown>);
}

export async function updateLocation(id: number, input: Partial<LocationInput>): Promise<Location> {
  const db = getDb();

  const current = await sql`SELECT * FROM locations WHERE id = ${id}`.execute(db);
  if (current.rows.length === 0) throw new Error("Location not found");
  const row = current.rows[0] as Record<string, unknown>;
  const companyId = row.company_id as number;

  if (input.isDefault) {
    await sql`UPDATE locations SET is_default = 0 WHERE company_id = ${companyId}`.execute(db);
  }

  const parts: ReturnType<typeof sql>[] = [];
  if (input.number !== undefined) parts.push(sql`number = ${input.number}`);
  if (input.nameHr !== undefined) parts.push(sql`name_hr = ${input.nameHr}`);
  if (input.nameEn !== undefined) parts.push(sql`name_en = ${input.nameEn}`);
  if (input.isDefault !== undefined) parts.push(sql`is_default = ${input.isDefault ? 1 : 0}`);

  if (parts.length > 0) {
    parts.push(sql`updated_at = datetime('now')`);
    await sql`UPDATE locations SET ${sql.join(parts, sql`, `)} WHERE id = ${id}`.execute(db);
  }

  const result = await sql`SELECT * FROM locations WHERE id = ${id}`.execute(db);
  return rowToLocation(result.rows[0] as Record<string, unknown>);
}

export async function deleteLocation(id: number): Promise<void> {
  const db = getDb();
  const current = await sql`SELECT * FROM locations WHERE id = ${id}`.execute(db);
  if (current.rows.length === 0) throw new Error("Location not found");

  const row = current.rows[0] as Record<string, unknown>;
  const companyId = row.company_id as number;

  const count = await sql`SELECT COUNT(*) as cnt FROM locations WHERE company_id = ${companyId}`.execute(db);
  const cnt = (count.rows[0] as Record<string, unknown>).cnt as number;
  if (cnt <= 1) {
    throw new Error("Cannot delete the only location");
  }

  const isDefault = row.is_default === 1;
  await sql`DELETE FROM locations WHERE id = ${id}`.execute(db);

  if (isDefault) {
    await sql`
      UPDATE locations SET is_default = 1
      WHERE company_id = ${companyId} AND id = (SELECT MIN(id) FROM locations WHERE company_id = ${companyId})
    `.execute(db);
  }
}

export async function createPaymentMethod(companyId: number, input: PaymentMethodInput): Promise<PaymentMethod> {
  const db = getDb();

  const existing = await sql`SELECT id FROM payment_methods WHERE company_id = ${companyId}`.execute(db);
  const shouldBeDefault = input.isDefault || existing.rows.length === 0;

  if (shouldBeDefault) {
    await sql`UPDATE payment_methods SET is_default = 0 WHERE company_id = ${companyId}`.execute(db);
  }

  const result = await sql`
    INSERT INTO payment_methods (company_id, number, name_hr, name_en, is_default)
    VALUES (${companyId}, ${input.number}, ${input.nameHr}, ${input.nameEn ?? ""}, ${shouldBeDefault ? 1 : 0})
    RETURNING *
  `.execute(db);

  return rowToPaymentMethod(result.rows[0] as Record<string, unknown>);
}

export async function updatePaymentMethod(id: number, input: Partial<PaymentMethodInput>): Promise<PaymentMethod> {
  const db = getDb();

  const current = await sql`SELECT * FROM payment_methods WHERE id = ${id}`.execute(db);
  if (current.rows.length === 0) throw new Error("Payment method not found");
  const row = current.rows[0] as Record<string, unknown>;
  const companyId = row.company_id as number;

  if (input.isDefault) {
    await sql`UPDATE payment_methods SET is_default = 0 WHERE company_id = ${companyId}`.execute(db);
  }

  const parts: ReturnType<typeof sql>[] = [];
  if (input.number !== undefined) parts.push(sql`number = ${input.number}`);
  if (input.nameHr !== undefined) parts.push(sql`name_hr = ${input.nameHr}`);
  if (input.nameEn !== undefined) parts.push(sql`name_en = ${input.nameEn}`);
  if (input.isDefault !== undefined) parts.push(sql`is_default = ${input.isDefault ? 1 : 0}`);

  if (parts.length > 0) {
    parts.push(sql`updated_at = datetime('now')`);
    await sql`UPDATE payment_methods SET ${sql.join(parts, sql`, `)} WHERE id = ${id}`.execute(db);
  }

  const result = await sql`SELECT * FROM payment_methods WHERE id = ${id}`.execute(db);
  return rowToPaymentMethod(result.rows[0] as Record<string, unknown>);
}

export async function deletePaymentMethod(id: number): Promise<void> {
  const db = getDb();
  const current = await sql`SELECT * FROM payment_methods WHERE id = ${id}`.execute(db);
  if (current.rows.length === 0) throw new Error("Payment method not found");

  const row = current.rows[0] as Record<string, unknown>;
  const companyId = row.company_id as number;

  const count = await sql`SELECT COUNT(*) as cnt FROM payment_methods WHERE company_id = ${companyId}`.execute(db);
  const cnt = (count.rows[0] as Record<string, unknown>).cnt as number;
  if (cnt <= 1) {
    throw new Error("Cannot delete the only payment method");
  }

  const isDefault = row.is_default === 1;
  await sql`DELETE FROM payment_methods WHERE id = ${id}`.execute(db);

  if (isDefault) {
    await sql`
      UPDATE payment_methods SET is_default = 1
      WHERE company_id = ${companyId} AND id = (SELECT MIN(id) FROM payment_methods WHERE company_id = ${companyId})
    `.execute(db);
  }
}
