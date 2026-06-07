import { getDb } from "@/lib/db";
import { sql } from "kysely";

interface CompanyRow {
  id: number;
  name: string;
}

export async function getCompanies(): Promise<CompanyRow[]> {
  const db = getDb();
  try {
    const result = await sql<CompanyRow>`SELECT id, name FROM companies ORDER BY name`.execute(db);
    return result.rows;
  } catch {
    return [];
  }
}
