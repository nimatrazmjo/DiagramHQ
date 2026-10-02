# Current Task: F117 — ADR system

**Status**: NOT STARTED

## Description
Architecture Decision Record (ADR) management system with structured attributes (title, status, context, decision, consequences, alternatives), linking directly to model entities (objects, connections, change sets, versions), and surfacing full decision history when inspecting an object.
- Feature ID: F117
- Phase: 07 — Versioning
- Dependencies: F055, F057, F061
- Acceptance criteria:
  - ADR: title, status, context, decision, consequences, alternatives
  - Attach to objects/connections/changes/versions; history on an object
  - Test: create an ADR, link it, see it in history.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F117 acceptance criteria.
2. In `packages/domain/src/`, implement ADR management engine (`adrs.ts`):
   - Interfaces: `ArchitectureDecisionRecord`, `ADRStatus`, `ADRAttachmentTarget`, `createADR`, `attachADRToEntity`, `getADRHistoryForObject`.
   - Unit tests in `packages/domain/src/adrs.test.ts`.
3. In `apps/web/`, implement ADR badge and decision history drawer:
   - `<ADRBadge />` and `<ADRHistoryDrawer />`.
   - Web integration specs in `apps/web/adrs.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
