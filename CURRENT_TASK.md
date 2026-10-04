# Current Task: F107 — Enterprise security

**Status**: COMPLETE

## Description
Enterprise Security, Hardening & Compliance Checklist (Phase 13 — Enterprise):
- Cryptographic Hardening & Resilience (`@diagramhq/domain`):
  - Authenticated AES-256-GCM encryption at rest with Customer-Managed Encryption Keys (CMEK) via KMS, envelope encryption, and automated 90-day key rotation (`EncryptionAtRestConfig`).
  - Transport security enforcing minimum TLS 1.3, 1-year HSTS preload, and Perfect Forward Secrecy (`EncryptionInTransitConfig`).
  - Automated continuous Point-In-Time Recovery (PITR) with 30-day retention, multi-region replication, WORM ransomware protection, and automated restore drill simulator (`simulateBackupRestoreDrill`).
  - NIST SP 800-88 Rev 1 compliant cryptographic shredding (`executeCryptoShredding`) with active legal hold preservation safeguards.
  - Enterprise Security Review Checklist evaluation engine (`evaluateEnterpriseSecurityChecklist`) scoring 14 controls across 6 domains (Network/Transport, Cryptography, Identity & Access, Audit Logging, Resilience/DR, Vulnerability Management) against SOC2, ISO 27001, and NIST SP 800-53 benchmarks.
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/enterprise-security-modal.tsx`: Interactive modal with executive KPI ribbon, multi-domain checklist filters, live DR drill simulator, and crypto-shredding tester.
  - `apps/web/components/enterprise/index.ts`: Exported `EnterpriseSecurityModal`.
- Acceptance criteria:
  - Encryption, backup, retention, export controls, security review checklist
  - Test: the enterprise security checklist passes.

- Feature ID: F107
- Phase: 13 — Enterprise
- Dependencies: None

## Evidence
- Domain: `packages/domain/src/enterprise-security.ts`, `packages/domain/src/enterprise-security.test.ts` (10 tests passing)
- Web: `apps/web/components/enterprise/enterprise-security-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/enterprise-security.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F107-PR.md`, `.harness/reviews/F107-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F108 — Private deployment** (Deployable to a customer VPC, air-gapped config, deployment docs & smoke tests)
