# AGENTS.md — Operating Contract

You are a coding agent building **DiagramHQ**. This file overrides your defaults. Read it fully. If a request conflicts with this contract, follow the contract and say so.

## What DiagramHQ is
A model-first architecture intelligence platform. The **model** (objects + connections) is the product; diagrams are projections of it. Never build the diagram as the database (DEC-001). Full vision: `product/PRODUCT.md`.

## Read this order, every session (before touching code)
1. `PROJECT_STATE.md` — MASTER FILE. Where the project is right now.
2. `CURRENT_TASK.md` — the one feature to work on and its exact next step.
3. `ROADMAP.md` — all 135 features across 13 phases, with status.
4. The active phase file under `phases/` — acceptance criteria for the current feature.
5. `DECISIONS.md` + `BLOCKERS.md` — what's decided, what's stuck.
6. **Then inspect the actual code.** The codebase is the source of truth for what EXISTS; the tracking files are the source of truth for intended state + history. If they disagree: inspect, correct the tracking files, and note the discrepancy in `CHANGELOG.md`.

## The ten rules
1. **Tracking before memory.** Never rely on conversation history. The `.harness/` tracking files are the state of the project. Read them first; update them before you stop.
2. **One feature at a time.** Work only the single feature that is `IN PROGRESS` (named in `PROJECT_STATE.md`, detailed in `CURRENT_TASK.md`). Do not start the next until the current one is verified.
3. **No victory without evidence.** A feature is `COMPLETE` only when every acceptance criterion in its phase file is met AND verification is recorded in `CHANGELOG.md`. "It should work" is not evidence.
4. **Respect layer boundaries.** Obey `rules/layer-boundaries.md`. Domain is pure; the canvas renders the model and never mutates persistence directly. Cross-layer imports are a defect.
5. **Stay in scope + phase.** `rules/scope-guard.md` lists what is off-limits for the current phase. Phases are gated (ROADMAP order). Don't build a later phase's features now.
6. **Modular and expandable.** New object types, view types, importers, exporters, and AI actions register against interfaces (`architecture/MODULES.md`); they do not edit the core. If adding a feature forces a core edit that a registry should handle, the abstraction is wrong.
7. **Separate maker from checker.** After implementing (maker), switch to the Evaluator role (`verification/roles.md`) and score honestly against `verification/evaluator-rubric.md`. You may not approve your own work by assertion.
8. **Persist state every session.** Before stopping, update `PROJECT_STATE.md`, `CURRENT_TASK.md`, `ROADMAP.md` (+ the phase file), and `CHANGELOG.md`; open/close anything in `BLOCKERS.md`; record decisions in `DECISIONS.md`. See `rules/conventions.md` and the Session-completion protocol below.
9. **Small, reversible steps.** Thinnest vertical slice that is demonstrable. Commit per feature on `feat/<FID>` with the message format in `rules/conventions.md`. No drive-by refactors. After a feature passes: push, open/reuse a PR, review it, and fix findings until clean before starting the next feature (`loops/pr-review-loop.md`).
10. **Observability is not optional.** Structured logs at startup, boundaries, and errors (`scripts/SCRIPTS.md` → logger). If you can't see why it failed, add a log before you add a fix.

## Statuses (use ONLY these)
`NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IN REVIEW` · `COMPLETE` · `DEPRECATED`. No "almost done", "mostly working", "probably fine".

## The loop you run
```
read PROJECT_STATE + CURRENT_TASK + ROADMAP + phase file  ->  confirm the ONE IN PROGRESS feature
  ->  write/confirm sprint-contract  ->  implement (Maker)
  ->  verify (typecheck, lint, tests, check-architecture)  ->  score as Checker (evaluator-rubric)
  ->  pass? record evidence in CHANGELOG, mark COMPLETE in ROADMAP + phase file
      fail? log defects, revise, repeat (bounded rounds)
  ->  push branch, open/reuse PR, review it (code-review skill, loops/pr-review-loop.md)
      clean? pick next feature
      issues? fix (Maker), commit, push, review again (bounded rounds)
  ->  update PROJECT_STATE + CURRENT_TASK + BLOCKERS  ->  stop cleanly
```
The explicit version, with routing rules, is `graph/workflow-graph.md`.

## Definition of done (per feature)
- Every acceptance criterion in the phase file met.
- Verification recorded in `CHANGELOG.md` (reproducible command/output or artifact path).
- No layer-boundary violation (`scripts/SCRIPTS.md` → check-architecture passes).
- Evaluator score >= threshold (`verification/evaluator-rubric.md`).
- `ROADMAP.md` + phase file marked `COMPLETE`; `PROJECT_STATE.md` + `CURRENT_TASK.md` updated; committed on `feat/<FID>`.
- Branch pushed, PR opened/reused, reviewed clean, no unresolved findings (`loops/pr-review-loop.md`).

## Session-completion protocol (do all of this before you stop)
1. Determine exactly what was implemented and run the appropriate tests.
2. Update the feature status (phase file) and phase status.
3. Update `ROADMAP.md` (checkbox + counts) and `CURRENT_TASK.md`.
4. Update `PROJECT_STATE.md` (current phase/feature, progress, last verified, git commit).
5. Add a `CHANGELOG.md` entry (feature ID + evidence).
6. If the feature just went `COMPLETE`: push the branch, open (or reuse) its PR, review it, and fix findings — repeat until clean before touching the next feature (`loops/pr-review-loop.md`).
7. Update `BLOCKERS.md` and `DECISIONS.md` if anything changed.
8. Record git branch/commit (or `Working tree: DIRTY`) in `PROJECT_STATE.md`.
9. Clearly set the next task in `CURRENT_TASK.md`.

## Usage / session limits
When you hit a usage or session limit, do not just stop: run the Session-completion protocol above (commit + update the tracker), then fail over to the other runtime per `RUNTIME-CONTINUITY.md` (Claude Code ⇄ Antigravity running Sonnet). The next runtime resumes from `PROJECT_STATE.md`.

## Hard stops (ask a human)
- A change would delete user data or break a public API contract.
- Scope/acceptance is ambiguous and the files don't resolve it.
- Maker-checker has failed the same feature for the max rounds (`loops/loop-state.md`).

## Tech stack (locked for MVP)
TypeScript everywhere. Frontend: Next.js (App Router), React, Tailwind, shadcn/ui, Zustand (canvas/UI state), TanStack Query (server state). Canvas: React Flow behind a `CanvasRenderer` interface (ADR-0002/DEC-003). Backend: NestJS, PostgreSQL (model + adjacency, DEC-002/ADR-0003), Redis, Prisma. No dependency that isn't justified by the active feature.
