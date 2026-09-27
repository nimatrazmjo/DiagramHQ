# CURRENT TASK: F031 — Object lifecycle (COMPLETE)

## Status: COMPLETE

## Completed Feature
**F031 — Object lifecycle** (Phase 03 — Architecture Model)
- Domain state machine in `packages/domain/src/lifecycle.ts`: states (`future`, `live`, `deprecated`, `removed`), transition validator, factory, and badge color helper.
- 4 domain unit tests in `packages/domain/src/lifecycle.test.ts`.
- 4 API integration tests in `apps/api/src/architectures/lifecycle.e2e.spec.ts` covering state assignments, transition histories, and model persistence.
- 3 Web unit tests in `apps/web/lifecycle.spec.ts`.
- Database test stability enhancement in `apps/api/vitest.config.ts` via `poolOptions.forks.singleFork`.

## Pull Request
- PR #32 prepared and verified clean across test suites, linters, and builds.

## Next Feature
- **F032 — Context diagrams** (Phase 04 — Diagrams and Views)
