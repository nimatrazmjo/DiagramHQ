# Current Task: F067 — Security analysis

**Status**: NOT STARTED

## Description
AI-driven architectural security review engine. Evaluates the architecture model graph for security anti-patterns, data privacy violations, and network perimeter risks:
- Unauthenticated public ingress endpoints (public/internet actors accessing internal services directly without gateway/auth termination)
- PII and sensitive data transit leakage (PII flowing across unencrypted or unapproved channels or stored in unencrypted stores)
- Missing authentication / authorization on sensitive inter-service communication
- Insecure direct object references or cross-tenant data flow violations
- Synthesizes actionable security risk findings with severity ratings (critical, high, medium, low) and remediation recommendations
- Strict invariant: AI security findings match seeded issues and structural security analysis.

- Feature ID: F067
- Phase: 08 — AI Copilot
- Dependencies: Phase 03, Phase 04, Phase 05, Phase 07, F062, F066
- Acceptance criteria:
  - Find PII paths, public endpoints, missing auth; narrate risks
  - Test: AI security findings match seeded issues.

## Next Steps
1. In `packages/domain/src/`, implement AI security review engine (`ai-security.ts`):
   - Interfaces: `SecurityFinding`, `SecurityAnalysisReport`, `auditArchitectureSecurity`.
   - Seeded issue detection: unauthenticated ingress, cleartext/missing auth on PII paths, unencrypted sensitive stores.
   - Unit tests in `packages/domain/src/ai-security.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<SecurityFindingCard />` and `<AISecurityDrawer />`.
   - Integration specs in `apps/web/ai-security.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
