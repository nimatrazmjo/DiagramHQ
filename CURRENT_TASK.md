# Current Task: F104 — Advanced RBAC

**Status**: COMPLETE

## Description
Enterprise Advanced Role-Based Access Control (Advanced RBAC) (Phase 13 — Enterprise):
- Fine-grained permission model (`@diagramhq/domain`):
  - Catalog of 25+ granular permissions across 7 domains (`architecture`, `model`, `flow`, `docs`, `governance`, `admin`, `billing`).
  - Predefined enterprise specialized roles:
    - `Security Auditor`: Read-only views, audit logs, compliance reports, and security scans; explicitly denied from modifying models, editing diagrams, or deleting workspaces.
    - `Documentation Specialist`: Markdown editing, publishing, and diagram views; explicitly denied from mutating core architectural objects.
    - `Compliance Officer`: Audit log inspection, framework mapping, and ADR approval; explicitly denied from altering diagrams or deleting objects.
    - `Junior Architect`: Authors draft diagrams and flows; explicitly denied from publishing, deleting models, or managing admin settings.
    - `Billing Administrator`: Invoicing, subscriptions, and seat management; strictly isolated with zero access to proprietary architecture diagrams or models.
  - Custom role authoring with dynamic allow and deny lists.
  - Least privilege evaluation engine (`evaluateFineGrainedPermission`, `assertFineGrainedPermission`): explicit deny overrides allow; ungranted permissions denied by default.
  - Out-of-scope action denial test harness: `testFineGrainedRoleDenial`.
  - Least privilege audit engine (`auditRoleLeastPrivilege`): computes privilege risk score (LOW/MEDIUM/HIGH/CRITICAL), flags destructive capabilities, and provides actionable remediation recommendations.
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/advanced-rbac-modal.tsx`: Comprehensive Advanced RBAC management modal featuring Roles Catalog, Real-Time Least Privilege Evaluator with instant decision badges, Risk & Compliance Audit dashboard, and Custom Role Authoring form.
  - `apps/web/components/enterprise/index.ts`: Exported `AdvancedRbacModal`.
- Acceptance criteria:
  - Fine-grained roles beyond the base catalog; least privilege
  - Test: a fine-grained role denies an out-of-scope action.

- Feature ID: F104
- Phase: 13 — Enterprise
- Dependencies: F053

## Evidence
- Domain: `packages/domain/src/advanced-rbac.ts`, `packages/domain/src/advanced-rbac.test.ts` (13 tests passing)
- Web: `apps/web/components/enterprise/advanced-rbac-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/advanced-rbac.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F104-PR.md`, `.harness/reviews/F104-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F105 — Audit logs** (Immutable who/what/when, AI-agent actions, append-only log)
