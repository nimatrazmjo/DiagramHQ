# Code Review — F022 (Person)

Reviewer: PR Review Loop (Maker-Checker protocol). Date: 2026-09-26.
Branch: `feat/F022-person`. Target: PR.

## Round 1 — Findings & Fixes

Diff reviewed: `git diff origin/main...HEAD` across all changes.

### 8-Angle Architectural & Code Review:
1. **Correctness**:
   - `Person` element represents human actors (internal employees, external customers) with `kind: 'actor'` and ID prefix `act_`.
   - Role, department, email, external status, and description are properly preserved in metadata and rendered.
   - API E2E tests confirm complete CRUD lifecycle, connection to Software Systems, and reload identity (`isModelIdentical`).
2. **Edge Cases**:
   - Handles missing optional metadata fields (`role`, `department`, `email`, `description`) gracefully without rendering empty badge shells.
   - Avoids SSR React text comment delimiter bugs by wrapping text badges in single JSX expressions (`[Role: ${role}]`).
   - Connection deletion cascade when a Person is deleted.
3. **Lifecycle & Cleanup**:
   - API test resources (organizations, workspaces) are cleanly cleaned up in `afterAll`.
   - React Flow node components define handles without attaching persistent event listeners.
4. **Performance**:
   - `projectPersonToCanvas` is a direct O(1) transform per person entity.
5. **Typing & Zero `any`**:
   - Strict TypeScript everywhere; zero explicit `any`.
   - Explicit types `PersonMetadata`, `PersonNodeData`, `CreatePersonOptions`, `ProjectPersonOptions`.
6. **Architectural Boundaries**:
   - Layer 1: Domain types independent of any UI or framework dependencies.
   - Layer 2: API routes validate input with DTOs and enforce tenant authorization.
   - Layer 3 & 4: Canvas holds zero domain entities in Zustand; `ArchitectureModelClient` manages the domain model independently.
7. **Accessibility & UX**:
   - Dedicated `PersonNode` with `data-testid="person-node"`.
   - Distinctive visual styling for internal actors (pink theme) vs external actors (dashed border, amber badge).
   - SVG icons include `aria-hidden="true"`.
8. **Error Handling & Concurrency**:
   - Non-fatal fallbacks for labels and metadata values.

## Verification
- Monorepo tests: PASS (23 test files passed in API [192 tests], 11 test files in domain [100 tests], 23 test files in web [221 tests]).
- TypeScript: PASS (`pnpm typecheck` clean across monorepo).
- ESLint: PASS (`pnpm lint` clean, 0 errors/warnings).
- Architecture: PASS (`pnpm check-architecture` clean).
- Build: PASS (`pnpm build` clean across all apps and packages).

**Verdict: CLEAN.** Ready to merge into `main`.
