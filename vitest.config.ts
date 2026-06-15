import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// Shared `@` -> src alias for both projects.
const alias = { "@": new URL("./src", import.meta.url).pathname };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        // Node project: data layer, API routes, pure logic. These touch
        // better-sqlite3 + the filesystem, so they must run in Node.
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.browser.test.{ts,tsx}"],
        },
      },
      {
        // Browser project: renders real DOM/CSS in headless Chromium via the
        // Playwright provider. Used for visual/layout assertions on the PDF
        // template. Chromium comes from PLAYWRIGHT_BROWSERS_PATH (the shared
        // cache populated by the `playwright install chromium` postinstall).
        resolve: { alias },
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.{ts,tsx}"],
          browser: {
            enabled: true,
            // --no-sandbox is required to run Chromium as root in the container.
            provider: playwright({
              launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
            }),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
