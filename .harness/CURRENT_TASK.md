# CURRENT TASK: F019 — C4 Context

## Status: IN PROGRESS

## Feature
**F019 — C4 Context** (Phase 03 — Architecture Model)

Level 1 C4 Context diagram & model elements: person/actor, system, external system, and their relationships.
- User can create Person (Actor), Software System, and External System elements.
- User can connect Person -> System and System -> External System with descriptive labels.
- Elements render with C4-compliant visual styling (Person avatar/shape, System box, External System boundary tag).
- Elements persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.
- Drill-down capability from a System into its C4 Container view (Level 2).

## Scope

### Domain Layer (`packages/domain/src/`)
- C4 Context domain definitions & helpers:
  - `C4ContextElementKind`: 'person' (actor), 'system', 'external_system'.
  - Helper functions to create C4 Context nodes (`createC4Person`, `createC4System`, `createC4ExternalSystem`).
  - Helper to identify C4 Context elements and drill-down capability (`canDrillDown(object)`).

### API Layer (`apps/api/src/`)
- Ensure `/architectures/:id/objects` and `/architectures/:id/connections` seamlessly handle C4 Context elements and metadata (`external: boolean`, `c4Level: 1`).
- Verify endpoints for C4 Context operations in E2E tests.

### Web Client Layer (`apps/web/`)
- Custom C4 Context Node Component:
  - `components/canvas/c4-context-node.tsx`: custom React Flow node with C4 styling for Person (actor), System, and External System.
  - Drill-down button / trigger on System nodes to navigate into the Container view (`/workspace/:id/views?level=2&systemId=:sysId` or drill handler).
  - Edit and delete actions.
- C4 Context View & Toolbar Integration:
  - Add C4 Context elements creation controls to the canvas / architecture interface.
  - Drill-down event handling.
- Tests in `apps/web/c4-context.spec.ts` and `apps/api/src/architectures/c4-context.e2e.spec.ts`:
  - Create person + system + external system.
  - Connect Person -> System.
  - Reload persists identical model.
  - Drill down from system to container view.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)

## Started
2026-09-26

## Next Task
F020 — C4 Container.
