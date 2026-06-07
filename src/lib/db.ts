import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.resolve("data/fireracuni.db");

let instance: Kysely<Record<string, never>> | null = null;

export function getDb(): Kysely<Record<string, never>> {
  if (!instance) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const dialect = new SqliteDialect({ database: new Database(DB_PATH) });
    instance = new Kysely({ dialect });
  }
  return instance;
}

export function resetDb(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
