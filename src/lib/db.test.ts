import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { configureDb, getDb, resetDb } from "@/lib/db";
import { sql } from "kysely";

beforeEach(() => {
  configureDb(":memory:");
});

afterEach(async () => {
  await resetDb();
});

describe("getDb", () => {
  it("returns a working Kysely instance that can execute a query", async () => {
    const db = getDb();
    const result = await sql`SELECT 1 AS value`.execute(db);
    expect(result.rows).toEqual([{ value: 1 }]);
  });

it("returns the same instance on subsequent calls", () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });
});
