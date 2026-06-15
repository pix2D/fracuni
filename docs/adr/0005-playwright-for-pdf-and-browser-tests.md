# Playwright for PDF generation and browser tests

Supersedes [ADR-0003](./0003-puppeteer-for-pdf-generation.md).

The PDF approach is unchanged: render one HTML/CSS template through headless Chromium, one template → two language outputs. What changed is the driver — **Playwright instead of Puppeteer**.

**Why switch.** We want real in-browser tests (rendering the PDF template, and React islands, in an actual browser). Vitest's only first-class browser provider is Playwright (`@vitest/browser` + `@vitest/browser-playwright`). Since Playwright has to be in the project anyway for tests, keeping Puppeteer *as well* would mean two browser-automation stacks and two Chromium builds. Consolidating the production PDF renderer onto Playwright removes that duplication. PDF generation is Chromium-only/headless-only in both libraries, so nothing is lost on the rendering side.

**Browser provisioning.** Modern Playwright does **not** download a browser on `npm`/`pnpm install` (the package has no install lifecycle hook — verified). The browser is fetched only by an explicit `playwright install`. We encode that need in the project so `pnpm install` is the whole contract:

```json
"scripts": { "postinstall": "playwright install chromium" }
```

Browsers land in `PLAYWRIGHT_BROWSERS_PATH` (a shared/persistent cache in the dev sandbox; `/ms-playwright` in the production image), so the postinstall is a fast no-op once cached — no per-container redownload. The production image uses the official `mcr.microsoft.com/playwright` base (pinned to the lockfile's Playwright version), which already carries the matching Chromium and its OS libraries.

**Testing.** `vitest.config.ts` defines two projects: a **node** project (data layer, API routes, the PDF pipeline — they need `better-sqlite3` + the filesystem and a real Chromium launch) and a **browser** project (`*.browser.test.ts`, run in headless Chromium via the Playwright provider) for DOM/computed-style/layout assertions on the template.

**Architecture for testability.** The Playwright call lives in a thin `pdf-renderer.ts` (`HTML → PDF buffer`); the rest of the pipeline takes the renderer as an injected dependency, so most tests run with a fake renderer (fast, deterministic) while a small integration test exercises real Chromium end-to-end.
