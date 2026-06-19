import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const dbPath = path.resolve("data/fireracuni.e2e.db");
const dbDir = path.dirname(dbPath);

await mkdir(dbDir, { recursive: true });
await Promise.all([
  rm(dbPath, { force: true }),
  rm(`${dbPath}-shm`, { force: true }),
  rm(`${dbPath}-wal`, { force: true }),
]);
