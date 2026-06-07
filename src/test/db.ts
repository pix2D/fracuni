import { afterEach, beforeEach } from "vitest";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";
import { configureDb, getDb, resetDb } from "@/lib/db";

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve("migrations"),
    }),
  });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}

export function useMigratedDb(): void {
  beforeEach(async () => {
    await resetDb();
    configureDb(":memory:");
    await runMigrations();
  });

  afterEach(async () => {
    await resetDb();
  });
}
