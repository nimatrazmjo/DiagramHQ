# Current Task: F090 — Security architecture

**Status**: NOT STARTED

## Description
Security architecture model and analysis engine for DiagramHQ (Phase 11 — Drift and Governance):
- Deep security model: trust boundaries, public endpoints, auth/authz schemes, encryption (in-transit/at-rest), secrets management, compliance classifications (PII / PCI / HIPAA), and compliance zones
- Flag security exposures (e.g. unauthenticated public endpoints, unencrypted data stores with PII, cross-boundary connections missing TLS/auth, unmanaged secrets)
- Acceptance criteria:
  - Trust boundaries, public endpoints, auth/authz, encryption, secrets, PII/PCI/HIPAA, compliance zones
  - Test: security model renders boundaries + flags exposures.

- Feature ID: F090
- Phase: 11 — Drift and Governance
- Dependencies: F086, F087

## Next Steps
1. In `packages/domain/src/`, implement `security-architecture.ts`:
   - Data types for TrustBoundary, SecurityClassification, SecurityExposure, SecurityPolicy
   - `analyzeSecurityArchitecture(model)` → returns `SecurityArchitectureReport` with trust boundaries, exposed public endpoints, unencrypted sensitive stores, compliance flags
   - Unit tests in `packages/domain/src/security-architecture.test.ts`
2. In `apps/web/`, implement canvas UI:
   - `<SecurityArchitectureModal />` in `apps/web/components/canvas/security-architecture-panel.tsx`
   - Integration specs in `apps/web/security-architecture.spec.tsx`
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
