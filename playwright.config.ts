import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4322);
if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error(`PLAYWRIGHT_PORT must be a positive integer, got ${process.env.PLAYWRIGHT_PORT}`);
}

const TEST_DATA_DIR = process.env.PLAYWRIGHT_DATA_DIR ?? "data/e2e";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node tests/e2e/setup/reset-data-dir.mjs && pnpm run db:migrate && pnpm exec astro dev --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ASTRO_TELEMETRY_DISABLED: "1",
      FIRERACUNI_DATA_DIR: TEST_DATA_DIR,
    },
  },
});
