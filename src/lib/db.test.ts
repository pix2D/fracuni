import { describe, it, expect, afterEach } from "vitest";
import { getDb, resetDb } from "@/lib/db";
import { sql } from "kysely";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.resolve("data/fireracuni.db");

afterEach(() => {
  resetDb();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
});

describe("getDb", () => {
  it("returns a working Kysely instance that can execute a query", async () => {
    const db = getDb();
    const result = await sql`SELECT 1 AS value`.execute(db);
    expect(result.rows).toEqual([{ value: 1 }]);
  });

  it("creates the database file on first access", () => {
    expect(fs.existsSync(DB_PATH)).toBe(false);
    getDb();
    expect(fs.existsSync(DB_PATH)).toBe(true);
  });

  it("returns the same instance on subsequent calls", () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });
});
