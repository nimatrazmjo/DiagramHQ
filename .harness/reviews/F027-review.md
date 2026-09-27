# Code Review — F027 (Queue)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F027-queue`. Target: PR.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across all changes.

### 8-Angle Architectural & Code Review:
1. **Correctness**:
   - `Queue` element models message queues and event brokers (`kind: 'store'`, metadata `storeKind: 'queue'`, ID prefix `sto_`).
   - Supports parent application linkage (`parentId: ObjectId | null`), allowing queues to be embedded or standalone.
   - QueueKind, technology, topics list, and partitions are preserved in metadata and rendered.
   - API E2E tests confirm CRUD lifecycle, async connections, and reload verification.
2. **Edge Cases**:
   - Handles optional metadata fields (`technology`, `topics`, `partitions`, `retentionPolicy`, `description`) gracefully.
   - Clean discrimination in `isQueue` distinguishing generic stores and databases.
   - Connection deletion cascade when a Queue is deleted.
3. **Lifecycle & Cleanup**:
   - API test resources are dismantled cleanly in `afterAll`.
   - Node components do not register long-lived window listeners.
4. **Performance**:
   - `projectQueueToCanvas` runs in O(1) time per queue entity.
5. **Typing & Zero `any`**:
   - Strict TypeScript everywhere; zero explicit `any`.
   - Explicit types `QueueMetadata`, `QueueNodeData`, `CreateQueueOptions`, `ProjectQueueOptions`.
6. **Architectural Boundaries**:
   - Layer 1: Domain types independent of any UI or framework dependencies.
   - Layer 2: API routes validate input with DTOs and enforce tenant authorization.
   - Layer 3 & 4: Canvas renders nodes via React Flow; domain model persists independently.
7. **Accessibility & UX**:
   - Dedicated `QueueNode` with `data-testid="queue-node"`, `data-testid="queue-kind-badge"`, `data-testid="queue-technology"`, `data-testid="queue-topics"`.
   - Distinctive visual styling with queue-specific gradients and border highlights.
   - SVG icons include `aria-hidden="true"`.
8. **Error Handling & Concurrency**:
   - Non-fatal fallbacks for labels and metadata values.

## Verification
- Monorepo tests: PASS (28 test files passed, 222 tests passing).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
