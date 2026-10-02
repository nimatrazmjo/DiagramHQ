# Current Task: F069 — AI architecture review

**Status**: NOT STARTED

## Description
AI-driven automated architectural pull request reviewer and governance gate agent. Performs pre-merge automated checklist audits on architectural change sets and model versions:
- Circular dependencies detection across components and subsystems
- Missing owners audit (every new/modified component must have designated team ownership)
- Unapproved external dependencies inspection (identifying external actors/services not on the approved vendor list)
- Backup & Disaster Recovery (DR) compliance check (ensuring persistent datastores have registered replica or backup configurations)
- PII exfiltration check (preventing PII transmission directly to third-party endpoints)
- Verdict generation: `APPROVE`, `REQUEST_CHANGES`, or `COMMENT` with comprehensive violation narrative and actionable remediation checklist.

- Feature ID: F069
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 07 (F060), Phase 11 (F085)
- Acceptance criteria:
  - Pre-merge checklist: no circular dep, owners present, no unapproved external dep, backup/DR, no PII to third parties
  - Request-changes verdict
  - Test: seeded violations produce the expected verdict.

## Next Steps
1. In `packages/domain/src/`, implement AI architecture review engine (`ai-architecture-review.ts`):
   - Types: `ArchitectureReviewRule`, `ArchitectureReviewViolation`, `ArchitectureReviewVerdict`, `ArchitectureReviewReport`.
   - Review functions: `runArchitectureReview(context, changeSet?, options?)`.
   - Seeded checks: circular dependency cycles, missing team ownership, unapproved external system boundaries, missing backup/DR metadata on stores, PII data flows crossing to third-party domains.
   - Unit tests in `packages/domain/src/ai-architecture-review.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<ArchitectureReviewModal />` and `<ReviewVerdictBadge />`.
   - Integration specs in `apps/web/ai-architecture-review.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
