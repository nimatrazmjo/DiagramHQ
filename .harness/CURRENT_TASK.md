# CURRENT TASK: F022 — Person

## Status: IN PROGRESS

## Feature
**F022 — Person** (Phase 03 — Architecture Model)

Object type: Person (Actor).
- User can create, edit, delete, and render a Person in the architecture model.
- Model object with `kind = 'actor'`, with person-specific properties: role, department, external status, description.
- Renders with dedicated Persona styling (avatar icon, role badge, department tag, external indicators).
- Connects to Software Systems and Containers.
- Full CRUD operations persist in the architecture model independently of any diagram, reload accurately, and can be edited and deleted.

## Scope

### Domain Layer (`packages/domain/src/`)
- `person.ts`:
  - `PersonNodeData`: interface with label, role, department, external, description.
  - Helpers: `createPerson`, `isPerson`, `isExternalPerson`.
  - Projection: `projectPersonToCanvas`.
- `person.test.ts`: unit tests.

### API Layer (`apps/api/src/`)
- `person.e2e.spec.ts`:
  - Create person (customer, employee).
  - Get person by ID.
  - Update person (name, role, department).
  - Delete person (cascades connections).
  - Connect Person -> System.
  - Snapshot reload identity (`isModelIdentical`).

### Web Client Layer (`apps/web/`)
- Custom Person Node Component:
  - `components/canvas/person-node.tsx`: custom React Flow node with Persona card styling.
- Register node types in `components/canvas/custom-nodes.tsx` (`person`, `actor`).
- Tests in `apps/web/person.spec.ts`:
  - Rendering person with role, department, external flag.
  - Client model CRUD operations and reload identity.
  - Canvas mounting.

## Verification
- Monorepo checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build`.

## Owner
Control plane (this agent)
