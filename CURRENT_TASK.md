# Current Task: F074 — Repository discovery

**Status**: NOT STARTED

## Description
Organization and group-wide repository discovery engine for DiagramHQ. Enables discovering, enumerating, filtering, and multi-selecting repositories across GitHub organizations and GitLab groups to scope architecture model scans:
- Enumerates repositories across GitHub organizations or GitLab groups/subgroups.
- Provides repository metadata (language, primary framework, stars/forks, default branch, last commit timestamp, topics/tags).
- Interactive multi-selection and scoping: users filter by language/technology or search term, select an active subset of repositories, and launch batch or targeted architecture scans.
- Strict Invariant Enforced: Selection strictly scopes the downstream scan operations and avoids scanning unselected repositories.

Acceptance Criteria:
- Discover repos across an org/group; select which to model.
- Test: discovery lists repos; selection scopes the scan.

- Feature ID: F074
- Phase: 09 — Code Integrations
- Dependencies: F072, F073

## Next Steps
1. In `packages/domain/src/`, implement repository discovery domain logic (`repository-discovery.ts`):
   - Model `DiscoveredRepository`, `RepoProvider` ('github' | 'gitlab'), `DiscoveryFilter`, `RepoDiscoverySession`.
   - Implement `discoverRepositories(input)` and `scopeRepositories(all, selectedIds)`.
   - Domain unit tests in `packages/domain/src/repository-discovery.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<RepoDiscoveryModal />`, `<RepoListScoper />` in `apps/web/components/canvas/repo-discovery-panel.tsx`.
   - Integration specs in `apps/web/repo-discovery.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
