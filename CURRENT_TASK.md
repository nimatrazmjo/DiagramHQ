# Current Task: F054 — Team management

**Status**: NOT STARTED

## Description
Teams and object ownership model: team creation, member assignment, primary owner and backup team assignment on architecture objects, and filtering architecture model queries by owner team.
- Feature ID: F054
- Phase: 06 — Collaboration
- Dependencies: F053
- Acceptance criteria:
  - Teams; object ownership (owner + backup team); 'show everything owned by X'
  - Test: assign owner; filter by owner returns the set.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F054 acceptance criteria.
2. In `packages/domain/src/`, implement team management and ownership engine (`teams.ts`):
   - Team entities (`TeamId`, `Team`, `TeamMembership`).
   - Ownership attachment (`ObjectOwnership`: primary owner team ID, backup owner team ID).
   - Domain operations: `assignOwnership`, `filterByOwnerTeam`, `isTeamMember`.
   - Unit tests in `packages/domain/src/teams.test.ts`.
3. In `apps/web/`, implement team badge and ownership filter components:
   - `<TeamBadge />` chip displaying team name and role.
   - `<OwnershipFilter />` or ownership selector component.
   - Web integration specs in `apps/web/teams.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
