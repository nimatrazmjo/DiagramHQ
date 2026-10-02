# Current Task: F086 — Architecture rules

**Status**: NOT STARTED

## Description
Organization-defined architecture governance rules engine for DiagramHQ (Phase 11 — Drift and Governance):
- Evaluate architecture models against organization-specific architectural policies and security rules:
  1. `OWNER_REQUIRED`: Every architecture object (application, store, service) must have a designated owner / team (`metadata.owner` or `metadata.team`).
  2. `EXTERNAL_API_AUTH`: Every exposed external interface or ingress gateway connection must specify an authentication scheme (`metadata.auth` != 'none').
  3. `NO_CROSS_SERVICE_DB_ACCESS`: Services must not directly access another service's private datastore (database-per-service pattern enforcement).
  4. `PII_FLOW_RESTRICTIONS`: Connections carrying PII or sensitive data must enforce TLS/encryption and must not flow into unapproved third-party or untrusted external systems.
- Acceptance criteria & test:
  - Rules: owner required, external API auth, no cross-service DB access, PII flow restrictions.
  - Test: a rule fires on a violating model.

- Feature ID: F086
- Phase: 11 — Drift and Governance
- Dependencies: Phase 03, Phase 09, Phase 10, F085

## Next Steps
1. In `packages/domain/src/`, implement the architecture rules engine (`rules.ts`):
   - Type definitions: `OrgArchitectureRule`, `RuleViolation`, `RuleEvaluationReport`.
   - Core rules: Owner Required, External API Auth, No Cross-Service DB Access, PII Flow Restrictions.
   - Evaluator: `evaluateArchitectureRules(model, policyConfig?)`.
   - Unit tests in `packages/domain/src/rules.test.ts` verifying each rule fires on violating models and passes on compliant models.
2. In `apps/web/`, implement canvas UI components:
   - `<ArchitectureRulesModal />` in `apps/web/components/canvas/rules-panel.tsx`.
   - Integration specs in `apps/web/rules.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
