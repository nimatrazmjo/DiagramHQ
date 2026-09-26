# Project State

> **MASTER FILE. Every Harness session reads this FIRST, before doing anything.**
> Then: CURRENT_TASK.md → ROADMAP.md → the active phase file → DECISIONS.md + BLOCKERS.md → then inspect the actual code (the codebase is the source of truth for what EXISTS; these files are the source of truth for intended state + history). If they disagree, inspect, correct these files, and note the discrepancy in CHANGELOG.md.

## Product
Name: DiagramHQ
Description: Model-first architecture intelligence platform (a "better than IcePanel" Architecture OS). The model — objects + connections — is the product; diagrams are projections of it. Full spec: `product/PRODUCT.md`. CLI: `dhq`.

## Current Phase
Phase: 01
Phase Name: Foundation
Status: IN PROGRESS

## Current Feature
Feature ID: F001
Feature Name: Project architecture (monorepo scaffold + clean baseline)
Status: NOT STARTED (queued — first task; details in CURRENT_TASK.md)

## Overall Progress
Total Features: 135
Completed: 0
In Progress: 0
Blocked: 0
Not Started: 135
Progress: 0.0%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
None. No application code has been written yet. The repository currently contains only the `.harness/` tracking + rules system.

## Current Work
Persistent tracking system established (this file + ROADMAP.md + CURRENT_TASK.md + CHANGELOG.md + DECISIONS.md + BLOCKERS.md + phases/). No feature implementation has begun.

## Next Task
F001 — Project architecture. Stand up the pnpm monorepo (apps/web, apps/api, packages/domain, packages/config) and make `init` green. See CURRENT_TASK.md.

## Last Verified
N/A — no application code exists to verify. `init` will be the first verification once F001 begins.

## Current Git Commit
None — the repository is not yet a git repo. First build session should run `git init`, then record branch + commit here every session (see `rules/conventions.md`).
Working tree: N/A.

## Important Notes
- Model-first is non-negotiable (DEC-001 / ADR-0001). Diagrams never store objects.
- Build one feature at a time; phases are gated (finish + test a phase before the next). See ROADMAP.md phase order.
- No feature is COMPLETE without recorded evidence (CHANGELOG.md) and an Evaluator pass (`verification/`).
- Statuses are exactly: NOT STARTED, IN PROGRESS, BLOCKED, IN REVIEW, COMPLETE, DEPRECATED.

## Active Blockers
None. See BLOCKERS.md.

## Architecture Status
NOT STARTED. Target layers + boundaries defined in `architecture/ARCHITECTURE.md` and `rules/layer-boundaries.md`.

## Database Status
NOT STARTED. Schema designed in `architecture/DATA_MODEL.md` (Postgres + Prisma; tenant-isolated; model_objects + model_connections adjacency, ADR-0003). Lands in F006.

## API Status
NOT STARTED. Target surface in `architecture/API_SURFACE.md`. NestJS skeleton lands in F007.

## Frontend Status
NOT STARTED. Next.js + React Flow (behind CanvasRenderer, ADR-0002). Shell lands in F008; canvas in Phase 02.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
NOT STARTED. Per-feature tests required (contract in `verification/acceptance-evidence.md`). CI wired during Phase 01.

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
