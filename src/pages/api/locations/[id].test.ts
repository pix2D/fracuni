import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { promises as fs } from "node:fs";
import path from "node:path";
import { configureDb, getDb, resetDb } from "@/lib/db";
import { PUT as updateLocation } from "@/pages/api/locations/[id]";

async function runMigrations() {
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

beforeEach(async () => {
  await resetDb();
  configureDb(":memory:");
  await runMigrations();
});

afterEach(async () => {
  await resetDb();
});

function jsonRequest(body: unknown): Request {
  return new Request("http://test.local/api/locations/not-a-number", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/locations/:id", () => {
  it("returns 400 for an invalid Location ID", async () => {
    const response = await updateLocation({
      params: { id: "not-a-number" },
      request: jsonRequest({ nameHr: "Zagreb" }),
    } as unknown as Parameters<typeof updateLocation>[0]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid location ID",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await updateLocation({
      params: { id: "1" },
      request: new Request("http://test.local/api/locations/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    } as unknown as Parameters<typeof updateLocation>[0]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid JSON",
    });
  });

  it("returns 404 when the Location does not exist", async () => {
    const response = await updateLocation({
      params: { id: "999" },
      request: jsonRequest({ nameHr: "Novi Zagreb" }),
    } as unknown as Parameters<typeof updateLocation>[0]);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Location not found",
    });
  });
});
