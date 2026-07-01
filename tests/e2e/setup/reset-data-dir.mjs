import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.env.FIRERACUNI_DATA_DIR ?? "data/e2e");

await rm(dataDir, { recursive: true, force: true });
await mkdir(dataDir, { recursive: true });
