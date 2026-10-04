# Phase 13 — Enterprise

Status: IN PROGRESS

## Description
Enterprise readiness: SSO/SAML/SCIM, advanced RBAC + org policies, audit logs, enterprise security, private deployment, compliance packs, billing, marketplace, mobile.

## Dependencies
Phase 01, Phase 06, Phase 11

## Features

### F101 — SSO

Status: COMPLETE

Description: Single sign-on.

Acceptance Criteria:

- SSO login via an IdP

Test: SSO login via a test IdP.

Evidence:
- Domain: `packages/domain/src/sso.ts`, `packages/domain/src/sso.test.ts` (19 tests passing)
- Web: `apps/web/auth.config.ts`, `apps/web/auth.spec.ts` (8 tests passing), `apps/web/app/login/login-form.tsx`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/sso.spec.tsx` (6 tests passing)
- Reviews: `.harness/reviews/F101-PR.md`, `.harness/reviews/F101-review.md`

### F102 — SAML

Status: COMPLETE

Description: SAML support.

Dependencies: F101

Acceptance Criteria:

- SAML assertion flow

Test: SAML login via a test IdP.

Evidence:
- Domain: `packages/domain/src/saml.ts`, `packages/domain/src/saml.test.ts` (17 tests passing)
- Web: `apps/web/auth.config.ts`, `apps/web/auth.spec.ts` (9 tests passing), `apps/web/app/login/login-form.tsx`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/saml.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F102-PR.md`, `.harness/reviews/F102-review.md`

### F103 — SCIM

Status: COMPLETE

Description: Provisioning.

Dependencies: F101

Acceptance Criteria:

- SCIM create/update/deactivate provisions/deprovisions users

Test: SCIM create then deactivate.

Evidence:
- Domain: `packages/domain/src/scim.ts`, `packages/domain/src/scim.test.ts` (18 tests passing)
- Web: `apps/web/lib/scim-server.ts`, `apps/web/app/api/scim/v2/ServiceProviderConfig/route.ts`, `apps/web/app/api/scim/v2/Users/route.ts`, `apps/web/app/api/scim/v2/Users/[id]/route.ts`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/scim.spec.tsx` (4 tests passing)
- Reviews: `.harness/reviews/F103-PR.md`, `.harness/reviews/F103-review.md`

### F104 — Advanced RBAC

Status: COMPLETE

Description: Fine-grained roles.

Dependencies: F053

Acceptance Criteria:

- Fine-grained roles beyond the base catalog; least privilege

Test: a fine-grained role denies an out-of-scope action.

Evidence:
- Domain: `packages/domain/src/advanced-rbac.ts`, `packages/domain/src/advanced-rbac.test.ts` (13 tests passing)
- Web: `apps/web/components/enterprise/advanced-rbac-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/advanced-rbac.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F104-PR.md`, `.harness/reviews/F104-review.md`

### F105 — Audit logs

Status: COMPLETE

Description: Immutable audit.

Acceptance Criteria:

- Immutable who/what/when, including AI-agent actions

Test: actions recorded; the log is append-only.

Evidence:
- Domain: `packages/domain/src/audit-log.ts`, `packages/domain/src/audit-log.test.ts` (9 tests passing)
- Web: `apps/web/components/enterprise/audit-logs-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/audit-logs.spec.tsx` (3 tests passing)
- Reviews: `.harness/reviews/F105-PR.md`, `.harness/reviews/F105-review.md`

### F106 — Organization policies

Status: COMPLETE

Description: Org-wide governance.

Dependencies: F086

Acceptance Criteria:

- Org policies, IP restrictions, session management, data retention, export controls

Test: a policy is enforced in test.

Evidence:
- Domain: `packages/domain/src/organization-policies.ts`, `packages/domain/src/organization-policies.test.ts` (26 tests passing)
- Web: `apps/web/components/enterprise/org-policies-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/org-policies.spec.tsx` (6 tests passing)
- Reviews: `.harness/reviews/F106-PR.md`, `.harness/reviews/F106-review.md`

### F107 — Enterprise security

Status: COMPLETE

Description: Hardening.

Acceptance Criteria:

- Encryption, backup, retention, export controls, security review checklist

Test: the enterprise security checklist passes.

Evidence:
- Domain: `packages/domain/src/enterprise-security.ts`, `packages/domain/src/enterprise-security.test.ts` (10 tests passing)
- Web: `apps/web/components/enterprise/enterprise-security-modal.tsx`, `apps/web/components/enterprise/index.ts`, `apps/web/enterprise-security.spec.tsx` (5 tests passing)
- Reviews: `.harness/reviews/F107-PR.md`, `.harness/reviews/F107-review.md`

### F108 — Private deployment

Status: NOT STARTED

Description: Self-hosted.

Acceptance Criteria:

- Deployable to a customer VPC; air-gapped config; deployment docs

Test: deploy to a clean environment; smoke passes.

### F131 — Compliance packs

Status: NOT STARTED

Description: Framework mappings.

Dependencies: F085

Acceptance Criteria:

- SOC2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST, CIS mappings
- Control -> objects -> evidence -> owner -> status; never auto-claims compliance

Test: map a control; evidence + status shown; no false 'compliant' badge.

### F132 — Billing & plans

Status: NOT STARTED

Description: Monetization.

Acceptance Criteria:

- Free/Pro/Business/Enterprise tiers gate features; usage limits

Test: tier gating enforced; over-limit blocked.

### F133 — Marketplace

Status: NOT STARTED

Description: Extensions.

Dependencies: F115

Acceptance Criteria:

- Templates, integration plugins, technology catalogs, AI agents, rules, compliance packs; install flow

Test: install a template pack; assets appear.

### F134 — Mobile

Status: NOT STARTED

Description: Mobile companion.

Dependencies: F050, F060

Acceptance Criteria:

- Mobile web: view, search, comments, approvals, notifications, AI questions; canvas stays desktop-first

Test: mobile viewport: view + approve a change + comment.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
