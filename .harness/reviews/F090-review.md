# F090 — Security Architecture — Review

**Status**: APPROVED  
**Date**: 2026-10-02  
**Reviewer**: Harness Auto-Review

## Acceptance Criteria Checklist

- [x] Trust boundaries, public endpoints, auth/authz, encryption, secrets, PII/PCI/HIPAA, compliance zones
- [x] Test: security model renders boundaries + flags exposures (3 unit tests pass)
- [x] Automatic discovery and classification of trust boundaries (`untrusted`, `dmz`, `trusted`, `restricted`, `critical`)
- [x] Public ingress audit identifying unauthenticated public endpoints
- [x] Sensitive data store classification (PII, PCI, HIPAA, GDPR, SOC2) and encryption-at-rest auditing
- [x] Secrets management evaluation (managed vs unmanaged/hardcoded)
- [x] Cross-boundary network connection analysis (detecting unencrypted plaintext transit or missing auth)
- [x] Compliance zone mapping with component enrollments
- [x] Canvas UI: `<SecurityArchitectureModal />` with score badge, 6 KPI cards, 6 tabs (Exposures, Boundaries, Endpoints, Encryption, Compliance, Cross-Boundary), and live search
- [x] 3 domain unit tests — all pass
- [x] 3 web integration tests — all pass
- [x] Exported from `@diagramhq/domain` and canvas `index.ts`

## Notes

- Security score computation is balanced and deterministic: starts at 100 with tiered deductions for critical (-25), high (-10), medium (-5), and low (-2) findings.
- Trust boundary inference handles both explicit metadata annotations and structural heuristics (actors = public internet, public endpoints = DMZ ingress, stores = restricted data zone).
- All 1,278 monorepo tests pass cleanly with zero regressions.

## Verdict

COMPLETE — merged to `main`.
