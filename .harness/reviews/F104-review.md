# Review: F104 — Advanced RBAC

## Reviewer Checklist
- [x] Pure domain boundary respected: `@diagramhq/domain` has zero framework or runtime dependencies.
- [x] Fine-grained roles beyond base catalog:
  - 5 built-in enterprise specialized roles (`Security Auditor`, `Documentation Specialist`, `Compliance Officer`, `Junior Architect`, `Billing Administrator`).
  - Dynamic `CustomRole` model supporting custom permissions and explicit denials.
- [x] Principle of Least Privilege:
  - Strict deny-by-default for all ungranted actions.
  - Explicit Deny overrides Allow precedence.
  - Automated risk auditor (`auditRoleLeastPrivilege`) identifying over-permissioned roles and suggesting mitigations.
- [x] Acceptance criteria satisfied:
  - "Fine-grained roles beyond the base catalog; least privilege"
  - "Test: a fine-grained role denies an out-of-scope action."
  - Explicit tests in domain (`src/advanced-rbac.test.ts`) and web (`advanced-rbac.spec.tsx`) verify that Security Auditor denies `model:edit_object`, Documentation Specialist denies `workspace:delete`, and Billing Administrator denies `architecture:view`.
- [x] Quality gates passing:
  - `pnpm typecheck` passed (0 errors)
  - `pnpm lint` passed (0 errors)
  - `pnpm check-architecture` passed
  - Domain tests passed: 13/13 tests in `advanced-rbac.test.ts` (666 total)
  - Web tests passed: 5/5 tests in `advanced-rbac.spec.tsx` (595 total)
  - Production build passed

## Decision
APPROVED. Ready for merge to `main`.
