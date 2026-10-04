# Current Task: F103 — SCIM

**Status**: COMPLETE

## Description
Enterprise SCIM 2.0 User Provisioning and Deprovisioning (Phase 13 — Enterprise):
- RFC 7643 & RFC 7644 Implementation (`@diagramhq/domain`):
  - SCIM 2.0 schemas: `User`, `EnterpriseUser`, `Group`, `ServiceProviderConfig`, `PatchOp`, `Error`, `ListResponse`.
  - Provisioning: `createScimUser` with unique email/userName and externalId enforcement.
  - Query & Filtering: `getScimUser`, `listScimUsers` with RFC 7644 filtering (`userName eq ...`, `externalId eq ...`, `active eq true/false`) and 1-based pagination.
  - Modification: `updateScimUser` (PUT) and `patchScimUser` (PATCH).
  - Deprovisioning: `patchScimUser` handling `active: false` deactivation and reactivating with `active: true`.
  - Group Management: `createScimGroup`, `getScimGroup`, `listScimGroups`.
  - Discovery: `getScimServiceProviderConfig`.
  - Zero-network deterministic lifecycle test harness: `simulateScimProvisioningLifecycle`.
  - High-entropy Bearer token generation and header validation.
- Web & API Layer (`@diagramhq/web`):
  - `apps/web/lib/scim-server.ts`: SCIM state singleton with enterprise architect seed data.
  - `apps/web/app/api/scim/v2/ServiceProviderConfig/route.ts`: SCIM metadata discovery endpoint.
  - `apps/web/app/api/scim/v2/Users/route.ts`: SCIM user list and provision endpoint with Bearer auth.
  - `apps/web/app/api/scim/v2/Users/[id]/route.ts`: SCIM user retrieval, PUT, PATCH deprovisioning, and DELETE.
  - `apps/web/components/enterprise/sso-settings-modal.tsx`: Added SCIM 2.0 Provisioning tab with base URL, token management, active/deactivated stats, interactive lifecycle test runner, and user directory.
- Acceptance criteria:
  - SCIM create/update/deactivate provisions/deprovisions users
  - Test: SCIM create then deactivate.

- Feature ID: F103
- Phase: 13 — Enterprise
- Dependencies: F101

## Evidence
- Domain: `packages/domain/src/scim.ts`, `packages/domain/src/scim.test.ts` (18 tests passing)
- Web: `apps/web/lib/scim-server.ts`, `apps/web/app/api/scim/v2/ServiceProviderConfig/route.ts`, `apps/web/app/api/scim/v2/Users/route.ts`, `apps/web/app/api/scim/v2/Users/[id]/route.ts`, `apps/web/components/enterprise/sso-settings-modal.tsx`, `apps/web/scim.spec.tsx` (4 tests passing)
- Reviews: `.harness/reviews/F103-PR.md`, `.harness/reviews/F103-review.md`

## Next Feature
- **Phase 13 — Enterprise**: **F104 — Advanced RBAC** (Fine-grained roles beyond base catalog, least privilege, permission denial)
