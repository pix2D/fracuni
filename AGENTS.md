# FireRacuni — Internal Invoicing App

## Conventions

### Imports

Use `@/` for all imports — no relative paths. The `@` alias maps to `src/`.

### Scaffolding

Never hand-write files that a CLI tool would generate (Shadcn components, Astro integrations, etc.). Use the official CLI/init command. If the command is interactive and can't be run non-interactively, list the exact commands for the human to run and wait — don't try to replicate what the tool does by hand.

### Sandbox constraints

LLM agents run in a sandboxed container. No watchers, no Docker commands, no long-running processes. Build, test, and one-shot commands work fine.

## Agent skills

### Issue tracker

Issues are tracked as local markdown files in `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
