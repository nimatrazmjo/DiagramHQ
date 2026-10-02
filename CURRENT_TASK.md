# Current Task: F057 — Branches

**Status**: NOT STARTED

## Description
Architecture branching mechanism allowing branching off main or another branch, carrying full architecture state: objects, connections, views, flows, metadata, ADRs, and comments, while ensuring complete isolation and independence from main.
- Feature ID: F057
- Phase: 07 — Versioning
- Dependencies: F055, F056
- Acceptance criteria:
  - Create branches carrying objects/connections/views/flows/metadata/ADRs/comments
  - Test: a branch is independent of main.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F057 acceptance criteria.
2. In `packages/domain/src/`, implement branching engine (`branches.ts`):
   - Branch interfaces: `ArchitectureBranch`, `BranchId`, branching factory `createArchitectureBranch`, branch fork `forkArchitectureBranch`.
   - Ensure modifications in a branch do not mutate the source branch (pure state isolation).
   - Unit tests in `packages/domain/src/branches.test.ts`.
3. In `apps/web/`, implement branch switching and status UI:
   - `<BranchSelector />` and `<BranchBadge />` components.
   - Web integration specs in `apps/web/branches.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
