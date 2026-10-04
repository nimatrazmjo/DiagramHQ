# Current Task: F106 — Organization policies

**Status**: COMPLETE

## Description
Organization Governance & Security Policies (Phase 13 — Enterprise):
- Centralized Organization Governance Policies (`@diagramhq/domain`):
  - IP Restrictions: Allowlist / denylist evaluation with CIDR subnet prefix parsing and unsigned 32-bit integer matching (`isIpInCidr`, `ipToNumber`), plus role-based bypass exemptions (`owner`).
  - Session Management: Maximum session duration limits, inactivity idle timeouts, concurrent active session caps, mandatory MFA verification, and corporate device trust enforcement.
  - Data Retention Lifecycle: Automated retention cutoffs (`calculateRetentionCutoffDate`) and permanent purge eligibility (`isItemEligibleForRetentionPurge`) across soft-deleted items, version history, audit logs, and inactive workspaces.
  - Export Controls: Format whitelisting (PNG, SVG, PDF, JSON, CSV, Markdown), mandatory security watermarks on visual exports, external recipient email domain constraints, and sensitive data classification tag blocking (`pci`, `phi`, `secret`).
  - Governance Engine: Centralized policy evaluation (`evaluateIpRestriction`, `evaluateSessionPolicy`, `evaluateDataRetentionPolicy`, `evaluateExportControl`) with global enforcement mode switcher (`enforce`, `audit_only`, `disabled`) and factory defaults (`createDefaultOrganizationPolicies`).
- Web & Component Layer (`@diagramhq/web`):
  - `apps/web/components/enterprise/org-policies-modal.tsx`: Organization governance modal with tabbed configuration for IP restrictions, session lifetimes, retention lifecycles, export controls, and an interactive Live Policy Enforcement Simulator.
  - `apps/web/components/enterprise/index.ts`: Exported `OrgPoliciesModal`.
- Acceptance criteria:
  - Org policies, IP restrictions, session management, data retention, export controls
  - Test: a policy is enforced in test.

- Feature ID: F106
- Phase: 13 — Enterprise
- Dependencies: F086 (Architecture rules)

## Evidence
- Domain: `packages/domain/src/organization-policies.ts`, `packages/domain/src/organization-policies.test.ts` (26 tests passing)
- Web: `apps/web/components/enterprise/org-policies-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/org-policies.spec.tsx` (6 tests passing)
- Reviews: `.harness/reviews/F106-PR.md`, `.harness/reviews/F106-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F107 — Enterprise security** (Encryption, backup, retention, export controls, security review checklist)
