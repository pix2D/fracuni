# Playwright's official image ships the pinned Chromium build plus all the OS
# libraries it needs, and a Node runtime — the analog of the old Puppeteer base
# image. The tag is pinned to match the `playwright` version in the lockfile so
# the library and browser revision stay in lockstep. Browsers live at
# /ms-playwright (PLAYWRIGHT_BROWSERS_PATH is preset by the image), so the
# `playwright install chromium` postinstall is a no-op during the build.
FROM mcr.microsoft.com/playwright:v1.61.0-noble

USER root

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
