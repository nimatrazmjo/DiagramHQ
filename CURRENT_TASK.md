# Current Task: F087 — Dependency analysis

**Status**: NOT STARTED

## Description
Architecture dependency graph and path analysis engine for DiagramHQ (Phase 11 — Drift and Governance):
- Dedicated dependency graph computation:
  - Directed graph representation of all components, services, datastores, and systems.
  - Classification filters: `direct`, `indirect`, `runtime`, `compile-time`, `data`, `external`.
  - Path traversal & analysis:
    - Finds all paths and shortest paths between any two model nodes (`findDependencyPaths`).
    - Detects indirect and transitive dependencies across multiple service hops.
    - Cyclic dependency detection using Tarjan's strongly connected components or DFS back-edge detection (`detectDependencyCycles`).
- Acceptance criteria & tests:
  - Dedicated graph; filters: direct/indirect/runtime/compile-time/data/external
  - Test: cyclic dependency detected; indirect path found.

- Feature ID: F087
- Phase: 11 — Drift and Governance
- Dependencies: Phase 03, Phase 09, Phase 10

## Next Steps
1. In `packages/domain/src/`, implement the dependency analysis engine (`dependency-graph.ts`):
   - Type definitions: `DependencyKind`, `DependencyEdge`, `DependencyPath`, `DependencyCycle`, `DependencyGraphReport`.
   - Core algorithms: Cycle detection (`detectDependencyCycles`), Path finding (`findDependencyPaths`), Dependency filtering (`filterDependencyGraph`).
   - Unit tests in `packages/domain/src/dependency-graph.test.ts` verifying cyclic dependency detection and indirect path discovery.
2. In `apps/web/`, implement canvas UI components:
   - `<DependencyAnalysisModal />` in `apps/web/components/canvas/dependency-panel.tsx`.
   - Integration specs in `apps/web/dependency.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
