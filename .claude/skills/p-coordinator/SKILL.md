---
name: p-coordinator
description: FireRacuni-specific worktree dispatcher. Invoked as `/p-coordinator <feature>`. Reads `.scratch/<feature>/PRD.md` and `.scratch/<feature>/issues/`, finds which issues are merged vs pending, dispatches whatever is currently eligible (deps merged into the base branch) in parallel as a single batch, sequences merges 1→N, then loops to propose the next batch — one invocation walks every batch to completion, each gated by `go`, until no issues remain pending.
allowed-tools: Bash, Read, Write
disable-model-invocation: true
---

# /p-coordinator — FireRacuni feature dispatcher

You wrap `/coordinator` with a FireRacuni-specific outer layer. The
outer layer reads our PRD/issue structure and decides what to
dispatch. The inner mechanics — spawn, monitor, send `/merge` —
follow `/coordinator`'s conventions. Read `/coordinator`'s
SKILL.md and treat its `workmux` usage patterns as canonical.

## Hard rule: the issues are the plan

Issues in `.scratch/<feature>/issues/*.md` were carefully crafted
from a PRD via `/to-issues`. They ARE the plan. Do not
re-interpret, re-decompose, summarise into prompts, or add extra
guidance. The prompt files this skill generates are mechanical:
they point each agent at its issue file plus the canonical
`dispatch.md` template, verbatim. Nothing more. This binds the
inner machinery too — don't let `/coordinator`'s spawn pattern
author its own prompts.

## 1. Locate and ground

Extract `<feature>` from the user's message. Verify:

- `.scratch/<feature>/PRD.md` exists
- `.scratch/<feature>/issues/` exists with `*.md` files

Missing either → stop. Tell the user to run `/to-prd` and
`/to-issues` first.

Read the PRD for context. Skim it for global constraints that
affect dispatch (layering, scope boundaries). If the PRD
contradicts how the issues describe themselves, flag it — don't
guess which to trust.

### Resolve the base branch

Every merge check below is relative to a **base branch** — the branch
your worktrees fork from and merge back into. It is **not** hardcoded
to `main`. Resolve it once, now, and reuse the same value everywhere:

```bash
BASE=$(git branch --show-current)   # branch checked out in the primary
                                     # worktree when you were invoked
```

Empty result (detached HEAD) → stop; tell the user to check out a
branch. This mirrors `workmux add`, whose `--base` defaults to the
current branch. Pin `$BASE` for the whole batch: pass it explicitly on
every `workmux add` (step 7) and use it in every `git log` / `git
rev-parse` below, so spawning, classification, and merge-detection all
agree. If you're on `prototypes`, the batch integrates onto
`prototypes`; `main` is never touched.

## 2. Classify each issue: merged / pending

For every `.md` in `.scratch/<feature>/issues/`:

1. `git log "$BASE" --oneline --grep "Issue: <NN>-<slug>"` — the
   issue's filename without `.md` (e.g. `01-dashboard-smoke-change`).
   `dispatch.md` has each agent stamp this exact trailer on its
   implementation commit, and `/merge` fast-forwards it onto `$BASE`,
   so a match is the authoritative "this landed" signal. Non-empty →
   merged.
2. Else read the issue's `Status:` line (`done` per
   `docs/agents/triage-labels.md`). This lives in gitignored
   `.scratch` and never reaches `$BASE`, so it's the agent's
   self-report, not proof of merge — weaker than the trailer.
3. Conflict resolution — the trailer (did the commit land?) and the
   `Status:` line (did the agent mark it done?) should agree. When
   they don't, it's a tracker inconsistency: surface it and stop. The
   user resolves it, you don't (never edit the Status yourself):
   - **Trailer present + `Status:` not `done`** → stop and ask. The
     commit landed but the Status was never flipped (agent skipped
     it, or someone reset it). The Status must be corrected; don't
     move on without asking.
   - **`Status: done` + no trailer** → stop and ask. The agent marked
     it done but no matching commit is on `$BASE`: not merged yet, the
     merge failed, the agent omitted the trailer, or the Status was
     hand-edited prematurely.

Print a status table:

```
01-foundation        merged    (in <base>: abc1234)
02-cli-skill-add     pending
...
```

## 3. Parse dependencies

Each issue has a `## Blocked by` section: either
`None — can start immediately.` or a bullet list of issue file
paths. Extract the dep filenames per issue.

Missing or malformed section → stop. The issue file needs fixing
via `/to-issues`.

## 4. Find this batch's eligible issues

Eligible = every dep is **merged into the base branch** (not just
branched).

```
Eligible now: 02, 04, 05
Blocked:      06 (needs 02), 07 (needs 02,03)
```

Empty eligible set → stop. Something downstream is blocked — either
a dependency hasn't merged yet, or a skipped/aborted issue is holding
up everything after it. The human resolves it before the loop can
continue. (This is distinct from "every issue merged" — that's the
done case, handled in step 10.)

## 5. Propose, then wait for "go"

Show the table + eligible set. Stop. Wait for the user to type
`go`. Do not spawn yet.

On the first batch you reach this straight from invocation; on later
batches the step-10 loop lands you here. Either way this proposal is
the per-batch gate — it's how you ask whether the user is ready to
move on before spawning.

## 6. After "go": write prompt files

For each eligible issue, write
`.scratch/<feature>/prompts/<NN>-<slug>.md` containing:

```
Your issue: .scratch/<feature>/issues/<NN>-<slug>.md
```

followed by `.scratch/dispatch.md` verbatim. That's the entire
prompt — no extra context, no summarisation.

Stable path inside `.scratch/` (not `$TMPDIR`) so the path is
identical inside and outside the container.

Write ALL prompt files before spawning any agent.

## 7. Spawn the batch

Per agent:

```bash
workmux add <slug> --base "$BASE" -b --prompt-file .scratch/<feature>/prompts/<NN>-<slug>.md
```

`--base "$BASE"` pins the fork point to the branch resolved in step 1,
rather than relying on workmux's current-branch default (the operator
may switch branches in the primary worktree mid-batch). `/merge` then
rebases onto and fast-forwards `$BASE`.

Always `-b`. Set `dangerouslyDisableSandbox: true` on every
`workmux add` Bash call — workmux writes `branch.X.workmux-base`
to `.git/config`, which the host sandbox hard-denies.

Confirm all agents reached `working`:

```bash
workmux wait <slug>... --status working --timeout 120
```

## 8. Sequence the merges

Implementation runs in parallel. Merges run **strictly serially
in issue-number order** (1, 2, 3, …), regardless of finish order.

For each issue `i` in sorted numeric order:

1. Wait for agent `i` to be `done`:
   `workmux wait <slug-i> --timeout 7200`.
2. **Read the agent's final report before firing `/merge`**:
   `workmux capture <slug-i> -n 400`. Scan the tail (the
   agent's wrap-up message, not the tool-call noise above it).
   `done` means "agent stopped" — it does NOT mean "did exactly
   what the issue said". The agent often leaves caveats. You
   are looking for anything that isn't a clean "shipped as
   specced":

   - explicit questions or follow-ups posed to the user
   - hedges: "differs from the spec", "had to deviate",
     "you might prefer", "decided to", "skipped X because",
     "alternatively", "consider", "note that"
   - reported deviations from the issue's acceptance criteria
   - TODO/FIXME notes the agent flagged for later
   - partial completion: "could not", "didn't get to",
     "left as", "not yet"

   Anything non-trivial → **pause the sequence**. Quote the
   relevant excerpt back to the human and ask:

   ```
   Agent <slug-i> reports done but left feedback. Excerpt:

   <quoted tail>

   Reply `merge` to fire /merge anyway, `skip` to drop it
   from the batch, `abort` to stop, or describe what to do.
   ```

   Move to step 3 only on `merge` (after the human OKs it) or
   skip the issue on `skip`. A clean tail (issue done, no
   caveats, no questions) → go straight to step 3 without
   asking.
3. Fire `/merge --keep` and verify in one atomic sequence —
   snapshot, send once, poll. `--keep` is required (see
   Sandbox). `workmux wait --status done` is unreliable here:
   without teardown the agent flips `done → working → done` and
   the orchestrator can race past either edge. Success means
   `$BASE` HEAD now equals the branch's HEAD (rebase +
   fast-forward landed `<slug-i>` on top of `$BASE`). Plain
   "HEAD advanced" is not enough — an unrelated push to `$BASE`
   during the poll would falsely look like success. 30-min cap;
   clean merges land in seconds, rebases with conflicts can
   take much longer or escalate.

   ```bash
   prev=$(git rev-parse "$BASE")
   workmux send <slug-i> "/merge --keep"
   for i in {1..360}; do
     base_head=$(git rev-parse "$BASE")
     branch_head=$(git rev-parse <slug-i> 2>/dev/null || echo "")
     if [ -n "$branch_head" ] && \
        [ "$base_head" = "$branch_head" ] && \
        [ "$base_head" != "$prev" ]; then
       break
     fi
     [ "$(workmux status <slug-i> 2>/dev/null)" = "waiting" ] && break
     sleep 5
   done
   ```

   Outcomes:

   - **`$BASE` HEAD == branch HEAD and != prev** → succeeded.
     Move to `i+1`.
   - **`waiting`** → conflict or verify failure the agent can't
     decide alone. Pause the whole sequence:

     ```
     Agent <slug-i> needs you. Check its pane.
     Reply `continue` after resolving (verify `$BASE` HEAD ==
     branch HEAD before continuing), `skip` to drop it, or
     `abort` to stop.
     ```

     Move to `i+1` only on `continue` or `skip`.
   - **Cap elapsed, not `waiting`, no match** → real stall or
     `$BASE` was mutated by someone else mid-flight. Investigate.

## 9. Cleanup pass

`--keep` also skips `/merge`'s dirty-tree protection, so a
successful merge can still leave uncommitted/untracked files in
the worktree. `workmux remove` would trash them. Before
prompting, check each merged worktree:

```bash
for slug in <merged>; do
  wt=$(git worktree list | awk -v b="[$slug]" '$0 ~ b {print $1}')
  dirty=$(git -C "$wt" status --porcelain 2>/dev/null)
  [ -n "$dirty" ] && echo "$slug DIRTY" && echo "$dirty"
done
```

List the merges with their state and gate on operator approval:

```
Batch merges landed:
  <slug-a> → abc1234   clean
  <slug-b> → def5678   DIRTY (N files)

Reply `clean` to tear down (dirty trees included),
`hold` to leave for inspection.
```

On `clean`, for each merged slug:

```bash
workmux remove <slug>
```

`dangerouslyDisableSandbox: true` required (writes
`.git/config`). If a remove errors or surfaces unexpected
output, surface it and stop — don't retry.

On `hold`, skip cleanup. Skipped/aborted slugs are NEVER
auto-cleaned.

## 10. Report, then loop to the next batch

Print the batch report:

```
Batch complete.
  Merged:  <list>
  Skipped: <list>
  Aborted: <list, if any>
  Cleaned: <list of removed worktrees, or "held — manual cleanup needed">
```

Then keep going — a single `/p-coordinator` invocation walks every
batch to completion:

- **Every issue merged into `$BASE`** → the feature is done. Say so
  and stop.
- **Issues still pending** → loop back to **step 2** with the same
  pinned `$BASE`. This batch's merges now carry `Issue:` trailers on
  `$BASE`, so they reclassify as merged and the next batch's
  eligibility recomputes. Steps 4–5 propose the next batch and wait
  for `go` — the gate where the human approves each batch before any
  spawn. (If step 4's eligible set is empty while issues remain
  pending, everything left is blocked by a skipped/aborted issue —
  report the blocker and stop.)

The human gates fire on every batch: `go` before spawn, per-agent
merge review, cleanup approval.

## Sandbox & the `--keep` requirement

Two workmux verbs need `dangerouslyDisableSandbox: true` because
they write `.git/config` (host sandbox hard-denies):

- `workmux add` — stores `branch.X.workmux-base`.
- `workmux remove` — used in step 9.

`workmux status` / `wait` / `capture` / `send` work without
bypass.

**Why `/merge --keep`:** plain `/merge` does the worktree
teardown (close tmux window, remove worktree dir, delete branch)
as part of the same invocation that's running inside the pane it
just told tmux to close. The host tmux SIGKILLs every process in
the dying pane, including the merge's own cleanup subprocess —
orphaning the worktree dir, branch, and `.git/config`
workmux-base entry. Doesn't matter whether the operator or an
agent fired the command, or whether the pane is host-side or
containerised; the host runs tmux, the race fires on the host.
`--keep` skips the teardown; step 9 does it from a separate
pane where the race can't fire. Filed upstream; keep `--keep`
until the fix ships.

## What you must NOT do

- Don't author your own prompts. The issue file is the plan;
  the agent reads it directly.
- Don't merge out of order, advance batches without operator
  `go`, or spawn issues whose deps aren't on the base branch.
- Don't `workmux remove` without operator `clean` in step 9;
  don't auto-clean skipped or aborted slugs.
- Don't drop `--keep` from `/merge` (see Sandbox).
- Don't read or modify the agents' source code. You orchestrate.

## Files this skill touches

- `.scratch/<feature>/PRD.md` (read)
- `.scratch/<feature>/issues/*.md` (read)
- `.scratch/dispatch.md` (read)
- `.scratch/<feature>/prompts/*.md` (write)
- `git log <base> --grep`, `git rev-parse <base>` (run)
- `workmux add / status / wait / capture / send / remove` (run)
