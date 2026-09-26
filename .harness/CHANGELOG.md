# Implementation Changelog

Every completed feature and every meaningful state change is recorded here, newest first. Each entry names a feature ID (or the tracking system). No vague entries. A feature appears here as COMPLETE only after verification. (Supersedes the earlier `state/claude-progress.md`, archived under `_archive/`.)

## 2026-09-26 — F001 — Project architecture

Status: COMPLETE

Implemented:
- pnpm monorepo: apps/web (Next.js 14 standalone), apps/api (NestJS 10 + health endpoint), packages/domain (framework-free: branded ids + a connection invariant + tests), packages/config (shared ESLint preset).
- Strict TypeScript base; ESLint + Prettier + Vitest; scripts/init.sh baseline; .harness/CLAUDE.md command table filled in.
- Docker: multi-stage Dockerfiles (api via `pnpm deploy`, web via Next standalone) + docker-compose (web/api/postgres/redis) + GitHub Actions CI.

Files: 42. Commits: 1e817c4 (impl) + review-fix commit on feat/F001-project-architecture.

Verification: TypeScript PASS · Lint PASS · Unit tests PASS (4) · Build PASS · Docker build NOT RUN (no Docker in sandbox — validate with `docker compose build`).

Review: independent subagent — REQUEST CHANGES -> resolved (deploy dist inclusion, docker caching, Next outputFileTracingRoot, CI pnpm cache, typed metadata) -> APPROVE. Log: .harness/reviews/F001-review.md.

Notes: domain is source-exported (ESM/CJS interop with the CommonJS api deferred to F018); ids are a scaffold placeholder (not collision-safe across processes); Tailwind/shadcn deferred to the UI/canvas phases.

---

## 2026-09-25 — Tracking system established

Status: COMPLETE (tracking setup; not a product feature)

Implemented:
- Persistent implementation tracking system inside `.harness/`: PROJECT_STATE.md (master), ROADMAP.md (135 features across 13 phases, permanent F-IDs), CURRENT_TASK.md, CHANGELOG.md, DECISIONS.md, BLOCKERS.md, and phases/PHASE-01..13.md.
- Adopted the 13-phase F001–F108 taxonomy (+ F109–F135 for master-spec items not in the reference list); carried the acceptance criteria + tests from the retired feature_list.json into the phase files.
- Made the Markdown tracking system the single source of truth; archived the superseded feature_list.json, session-handoff.md, FEATURE_MATRIX.md, and claude-progress.md under `_archive/`.

Files: `.harness/PROJECT_STATE.md`, `ROADMAP.md`, `CURRENT_TASK.md`, `DECISIONS.md`, `BLOCKERS.md`, `phases/*` (+ repointed AGENTS.md/CLAUDE.md/README.md/scope-guard.md/PRODUCT.md and scripts/SCRIPTS.md).

Verification:
- Structure: 6 master files + 13 phase files present.
- ROADMAP counts: 135 features, 0 complete, progress 0.0%.
- No application code in the repo (all features correctly NOT STARTED).

Notes: No product feature implemented — this was the tracking-system task. Product build begins at F001.

---

## 2026-09-25 — Harness bootstrap (history)

Status: COMPLETE

Implemented (before the tracking system):
- Created the `.harness/` rules + spec system from the 8 Learn-Harness-Engineering projects: entry points, product/, architecture/ (+ 3 ADRs), rules/, verification/, loops/, graph/, scripts/.
- Wrote the DiagramHQ product spec and the initial 6-phase feature checklist (later restructured into the 13-phase ROADMAP above).

Verification: harness tree present; no application code.

Notes: Retained for history. The 6-phase feature_list.json from this work is archived under `_archive/`.
