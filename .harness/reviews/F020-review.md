# Code Review — F020 (C4 Container)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F020-c4-container`. Target: PR.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across all changes.

### 8-Angle Architectural & Code Review:
1. **Correctness**:
   - C4 Level 2 containers model applications, backend services, databases, and message queues under a parent system via `parentId = system.id`.
   - Technology tags and container types are properly stored in metadata and projected onto canvas nodes.
   - Drill-down helper `canDrillToComponents` accurately restricts component drill-down to application and service containers.
   - API E2E tests confirm that containers and inter-container connections persist with exact roundtrip identity.
2. **Edge Cases**:
   - Stores (databases, queues) are created with `sto_` prefix, applications/services with `app_` prefix.
   - Deletion of parent system correctly unlinks children (`onDelete: SetNull`) without orphaned database foreign key violations.
   - Async connections (e.g. to message queues) are rendered with animation flag on canvas edges.
3. **Lifecycle & Cleanup**:
   - API tests properly clean up created test workspaces and organizations via Prisma in `afterAll`.
   - React Flow node components attach standard connection handles cleanly.
4. **Performance**:
   - `projectC4ContainerToCanvas` performs single-pass linear bounding-box calculation and node positioning in O(N).
   - Fast Map/Set lookups for filtering inter-container connections.
5. **Typing & Zero `any`**:
   - Strict TypeScript everywhere; zero explicit `any`.
   - Node props fully adhere to `@xyflow/react` type requirements (`selectable`, `deletable`, `draggable`).
6. **Architectural Boundaries**:
   - Rule 1: Layer dependencies strictly inward toward `packages/domain`.
   - Rule 2: API routes validate input with DTOs and enforce tenant authorization with RBAC (`canWrite`).
   - Rule 3 & 4: Canvas holds zero domain entities in Zustand; `ArchitectureModelClient` manages the domain model independently.
7. **Accessibility & UX**:
   - Custom test IDs on container nodes (`c4-app-node`, `c4-service-node`, `c4-database-node`, `c4-queue-node`, `drill-to-components-btn`).
   - Distinct visual color schemes and badges for different container types (emerald for web/mobile apps, blue for services, amber for databases, purple for queues).
   - Template strings avoid React SSR split text comment nodes (`<!-- -->`).
8. **Error Handling & Concurrency**:
   - Default fallbacks for missing technology or container kind metadata.

## Verification
- Monorepo tests: PASS (21 test files passed in API [178 tests], 9 test files in domain [92 tests], 21 test files in web [209 tests]).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
