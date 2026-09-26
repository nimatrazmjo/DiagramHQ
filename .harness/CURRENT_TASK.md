# CURRENT TASK: F021 — C4 Component

## Status: IN PROGRESS

## Feature
**F021 — C4 Component** (Phase 03 — Architecture Model)

Level 3 C4 Component diagram & model elements: components inside a container (+ Level 4 code mapping stub).
- User can create components inside a parent Container (`parentId = container.id`).
- Components capture technology, interface definitions, responsibilities, and component kind.
- User can drill down from a Container (Level 2) into its C4 Component view (Level 3).
- Component view renders the enclosing Container boundary and internal components with technology badges.
- L4 code mapping stub (links to repository/code files, stubbed for Phase 09).
- Components and inter-component connections persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `c4-component.ts`:
  - `C4ComponentKind`: 'component' | 'controller' | 'service' | 'repository' | 'module'.
  - `C4ComponentNodeData`: interface with label, componentKind, technology, description, containerId, codeMappingStub.
  - Helpers: `createC4Component`.
  - Predicates: `isComponent`, `isComponentOfContainer`, `getContainerComponents`.
  - Projection: `projectC4ComponentToCanvas`.
- `c4-component.test.ts`: unit tests.

### API Layer (`apps/api/src/`)
- `c4-component.e2e.spec.ts`:
  - Create parent Container under a System.
  - Create child Components under that Container (`parentId = container.id`).
  - Inter-component connections and model snapshot reload identity.
  - Deletion handling.

### Web Client Layer (`apps/web/`)
- Custom C4 Component Node:
  - `components/canvas/c4-component-node.tsx`: custom React Flow node with C4 styling for components.
  - `components/canvas/c4-container-boundary-node.tsx`: boundary node encasing components in Level 3.
- Register node types in `components/canvas/custom-nodes.tsx`.
- Tests in `apps/web/c4-component.spec.ts`.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)
