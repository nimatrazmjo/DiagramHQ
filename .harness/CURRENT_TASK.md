# CURRENT TASK: F030 — Object metadata (COMPLETE)

## Status: COMPLETE

## Completed Feature
**F030 — Object metadata** (Phase 03 — Architecture Model)
- Full metadata schema for architecture model objects in `packages/domain/src/object-metadata.ts`.
- Schema includes identity, ownership, technical, classification, risk & compliance, SLA/RTO/RPO, documentation/repository, and lifecycle transition tracking.
- Domain unit tests verifying schema, default values, option arrays, and merging logic.
- Inspector panel component in `apps/web/components/shell/inspector-panel.tsx` with full field inputs and tab structure.
- Inspector unit tests covering state toggling, field input modifications, and event emission.

## Pull Request
- PR #31 prepared and verified clean across test suites, linters, and builds.

## Next Feature
- **F031 — Object lifecycle** (Phase 03 — Architecture Model)
