# Current Task: F073 — GitLab

**Status**: NOT STARTED

## Description
GitLab project and repository connection with repository code scanning for DiagramHQ, establishing feature parity with the GitHub scanner (F072). Connects a GitLab repository/project and statically analyzes repository file trees, manifests (`package.json`, `pom.xml`, `go.mod`, `requirements.txt`), configurations (`docker-compose.yml`, `.gitlab-ci.yml`), and route handlers to detect:
- Services & Applications
- Exposed APIs & Endpoints
- Databases & Data Stores (PostgreSQL, Redis, MongoDB, MySQL)
- Message Queues & Brokers (Kafka, RabbitMQ)
- Dependencies, Libraries, Frameworks (NestJS, Express, FastAPI, Next.js)
- Cloud SDKs (AWS SDK, Google Cloud Client, Azure SDK)

Strict Invariant Enforced:
- Every detected architectural entity carries concrete grounding evidence (repo/project slug, file path, line numbers, commit SHA, detection method) and confidence scoring (F120).
- Mutations are formulated as reviewable proposals before addition to the architecture model.

Acceptance Criteria:
- Same detection + mapping for GitLab.
- Test: scan a sample GitLab repo -> parity with GitHub.

- Feature ID: F073
- Phase: 09 — Code Integrations
- Dependencies: F072

## Next Steps
1. In `packages/domain/src/`, implement GitLab repo scanner domain logic (`gitlab-scanner.ts`):
   - Model `GitLabProjectConfig`, `GitLabScanInput`, `GitLabScanResult`.
   - Scanner with parity for GitLab CI files (`.gitlab-ci.yml`), manifests, and code trees.
   - Attach grounding evidence (`AIEvidence`) and confidence assessment.
   - Unit tests in `packages/domain/src/gitlab-scanner.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<GitLabConnectModal />` and `<GitLabScanResultDrawer />` in `apps/web/components/canvas/gitlab-scanner-panel.tsx`.
   - Integration specs in `apps/web/gitlab-scanner.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
