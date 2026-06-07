import { defineConfig } from "kysely-ctl";
import { getDb } from "./src/lib/db";

export default defineConfig({
  kysely: getDb(),
  migrations: {
    migrationFolder: "migrations",
  },
});
