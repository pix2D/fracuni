import { defineConfig } from "kysely-ctl";
import { SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import path from "node:path";

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(path.resolve(process.env.FIRERACUNI_DB_PATH ?? "data/fireracuni.db")),
  }),
  migrations: {
    migrationFolder: "migrations",
  },
});
