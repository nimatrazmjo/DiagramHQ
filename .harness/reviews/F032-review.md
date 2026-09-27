# Feature Review: F032 — Context diagrams

## Summary
- **Feature ID**: F032
- **Feature Name**: Context diagrams
- **Phase**: Phase 04 — Diagrams and Views
- **Status**: APPROVED

## Scope Checklist
- [x] Context diagram view type (Level 1) defined in `packages/domain/src/view.ts`.
- [x] View creation endpoint `POST /architectures/:id/views` with `kind: 'context'`.
- [x] RBAC enforcement: viewers cannot create or delete views (HTTP 403 Forbidden).
- [x] Model-first architecture: an object can be assigned to multiple context diagrams (`viewObject` relation).
- [x] Object deletion isolation: removing an object from one diagram retains it in other diagrams and retains it in the architecture model.
- [x] Views listing endpoint `GET /architectures/:id/views`.
- [x] Unit tests in `packages/domain/src/view.test.ts` and `apps/web/context-diagram.spec.ts`.
- [x] API E2E tests in `apps/api/src/views/context-diagram.e2e.spec.ts`.

## Test Results
- Domain tests: PASS
- API tests: PASS (32 files, 242 tests)
- Web tests: PASS (27 files, 263 tests)
- Lint & Typecheck: PASS
- Architecture checks: PASS
- Production build: PASS

## Architecture Integrity
- Domain package maintains zero runtime dependencies.
- Model-first rule strictly enforced: views are saved query/layout projections over the model; deleting objects from views never deletes model entities.
