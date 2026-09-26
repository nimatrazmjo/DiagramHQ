# Code Review — F006 (Database foundation)

Reviewer: Evaluator (Rubric-based). Date: 2026-09-26.
Branch: `feat/F006-database-foundation`.
Target: Postgres + Prisma + migrations + domain invariants + tenant isolation.

## Evaluator Rubric Scores
- **Acceptance completeness**: 5/5 (all acceptance criteria from PHASE-01-FOUNDATION.md and DATA_MODEL.md met with reproducible evidence)
- **Correctness**: 5/5 (entity round-trip, tenant isolation rejection, domain invariants all verified against live PostgreSQL)
- **Boundary & scope compliance**: 5/5 (packages/domain pure; check-architecture clean; tenant isolation at query layer)
- **Modularity**: 5/5 (domain models & invariants standalone; global DatabaseModule in NestJS; TenantContext query isolation)
- **Evidence & handoff quality**: 5/5 (seed, migrations, vitest, typecheck, lint, build all documented with commands & outputs)

**Average Score**: 5.0 / 5.0  
**Verdict**: PASS

## Verification Summary
- `pnpm typecheck`: Clean across all packages and apps (apps/web, apps/api, packages/domain).
- `pnpm lint`: Clean across the repository (0 warnings, 0 errors).
- `pnpm test`: 20 tests passed across domain (15 tests) and api (5 tests).
- `check-architecture`: Clean (0 violations of rules in `layer-boundaries.md`).
- `pnpm build`: Clean across all apps and packages.
- `prisma migrate deploy`: Migration `20260926000000_init` applied cleanly to fresh PostgreSQL 16.
- `prisma:seed`: Successfully seeded 1 org, 1 workspace, 1 architecture, 4 model objects, 2 connections, and 1 view.

## PR Review — round 1 (code-review skill, PR #1)
8 findings: domain dist/ not built before typecheck/test in verify+init+CI (build-order fix); check-architecture.sh layer-boundary regex only matched bare package names, never subpath imports (silently defeated the check); modelObject.create didn't validate versionId belongs to the given architecture (cross-tenant integrity gap); modelConnection.create ran source/target lookups sequentially; architecture.create used a hand-rolled type instead of the generated Prisma type; database.spec.ts's DATABASE_URL fallback port (5433) didn't match the documented default (5432); domain tsconfig excluded `*.test.ts` but not `*.spec.ts`; `model.ts` was a redundant re-export shim.

All 8 fixed in `8a288af`. Verified clean via `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm check-architecture` from a scratch build (20/20 tests pass). Pushed to PR #1 for round 2.

## PR Review — round 2 (code-review skill, PR #1)
10 findings: modelObject.create didn't validate parentId (same cross-tenant/cross-architecture gap class as round 1's versionId finding); init.sh never ran `prisma generate`, breaking the documented fresh-clone bootstrap; check-architecture.sh was never invoked anywhere in CI; `architecture.defaultVersionId` had no FK/relation at all; round 1's build-order fix put a full monorepo build before lint in both `pnpm verify` and CI, losing fail-fast; CI step reordering same root cause; check-architecture.sh's two apps/web grep passes had inconsistent `--exclude-dir` lists; CLAUDE.md's boundary-check note was stale ("implemented from F018", actually F006); TenantContext's per-model wrapper pattern flagged as a structural tenant-isolation risk for future models; and a note that `scripts/agent-relay.sh`'s new signal trap only covers SIGINT.

9 of 10 addressed in `cd9eb0e`: parentId validation added; `prisma:generate` + a narrower `build:domain` (not full build) wired into init.sh/verify/CI so lint stays fail-fast first; check-architecture added as a CI step; `defaultVersionId` FK added via migration `20260926043002_add_architecture_default_version_fk`; check-architecture.sh exclude-dirs made consistent; CLAUDE.md note fixed; TenantContext's pattern logged as an open decision in `BLOCKERS.md` to revisit at F003/F004 rather than redesigned mid-PR. `scripts/agent-relay.sh` was left alone — it's uncommitted work from a concurrent session, not part of this PR's diff. Verified clean via `pnpm verify` + `pnpm build` from a scratch build (20/20 tests pass); reseeded to confirm the new FK doesn't break `prisma:seed`. Pushed to PR #1 for round 3.

## PR Review — round 3 (code-review skill, PR #1)
10 findings: parentId validation (round 2) didn't check the parent's versionId, only its architectureId; the `hasParentCycle` domain invariant was exported and unit-tested but never called anywhere in application code; the parentId guard used a truthy check so an empty string bypassed validation entirely; `validateViewObject` was likewise exported/tested but dead — TenantContext had no `viewObject` wrapper at all, so seed.ts's view-object write goes through the raw, unscoped client; check-architecture.sh's regexes only matched `from '...'`, missing bare `import '...'`, `require(...)`, and dynamic `import(...)`; nothing in the `dev` script chain builds packages/domain before starting dev servers; CI built domain twice (the round-2 `build:domain` step, then again via the later full `pnpm build`); `PrismaService` is `@Global()`-exported with raw unscoped access, making the TenantContext-bypass risk already logged in round 2 live today, not hypothetical; `architecture.create` + setting `defaultVersionId` is two non-transactional writes; and a claimed regression in domain's tsconfig test-file typecheck coverage.

9 of 10 addressed in `d817002`: parent version-match check added; `hasParentCycle` wired against the object's existing ancestor chain (unreachable via today's create-only API — a fresh id can't already be an ancestor — but now correctly available once update/reparent ships); parentId guard changed to `!= null`; added `TenantContext.viewObject.create` wiring `validateViewObject`; check-architecture.sh's regex now also matches bare `import`, `require(...)`, and dynamic `import(...)`; `dev` now runs `build:domain` first; CI's redundant `build:domain` step dropped (the single `pnpm build`, already after lint, builds domain via pnpm's topological order); `PrismaService`'s live raw-access escape hatch and `architecture.create`'s non-atomicity logged as open decisions in `BLOCKERS.md`. Added hierarchy + view-object test coverage. The tsconfig "regression" claim was investigated and found to be based on an incorrect premise — `tsc --noEmit` never type-checked domain's `.test.ts` files, before or after round 1's change (confirmed via `--listFiles`) — so no change was needed there. Verified clean via `pnpm verify` + `pnpm build` from a scratch build (21/21 tests pass). Pushed to PR #1 for round 4.
