# Current Task: F119 — Roadmap items

**Status**: NOT STARTED

## Description
Architecture roadmap items (milestones, target quarters Q1/Q2/..., releases) linked to architecture changes and models.
- Feature ID: F119
- Phase: 07 — Versioning (Final feature of Phase 07!)
- Dependencies: F055, F057, F059, F061
- Acceptance criteria:
  - Roadmap items (Q1/Q2/...) linked to architecture changes
  - Test: a roadmap item links to a change.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F119 acceptance criteria.
2. In `packages/domain/src/`, implement architecture roadmap engine (`roadmap-items.ts`):
   - Interfaces: `ArchitectureRoadmapItem`, `RoadmapQuarter`, `createRoadmapItem`, `linkRoadmapItemToChange`, `unlinkRoadmapItemFromChange`, `getRoadmapItemsForChange`.
   - Unit tests in `packages/domain/src/roadmap-items.test.ts`.
3. In `apps/web/`, implement roadmap item components:
   - `<RoadmapItemCard />` and `<RoadmapTimeline />`.
   - Web integration specs in `apps/web/roadmap-items.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
