# Review: F103 — SCIM Provisioning and Deprovisioning

## Reviewer Checklist
- [x] Pure domain boundary respected: `@diagramhq/domain` has zero framework or runtime dependencies.
- [x] RFC 7643 and RFC 7644 compliance verified:
  - Valid schemas for User, Group, ServiceProviderConfig, PatchOp, ListResponse, Error.
  - User creation supports `userName`, `name`, `emails`, `active`, `roles`, enterprise extensions.
  - User filtering supports `userName eq "..."`, `externalId eq "..."`, `active eq true/false`.
  - Deprovisioning verified via PATCH `active: false` and DELETE.
- [x] Security controls:
  - High-entropy Bearer token generation.
  - Strict Bearer header validation on API endpoints returning 401 on mismatch.
- [x] Architectural separation: Web app handles HTTP requests and Next.js routes while delegating all state transitions and validation to domain layer.
- [x] Quality gates passing:
  - `pnpm typecheck` passed (0 errors)
  - `pnpm lint` passed (0 errors)
  - `pnpm check-architecture` passed
  - Domain tests passed: 18/18 tests in `scim.test.ts` (653 total)
  - Web tests passed: 4/4 tests in `scim.spec.tsx` (590 total)
  - Production build passed with Next.js App Router SCIM endpoints
- [x] Acceptance criteria satisfied: "SCIM create/update/deactivate provisions/deprovisions users. Test: SCIM create then deactivate."

## Decision
APPROVED. Ready for merge to `main`.
