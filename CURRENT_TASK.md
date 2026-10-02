# Current Task: F085 — Architecture linting

**Status**: NOT STARTED

## Description
Architecture linting engine for DiagramHQ (Phase 11 — Drift and Governance):
- Lint the architecture model against standard architectural best practices and structural rules:
  - Orphaned objects (components/systems with no incoming or outgoing connections).
  - Missing descriptions / missing technology metadata.
  - Redundant or cyclic connections where prohibited.
  - Invalid parent-child containment hierarchy (e.g. system inside component).
  - High blast radius / high unmanaged coupling warnings.
- Structured findings:
  - Severity levels: `error`, `warning`, `info`.
  - Category: `structural`, `metadata`, `security`, `naming`, `best-practice`.
  - Grounded location: target object or connection ID, property name, rule ID, message, remediation suggestion.
- Summary and metrics:
  - Total violations, error count, warning count, info count, clean score.
- Acceptance criteria & tests:
  - Findings at error/warning/info against the rules.
  - Test: seeded violations produce expected lint findings; a clean model is clean.

- Feature ID: F085
- Phase: 11 — Drift and Governance
- Dependencies: Phase 03, Phase 09, Phase 10

## Next Steps
1. In `packages/domain/src/`, implement the architecture linting engine (`linting.ts`):
   - Type definitions: `LintRule`, `LintSeverity`, `LintFinding`, `LintReport`.
   - Built-in canonical rules: orphaned objects, missing metadata/technology, invalid hierarchy nesting, disconnected stores.
   - Core runner: `lintArchitectureModel(model, config?)`.
   - Unit tests in `packages/domain/src/linting.test.ts` verifying seeded violations and clean model.
2. In `apps/web/`, implement canvas UI components:
   - `<ArchitectureLintModal />` in `apps/web/components/canvas/lint-panel.tsx`.
   - Integration specs in `apps/web/linting.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
