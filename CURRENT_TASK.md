# Current Task: F131 — Compliance packs

**Status**: COMPLETE

## Description
Regulatory Framework Mappings & Compliance Packs (Phase 13 — Enterprise):
- Framework Catalogs & Governance Engine (`@diagramhq/domain`):
  - Built-in framework catalogs for SOC 2 Type II, ISO/IEC 27001:2022, EU GDPR, HIPAA Security Rule, PCI DSS v4.0, NIST SP 800-53 Rev. 5, and CIS Controls.
  - Domain mapping engine: Maps regulatory controls to architecture objects, attached evidence artifacts, and designated control owners.
  - Attestation progression tracking: `not_started`, `in_progress`, `evidence_collected`, `under_audit_review`, `attested`.
  - Auditor integrity invariant: Strictly prohibits automated/synthetic 'compliant' badges. Provides readiness summaries, evidence counts, attestation metrics, and explicit auditor disclaimers (`hasAutoClaimedCompliance: false`).
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/compliance-packs-modal.tsx`: Interactive modal with framework switcher tabs, readiness KPI cards, evidence attachment, object binding, and filterable control catalog.
  - `apps/web/components/enterprise/index.ts`: Exported `CompliancePacksModal`.
- Acceptance criteria:
  - SOC2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST, CIS mappings
  - Control -> objects -> evidence -> owner -> status; never auto-claims compliance
  - Test: map a control; evidence + status shown; no false 'compliant' badge.

- Feature ID: F131
- Phase: 13 — Enterprise
- Dependencies: F085

## Evidence
- Domain: `packages/domain/src/compliance-packs.ts`, `packages/domain/src/compliance-packs.test.ts` (4 tests passing)
- Web: `apps/web/components/enterprise/compliance-packs-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/compliance-packs.spec.tsx` (3 tests passing)
- Reviews: `.harness/reviews/F131-PR.md`, `.harness/reviews/F131-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F132 — Billing & plans** (Free/Pro/Business/Enterprise tiers gate features; usage limits; test: tier gating enforced, over-limit blocked)
