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
Feature ID: F006
Feature Name: Database foundation (next; F007 also unblocked)
Status: NOT STARTED (details in CURRENT_TASK.md)

## Overall Progress
Total Features: 135
Completed: 1
In Progress: 0
Blocked: 0
Not Started: 134
Progress: 0.7%
(Recompute from ROADMAP.md on every status change; counter contract in `scripts/SCRIPTS.md`.)

## Last Completed Work
F001 — Project architecture. pnpm monorepo (web/api/domain/config) + Docker + CI. Verified: typecheck/lint/test(4)/build green; independent subagent review passed after fixes. Lives on branch `feat/F001-project-architecture` (commits 1e817c4 + 6fc63c4). NOT yet merged or pushed.

## Current Work
None in progress. Session paused after F001 (user continues in Claude Code).

## Next Task
F006 — Database foundation (F007 also unblocked). Merge F001 to main first. See CURRENT_TASK.md.

## Last Verified
F001 @ 6fc63c4 — pnpm typecheck / lint / test (4) / build all green. Docker NOT built (no Docker in the sandbox; run `docker compose build` on a machine with Docker).

## Current Git Commit
main @ f2e3e5f (harness). Branch feat/F001-project-architecture @ 6fc63c4 (F001). Working tree CLEAN.
Merge + push are pending — do them from Claude Code with your GitHub credentials.

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
Scaffolded (NestJS 10 + health endpoint). Full surface from F007. Not yet wired to the domain/DB.

## Frontend Status
Scaffolded (Next.js 14 standalone shell). React Flow canvas in Phase 02. Tailwind/shadcn deferred to the UI phase.

## Backend Status
NOT STARTED. NestJS + Prisma + Redis. Foundation in Phase 01.

## Testing Status
Vitest wired; 4 tests passing (domain + api). GitHub Actions CI runs lint/typecheck/test/build.

## Integration Status
NOT STARTED. Code integrations Phase 09; infrastructure Phase 10. None connected.
