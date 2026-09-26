# Sprint Contract — F019: C4 Context

Feature: F019 — C4 Context
Phase: Phase 03 — Architecture Model
Date: 2026-09-26

## 1. Scope & Acceptance Criteria
- [ ] User can create a Person, a System, and an External System:
  - C4 Context models and helpers in domain layer (`packages/domain`).
  - Person/Actor (`kind: 'actor'`), System (`kind: 'system'`), External System (`kind: 'system'`, `metadata: { external: true }`).
- [ ] User can connect Person -> System:
  - Valid connection between Person and System with relationship description (e.g. "Uses").
- [ ] Objects persist after reload; render correctly; can be edited and deleted:
  - Render with distinct C4 Context visual styling.
  - CRUD operations persist to backend architecture model and survive reload.
  - Can be edited (name, description, external tag) and deleted.
- [ ] Drill from a system to its containers:
  - System nodes support drill-down action leading into container view (Level 2).
- [ ] Layer Boundary Invariants:
  - Rule 1: Dependency direction strictly inward to `packages/domain`.
  - Rule 3: Canvas code mutates ONLY via client-model command layer.
  - Rule 4: Canvas holds no domain entity models in Zustand (transient UI/viewport/selection flags only).
  - Zero `any` types.
- [ ] Monorepo verification:
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-architecture`, `pnpm build` pass with zero errors.
