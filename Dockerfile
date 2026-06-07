FROM ghcr.io/puppeteer/puppeteer:latest

USER root

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV HOST=0.0.0.0
ENV PORT=4321
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
