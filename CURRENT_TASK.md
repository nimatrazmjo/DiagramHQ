# Current Task: F072 — GitHub

**Status**: NOT STARTED

## Description
GitHub repository connection and repository code scanner for DiagramHQ. Connects a GitHub repository and statically analyzes repository file trees, manifests (`package.json`, `pom.xml`, `go.mod`, `requirements.txt`, `Cargo.toml`), configuration files (`docker-compose.yml`, `Dockerfile`, Kubernetes manifests, Helm charts), and route handlers to detect:
- Services & Applications
- Exposed APIs & Endpoints
- Databases & Data Stores (PostgreSQL, Redis, MongoDB, MySQL, DynamoDB)
- Message Queues & Brokers (Kafka, RabbitMQ, SQS)
- Dependencies, Libraries, Frameworks (NestJS, Express, FastAPI, Gin, Spring Boot)
- Cloud SDKs (AWS SDK, Google Cloud Client, Azure SDK)

Strict Invariant Enforced:
- Every detected architectural entity carries concrete grounding evidence (repo name, file path, line numbers, commit SHA, detection method) and confidence scoring (F120).
- Mutations are formulated as reviewable proposals before addition to the architecture model.

Acceptance Criteria:
- Connect a repo; detect services, APIs, databases, queues, deps, libs, frameworks, cloud SDKs; each with evidence
- Test: scan a sample repo -> expected objects proposed with evidence.

- Feature ID: F072
- Phase: 09 — Code Integrations
- Dependencies: Phase 03, Phase 08, F120

## Next Steps
1. In `packages/domain/src/`, implement GitHub repo connection and scanner domain logic (`github-scanner.ts`):
   - Model `GitHubRepoConfig`, `GitHubRepoFile`, `DetectedArchitectureObject`, `GitHubScanResult`.
   - Manifest scanners for Node.js (`package.json`), Python (`requirements.txt`), Go (`go.mod`), Java (`pom.xml`), Docker/K8s configs.
   - Grounded detection of services, databases, queues, frameworks, and cloud SDKs with attached `AIEvidence` and confidence rating.
   - Unit tests in `packages/domain/src/github-scanner.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<GitHubConnectModal />` and `<GitHubScanResultDrawer />` in `apps/web/components/canvas/github-scanner-panel.tsx`.
   - Integration specs in `apps/web/github-scanner.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
