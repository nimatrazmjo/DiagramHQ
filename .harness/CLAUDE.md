# CLAUDE.md — Session Bootstrap

Quick reference. `AGENTS.md` is the full contract; this is the checklist you run every session.

## On session start (in order)
1. Read `PROJECT_STATE.md` — the master file. Where we are.
2. Read `CURRENT_TASK.md` — the one feature + its exact next step.
3. Read `ROADMAP.md` — the feature list + statuses.
4. Read the active phase file under `phases/` — acceptance criteria.
5. Read `DECISIONS.md` + `BLOCKERS.md`.
6. Run `init` (see `scripts/SCRIPTS.md`) to confirm a clean baseline.
7. **Inspect the actual code.** Never trust the tracking files blindly — the codebase is the truth for what exists. If they disagree, correct the tracking files and note it in `CHANGELOG.md`.

## The one rule you break most often
Work the ONE feature that is `IN PROGRESS`. Evidence before you move on. Don't "quickly also add" the next thing.

## Where things live
| I need to know... | Read |
|---|---|
| Where the project is right now | `PROJECT_STATE.md` (master) |
| What to do next | `CURRENT_TASK.md` |
| The whole feature list + status | `ROADMAP.md` |
| Acceptance for the current feature | the active `phases/PHASE-XX-*.md` |
| What's been shipped | `CHANGELOG.md` |
| What's decided (don't relitigate) | `DECISIONS.md` (+ `architecture/decisions/` ADRs) |
| What's stuck | `BLOCKERS.md` |
| Why / for whom | `product/PRODUCT.md`, `product/PERSONAS.md` |
| How it's structured / the data shape | `architecture/ARCHITECTURE.md`, `DATA_MODEL.md` |
| What I may import | `rules/layer-boundaries.md` |
| What's off-limits now | `rules/scope-guard.md` |
| How I prove it works | `verification/evaluator-rubric.md`, `acceptance-evidence.md` |

## Commands
The app does not exist yet. As you scaffold it (F001), keep this table current — it's the first thing the next agent needs.

| Action | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` (all apps in parallel) |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Test | `pnpm test` |
| Build | `pnpm build` |
| Verify baseline | `./scripts/init.sh` (install + typecheck + lint + test) or `pnpm verify` |
| Containers | `docker compose up --build` (or `make up`) |
| Check boundaries | see `scripts/SCRIPTS.md` → check-architecture (implemented from F018) |
| Progress % | see `scripts/SCRIPTS.md` → progress-counter (contract; manual for now) |

## Current target
**Phase 01 — Foundation. Feature F001 — Project architecture** (monorepo scaffold + clean baseline). Details: `CURRENT_TASK.md`.

## Before you stop
Run the Session-completion protocol in `AGENTS.md`: update PROJECT_STATE, CURRENT_TASK, ROADMAP (+ phase file), CHANGELOG, BLOCKERS/DECISIONS as needed; leave the tree clean (`state/clean-state-checklist.md`); commit on `feat/<FID>`.
