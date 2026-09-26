# Session Handoff

Rewrite this at the end of every session so a cold agent can resume without you. Keep it short and current — it is read first, before feature_list.json.

## Last updated
2026-09-25 — feature_list.json expanded to the full 6-phase master checklist (no build session has run yet)

## Where we are
The harness is complete and now carries the full product scope: **83 features across 6 gated phases** in `feature_list.json` (P1 Core product, P2 Collaboration, P3 Architecture intelligence, P4 AI, P5 Code & infrastructure intelligence, P6 Enterprise). Each feature has acceptance + a specific test + a spec-section ref + an evidence slot; each phase has a goal, a headline flow, and a `testGate` (implement AND test before advancing). No application code exists yet — `apps/`, `packages/`, `infra/` are not created. The repo is `.harness/` only.

## The one active feature
`p1-scaffold` — Monorepo scaffold + clean baseline. See its acceptance in `feature_list.json` (phase P1).

## Do this next (first build session)
1. Read `AGENTS.md`, then this file, then `feature_list.json`.
2. Write/confirm `verification/sprint-contract.md` for `p1-scaffold`.
3. Scaffold the pnpm monorepo per `architecture/ARCHITECTURE.md` §repository shape (apps/web, apps/api, packages/domain, packages/config).
4. Wire `pnpm typecheck`, `pnpm lint`, `pnpm test`; make them pass. Implement the `init` + `check-architecture` contracts (`scripts/SCRIPTS.md`) and run `init` green.
5. Update the command table in `CLAUDE.md` with the real commands.
6. Record evidence, mark `p1-scaffold` passed, set `p1-data-model` active, rewrite this file.

## Phase discipline (new)
Build P1 to completion — every P1 feature `passed` with evidence AND the P1 `testGate` green (headline flow: model a system context->container->component, lay out, inspect/edit, save, reload, export PNG) — before any P2 feature goes active. Same gate between every phase.

## Decisions already made (do not relitigate without an ADR)
- Model-first (ADR-0001). React Flow now, Pixi later behind CanvasRenderer (ADR-0002). Postgres adjacency, no graph DB yet (ADR-0003). Stack locked in AGENTS.md. Name = DiagramHQ; CLI = `dhq`.

## Blockers
None.

## Deferred / parking lot
- Auth provider choice (Auth.js vs Clerk vs WorkOS) — decide during `p1-auth-tenancy`, note the ADR.
- Anything outside Slice 1 — see `rules/scope-guard.md`.
