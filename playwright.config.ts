import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const TEST_DATA_DIR = "data/e2e";

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
    command: "node tests/e2e/setup/reset-data-dir.mjs && pnpm run db:migrate && pnpm exec astro dev --host 127.0.0.1 --port 4321",
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      FIRERACUNI_DATA_DIR: TEST_DATA_DIR,
    },
  },
});
