# CURRENT TASK: F025 — Component

## Status: IN PROGRESS

## Feature
**F025 — Component** (Phase 03 — Architecture Model)

Object type: Component.
- User can create, edit, delete, and render a Component in the architecture model.
- Model object with `kind = 'component'` and ID prefix `cmp_`.
- Component-specific properties: componentKind (controller, service, repository, middleware, handler, utility, component), technology, interfaces, codeRef, description, and optional parent application/container linkage (`parentId`).
- Renders with dedicated Component styling (indigo theme, kind badge, technology tags, interface listing, codeRef indicator).
- Inter-component and component-to-store/queue connections.
- Full CRUD operations persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `component.ts`:
  - `ComponentMetadata`: interface with componentKind, technology, interfaces, codeRef, description.
  - `ComponentNodeData`: interface with label, componentKind, technology, interfaces, codeRef, description, parentId, componentId.
  - Helpers: `createComponent`, `isComponent`.
  - Projection: `projectComponentToCanvas`.
- `component.test.ts`: unit tests for component creation, technology, interfaces, parent linkage, and canvas projection.

### API Layer (`apps/api/src/`)
- `component.e2e.spec.ts`:
  - Create component (under a parent container/application and standalone).
  - Update component (interfaces, technology, codeRef).
  - Connect components (service calling repository).
  - Delete component (cascades connections).
  - Snapshot reload identity (`isModelIdentical`).

### Web Client Layer (`apps/web/`)
- Custom Component Node Component:
  - `components/canvas/component-node.tsx`: custom React Flow node with component styling, technology tags, interfaces, codeRef indicator, and handles.
- Register node type in `components/canvas/custom-nodes.tsx` (`component`).
- Tests in `apps/web/component.spec.ts`:
  - Rendering component with technology, interfaces, codeRef.
  - Client model CRUD operations and reload identity.
  - Canvas mounting.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.
- 8-angle code review (`.harness/reviews/F025-review.md`).
- PR creation and merge into main.
