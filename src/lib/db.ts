import Database from "better-sqlite3";
import { CamelCasePlugin, Kysely, SqliteDialect } from "kysely";
import type { DB } from "@/lib/db.generated";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = path.resolve("data/fireracuni.db");

const global = globalThis as unknown as { __db?: Kysely<DB>; __dbPath?: string };

export function configureDb(newPath: string): void {
  if (global.__db) {
    throw new Error("Cannot reconfigure DB after initialization. Call resetDb() first.");
  }
  global.__dbPath = newPath;
}

export function getDb(): Kysely<DB> {
  if (!global.__db) {
    const dbPath = global.__dbPath ?? DEFAULT_DB_PATH;
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    const dialect = new SqliteDialect({ database: new Database(dbPath) });
    global.__db = new Kysely<DB>({ dialect, plugins: [new CamelCasePlugin()] });
  }
  return global.__db;
}

export async function resetDb(): Promise<void> {
  if (global.__db) {
    await global.__db.destroy();
    global.__db = undefined;
  }
  global.__dbPath = undefined;
}
