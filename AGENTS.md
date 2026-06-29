# FireRacuni — Internal Invoicing App

## Conventions

### Imports

Use `@/` for all imports — no relative paths. The `@` alias maps to `src/`.

### Scaffolding

Never hand-write files that a CLI tool would generate (Shadcn components, Astro integrations, etc.). Use the official CLI/init command. If the command is interactive and can't be run non-interactively, list the exact commands for the human to run and wait — don't try to replicate what the tool does by hand.

### Kysely (database)

Use Kysely's **typed query builder** — never raw `sql` template literals for standard CRUD. The typed builder catches column typos at compile time:

```ts
// correct
await db.selectFrom('companies').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
await db.insertInto('companies').values(data).returningAll().executeTakeFirstOrThrow();
await db.updateTable('companies').set(updates).where('id', '=', id).execute();

// wrong — defeats the purpose of Kysely
await sql`SELECT * FROM companies WHERE id = ${id}`.execute(db);
```

**Type generation:** After writing or modifying a migration, run `pnpm run db:generate` to regenerate `src/lib/db.generated.ts` via `kysely-codegen`. This file is committed. `getDb()` returns `Kysely<DB>` where `DB` is the generated interface.

**Migration workflow:** Write migration → `pnpm run db:migrate` → `pnpm run db:generate` → commit all three (migration file, updated generated types, code that uses the new tables).

**Runtime data directory:** The app uses `FIRERACUNI_DATA_DIR` as the single root for SQLite, generated PDFs, uploads, and other persisted files. The local default is `data/`; Docker production mounts `../fracuni-data-production` to `/data` and sets `FIRERACUNI_DATA_DIR=/data`. Do not introduce separate production paths for the DB, PDFs, or uploads.

**Testing data directory:** Always run tests against a test data directory, never the default application data directory. Set `FIRERACUNI_DATA_DIR` to an obvious test path before any test command that can touch SQLite or persisted files. The Playwright E2E setup uses `data/e2e`; Vitest helpers should use in-memory SQLite and temporary file directories, or another explicit test data directory. Do not run migrations or tests against `data/` unless the human explicitly asks for that exact operation.

### Data access modules

- One file per domain entity, plural name: `companies.ts`, `clients.ts`, `invoices.ts`
- Export typed functions: `createCompany(data)`, `listCompanies()`, `getCompany(id)`, etc.
- No manual row mappers — Kysely's typed results + CamelCasePlugin handle this
- Validate inputs at the API boundary (Astro API routes), not in the data layer

### API routes

- Validate all inputs. Use Zod schemas for request bodies, return 400 with specific messages on failure.
- Guard `Number(params.id)` against NaN.
- Wrap `request.json()` in try/catch — return 400 if not valid JSON.
- Never pass unvalidated user input directly to the data layer.

### Database schema conventions

- Nullable columns for "not set" — don't use `NOT NULL DEFAULT ''`. Empty string and null are semantically different.
- Add UNIQUE constraints where the domain demands uniqueness (OIB, email, etc.).
- Snake_case column names in SQLite; CamelCasePlugin handles the mapping.

### Worktree setup

When working in a fresh worktree (e.g. tmux workers), run `pnpm install --frozen-lockfile` before anything else.

### Sandbox constraints

LLM agents run in a sandboxed container. No Docker commands. Do not start watchers, dev servers, or other long-running processes manually and leave them running. Build, test, and one-shot commands work fine, including E2E test commands such as `pnpm run test:e2e` that start and stop their own temporary web server.

## Agent skills

### Issue tracker

Issues are tracked as local markdown files in `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
