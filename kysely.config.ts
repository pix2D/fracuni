import { defineConfig } from "kysely-ctl";
import { SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import path from "node:path";

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(path.resolve("data/fireracuni.db")),
  }),
  migrations: {
    migrationFolder: "migrations",
  },
});
