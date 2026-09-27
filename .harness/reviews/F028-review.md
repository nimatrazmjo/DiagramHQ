# Code Review — F028 (Group)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F028-group`. Target: PR.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across all changes.

### 8-Angle Architectural & Code Review:
1. **Correctness**:
   - `Group` element models architectural boundaries and groups (`kind: 'group'`, ID prefix `grp_`).
   - Supports nesting via `parentId: ObjectId | null`.
   - Cycle prevention is enforced: creating or updating a group's `parentId` to one of its descendants/ancestor cycle is rejected with HTTP 400.
   - API E2E tests confirm group creation, nesting, cycle prevention, reload verification, and SetNull un-nesting on deletion.
2. **Edge Cases**:
   - Handles optional metadata fields (`color`, `collapsed`, `childCount`, `description`) gracefully.
   - Clean discrimination in `isGroup`.
   - Cycle detection handles arbitrarily deep trees.
3. **Lifecycle & Cleanup**:
   - API test resources are dismantled cleanly in `afterAll`.
   - Node components do not register long-lived window listeners.
4. **Performance**:
   - `projectGroupToCanvas` runs in O(1) time per group entity.
5. **Typing & Zero `any`**:
   - Strict TypeScript everywhere; zero explicit `any`.
   - Explicit types `GroupMetadata`, `GroupNodeData`, `CreateGroupOptions`, `ProjectGroupOptions`.
6. **Architectural Boundaries**:
   - Layer 1: Domain types independent of any UI or framework dependencies.
   - Layer 2: API routes validate input with DTOs and enforce tenant authorization and cycle prevention.
   - Layer 3 & 4: Canvas renders nodes via React Flow; domain model persists independently.
7. **Accessibility & UX**:
   - Dedicated `GroupNode` with `data-testid="group-node"`, `data-testid="group-kind-badge"`, `data-testid="group-child-count"`.
   - Distinctive visual styling with dashed border boundaries and subtle backdrops.
   - SVG icons include `aria-hidden="true"`.
8. **Error Handling & Concurrency**:
   - Non-fatal fallbacks for labels and metadata values.

## Verification
- Monorepo tests: PASS (29 test files passed, 227 tests passing).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
