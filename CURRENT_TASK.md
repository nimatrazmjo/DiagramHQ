# Current Task: F105 — Audit logs

**Status**: COMPLETE

## Description
Enterprise Immutable Audit Logs (Phase 13 — Enterprise):
- Cryptographically chained append-only audit ledger (`@diagramhq/domain`):
  - Complete who/what/when tracking: actor types (`human_user`, `ai_agent`, `scim_sync`, `api_key`, `system`), category, action, status (`SUCCESS`, `FAILURE`, `DENIED`), target resource, payload details, ISO timestamps, and monotonic sequence indices.
  - First-class AI-agent auditing: model provenance (e.g. `gemini-1.5-pro`), prompt summary, confidence score, tool calls executed, and autonomous execution flags.
  - Multi-pass cryptographic hash chaining (`computeAuditEntryHash`): seals previous entry hash and record payload into a tamper-evident Merkle chain.
  - Append-only enforcement: monotonic sequence numbers and chronological ordering.
  - Cryptographic integrity verifier (`verifyAuditLogIntegrity`): detects in-place record mutations, severed hash links, or dropped entries.
  - Query engine (`queryAuditLogs`): supports filtering by actor, actorType (e.g. `ai_agent`), category, status, resourceId, and time window with pagination.
  - Structured export (`exportAuditLogToJson`, `exportAuditLogToCsv`) for SIEM ingestion (Splunk, Datadog).
  - Deterministic lifecycle testing harness (`simulateAuditLogLifecycle`).
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/audit-logs-modal.tsx`: Audit logs modal with KPI summary counters, action & actor type filters, dedicated AI-Agent Actions tab, Cryptographic Chain Integrity verifier, and SIEM JSON/CSV export actions.
  - `apps/web/components/enterprise/index.ts`: Exported `AuditLogsModal`.
- Acceptance criteria:
  - Immutable who/what/when, including AI-agent actions
  - Test: actions recorded; the log is append-only.

- Feature ID: F105
- Phase: 13 — Enterprise
- Dependencies: None

## Evidence
- Domain: `packages/domain/src/audit-log.ts`, `packages/domain/src/audit-log.test.ts` (9 tests passing)
- Web: `apps/web/components/enterprise/audit-logs-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/audit-logs.spec.tsx` (3 tests passing)
- Reviews: `.harness/reviews/F105-PR.md`, `.harness/reviews/F105-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F106 — Organization policies** (Org policies, IP restrictions, session management, data retention, export controls)
