import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = path.resolve("data/fireracuni.db");

let instance: Kysely<Record<string, never>> | null = null;
let dbPath: string = DEFAULT_DB_PATH;

export function configureDb(path: string): void {
  dbPath = path;
}

export function getDb(): Kysely<Record<string, never>> {
  if (!instance) {
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    const dialect = new SqliteDialect({ database: new Database(dbPath) });
    instance = new Kysely({ dialect });
  }
  return instance;
}

export async function resetDb(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}
