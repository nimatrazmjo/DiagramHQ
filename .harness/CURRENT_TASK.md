# CURRENT TASK: F035 — Dynamic views (COMPLETE)

## Status: COMPLETE

## Completed Feature
**F035 — Dynamic views** (Phase 04 — Diagrams and Views)
- Dynamic view filter engine implemented in `packages/domain/src/view-filter.ts` and exported in `@diagramhq/domain`.
- Filters across 12 criteria: team, technology, environment, domain, owner, status/lifecycle, tag/tags, criticality, data-classification, cloud, region, repository.
- Pure domain unit tests in `packages/domain/src/view-filter.test.ts` and `packages/domain/src/view.test.ts`.
- API endpoints supporting dynamic projections (`GET /views/:id/objects` and `GET /views/:id/projection`) in `apps/api/src/views/views.service.ts` and `views.controller.ts`.
- 4 API integration tests in `apps/api/src/views/dynamic-views.e2e.spec.ts` verifying view creation with filters, live object projection without static references, immediate entry/exit upon object metadata modification, and layout position persistence.
- Web unit tests in `apps/web/dynamic-views.spec.ts`.

## Pull Request
- PR #36 prepared and verified clean across test suites, linters, and builds.

## Next Feature
- **F036 — Filters** (Phase 04 — Diagrams and Views)
