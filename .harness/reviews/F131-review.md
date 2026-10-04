# Feature Review Audit: F131 — Compliance Packs

## Acceptance Criteria Checklist
- [x] **Framework Catalogs**: Pre-packaged regulatory catalogs for SOC2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST 800-53, and CIS Controls.
- [x] **Control Mapping**: Domain model for binding architecture objects, evidence items, and responsible control owners to individual controls.
- [x] **Attestation Pipeline**: Explicit status progression (`not_started`, `in_progress`, `evidence_collected`, `under_audit_review`, `attested`).
- [x] **Integrity Invariant (No False 'Compliant' Badge)**: Invariant strictly upheld—system generates attestation progress and auditor disclaimers, never synthesizing a synthetic 'certified compliant' stamp.
- [x] **Test: Map a control; evidence + status shown; no false 'compliant' badge**: Fully verified in `compliance-packs.test.ts` (4 unit tests) and `compliance-packs.spec.tsx` (3 integration tests).

## Review Sign-off
- **Architectural Boundary**: Zero runtime dependencies in `@diagramhq/domain`, pure domain logic and types.
- **Component Design**: Accessible modal dialog in `@diagramhq/web` with reactive framework switching and control mapping.
- **Status**: APPROVED for merge to `main`.
