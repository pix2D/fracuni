import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const TEST_DB_PATH = "data/fireracuni.e2e.db";

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
    command: "node tests/e2e/setup/reset-db.mjs && pnpm run db:migrate && pnpm exec astro dev --host 127.0.0.1 --port 4321",
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      FIRERACUNI_DB_PATH: TEST_DB_PATH,
    },
  },
});
