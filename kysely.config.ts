import { defineConfig } from "kysely-ctl";
import { SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.FIRERACUNI_DATA_DIR ?? "data");
fs.mkdirSync(dataDir, { recursive: true });

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(path.join(dataDir, "fireracuni.db")),
  }),
  migrations: {
    migrationFolder: "migrations",
  },
});
