# Feature Review Audit: F106 — Organization Policies

## Acceptance Criteria Checklist
- [x] **Org policies**: Central governance rules configured with version tracking and global enforcement mode selector (`enforce`, `audit_only`, `disabled`).
- [x] **IP restrictions**: IPv4 and CIDR subnet evaluation engine (`isIpInCidr`), allowlist and denylist enforcement with role-based exemption bypass.
- [x] **Session management**: Idle inactivity timeout, max lifespan duration, concurrent active sessions cap, MFA and device trust enforcement.
- [x] **Data retention**: Automated retention cutoffs for soft-deleted items, version history, audit logs, and inactive workspaces with purge eligibility calculation.
- [x] **Export controls**: Whitelisted export formats, mandatory watermarks for visual formats, recipient domain constraints, and sensitive tag blocking.
- [x] **Test: A policy is enforced in test**: Tested in `organization-policies.test.ts` (26 tests) and `org-policies.spec.tsx` (6 tests).

## Review Sign-off
- **Architectural Boundary**: Pure domain logic in `@diagramhq/domain`, zero runtime dependencies or Node built-in imports.
- **Component Design**: Accessible modal dialog with live simulation playground, Tailwind CSS, zero external icon packages.
- **Status**: APPROVED for merge to `main`.
