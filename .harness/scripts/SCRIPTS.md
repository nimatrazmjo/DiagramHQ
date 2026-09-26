# Script Contracts

These are **contracts, not code** (this harness ships no code). Each script is specified by purpose, inputs, behavior, output, and exit code. The first build session implements them as real scripts under `scripts/` at the repo root and wires them into the commands in `CLAUDE.md`. The Evaluator verifies each implementation against its contract.

Convention for all: exit `0` = success, non-zero = failure with a human-readable reason on stderr. Structured (json) logs on stdout where noted. No script mutates `.harness/` rule files.

---

## init
- **Purpose**: verify a clean, reproducible baseline before any work. The "start" half of `state/clean-state-checklist.md`.
- **Inputs**: none (reads repo state).
- **Behavior**: install deps if needed; run typecheck, lint, test, and `check-architecture`; confirm `ROADMAP.md` is well-formed with exactly one `IN PROGRESS` feature; print the active feature + next step from the handoff.
- **Output**: a short readiness summary.
- **Exit**: `0` if the baseline is clean and buildable; non-zero listing exactly what is not.
- **Used by**: every session start; the goal loop; the timer loop.

## check-architecture
- **Purpose**: enforce `rules/layer-boundaries.md`. The scope-control spine of Project 04.
- **Inputs**: the source tree (`apps/`, `packages/`).
- **Behavior**: build/inspect the import graph and assert each rule in `layer-boundaries.md` — domain imports nothing framework-specific; canvas imports no persistence/API-server; canvas mutates only via commands; UI state holds no domain data; Prisma only under `apps/api`; core iterates registries rather than switching on built-in enums.
- **Output**: a list of violations (file -> forbidden import -> rule number), or "clean."
- **Exit**: `0` if no violations; non-zero with the list. A non-zero result blocks marking any feature `passed`.
- **Used by**: init; verify node in the workflow graph; the maker-checker Checker.

## logger (contract, not a script)
- **Purpose**: runtime observability (Projects 04 + 06). "If you can't see why it failed, add a log before you add a fix."
- **Shape**: structured json lines: `{ ts, level, event, correlationId, ...ids }`.
- **Emit at**: process start (config + versions), each layer-boundary crossing (API request in/out, job start/end), and every caught error with its cause and the ids involved.
- **Rule**: a correlation id flows from an API request through any job it spawns. No `console.log` debugging left in committed code (clean-state red flag).

## benchmark
- **Purpose**: measure whether the harness is actually helping (Project 06 capstone). Compares agent runs with vs. without harness discipline on a fixed task set.
- **Inputs**: a task set (start with Slice 1 features) and a mode flag (`--with-harness` / `--baseline`).
- **Behavior**: run the task set, then score results against each feature's acceptance + the evaluator rubric; count features that actually pass and boundary violations introduced.
- **Output**: a table: features attempted, passed-with-evidence, violations, rounds used.
- **Exit**: `0` when the run completes (pass/fail is in the report, not the exit code).
- **Used by**: periodic health/ablation checks, not the build loop.

## cleanup-scanner
- **Purpose**: keep quality maintainable between sessions (Project 06 cleanup pass).
- **Inputs**: the source tree.
- **Behavior**: report dead code, unused deps/exports, TODOs that imply out-of-scope work, files over the size guideline, and `.harness` docs that are stale relative to the code they describe (e.g. an endpoint missing from `API_SURFACE.md`).
- **Output**: a findings list, grouped by severity. Report-only — never auto-edits.
- **Exit**: `0` always (advisory); findings go to the timer loop's report policy.
- **Used by**: the daily timer loop.

---

## Implementation order
`init` and `check-architecture` come with `F001` (the loop needs them immediately). `logger` lands with the first API/worker code. `benchmark` and `cleanup-scanner` are useful once there is enough code to measure — implement them by the end of Phase 1, not before an active feature needs them (scope-guard).


## progress-counter
- **Purpose**: keep `PROJECT_STATE.md` progress honest (spec step 20). A contract for now (no code yet, DEC-006); the build agent implements it.
- **Inputs**: `ROADMAP.md`.
- **Behavior**: count features by status (COMPLETE / IN PROGRESS / BLOCKED / NOT STARTED) from the ROADMAP checkboxes + phase files; compute Progress % = COMPLETE / total.
- **Output**: the counts + percentage, written into `PROJECT_STATE.md` "Overall Progress" and `ROADMAP.md` "Progress".
- **Exit**: `0` always (advisory).
- **Used by**: session-completion protocol; the timer loop.
- **Note**: until implemented, maintain the counts by hand on every status change.
