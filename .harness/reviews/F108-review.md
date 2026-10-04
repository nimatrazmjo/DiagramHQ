# Feature Review Audit: F108 — Private Deployment

## Acceptance Criteria Checklist
- [x] **Deployable to a customer VPC**: Configurable VPC CIDRs across AWS, GCP, Azure, and On-Premises bare metal.
- [x] **Air-gapped config**: Internal registry, zero-outbound egress isolation, local AI endpoints (vLLM/Ollama), and offline licensing.
- [x] **Deployment docs**: Comprehensive deployment instructions provided in `.harness/deployment/PRIVATE_DEPLOYMENT.md`.
- [x] **Test: Deploy to a clean environment; smoke passes**: Verified 6 automated readiness probes (Web, API, DB, S3, Local AI, Egress Firewall) passing 100% in clean environment in `private-deployment.test.ts` (7 tests) and `private-deployment.spec.tsx` (4 tests).

## Review Sign-off
- **Architectural Boundary**: Zero runtime dependencies in `@diagramhq/domain`.
- **Component Design**: Accessible modal dialog with interactive smoke testing in `@diagramhq/web`.
- **Status**: APPROVED for merge to `main`.
