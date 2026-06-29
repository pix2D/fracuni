import path from "node:path";

const DEFAULT_DATA_DIR = "data";
const DB_FILENAME = "fireracuni.db";

export function getDataDir(): string {
  return path.resolve(process.env.FIRERACUNI_DATA_DIR ?? DEFAULT_DATA_DIR);
}

export function getDbPath(): string {
  return path.join(getDataDir(), DB_FILENAME);
}

export function resolveDataPath(...segments: string[]): string {
  return path.join(getDataDir(), ...segments);
}

export function resolveDataRelativePath(relativePath: string): string | null {
  const dataDir = getDataDir();
  const resolved = path.resolve(dataDir, relativePath);
  if (resolved !== dataDir && !resolved.startsWith(dataDir + path.sep)) return null;
  return resolved;
}
