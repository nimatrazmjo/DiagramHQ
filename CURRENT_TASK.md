# Current Task: F108 — Private deployment

**Status**: COMPLETE

## Description
Self-Hosted Customer VPC & Air-Gapped Deployment Architecture (Phase 13 — Enterprise):
- VPC Architecture & Offline Infrastructure (`@diagramhq/domain`):
  - Customer VPC deployment profiles (AWS VPC, GCP VPC, Azure VNet, On-Premises bare metal, Air-Gapped Enclave).
  - Air-gapped zero-outbound-egress configuration (`AirGappedConfig`): internal container registry, local private AI engines (vLLM / Ollama), local embedded static assets, and offline cryptographic license validation.
  - Manifest generators: Automated generation of offline `docker-compose.yml` and Kubernetes Helm `values.yaml` with network egress filtering.
  - Clean Environment Automated Smoke Test Suite (`runPrivateDeploymentSmokeTests`): 6 automated readiness probes (Web gateway `/healthz`, NestJS API `/api/health`, PostgreSQL connection pool, S3/MinIO bucket read/write, local AI endpoint, and strict egress barrier firewall checks).
  - Deployment Documentation: `.harness/deployment/PRIVATE_DEPLOYMENT.md`.
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/private-deployment-modal.tsx`: Interactive modal with deployment status ribbon, configuration forms, manifest viewer with copy action, and live clean environment smoke test runner.
  - `apps/web/components/enterprise/index.ts`: Exported `PrivateDeploymentModal`.
- Acceptance criteria:
  - Deployable to a customer VPC; air-gapped config; deployment docs
  - Test: deploy to a clean environment; smoke passes.

- Feature ID: F108
- Phase: 13 — Enterprise
- Dependencies: None

## Evidence
- Domain: `packages/domain/src/private-deployment.ts`, `packages/domain/src/private-deployment.test.ts` (7 tests passing)
- Web: `apps/web/components/enterprise/private-deployment-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/private-deployment.spec.tsx` (4 tests passing)
- Documentation: `.harness/deployment/PRIVATE_DEPLOYMENT.md`
- Reviews: `.harness/reviews/F108-PR.md`, `.harness/reviews/F108-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F131 — Compliance packs** (SOC2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST, CIS mappings; control -> objects -> evidence -> owner -> status; no false 'compliant' badge)
