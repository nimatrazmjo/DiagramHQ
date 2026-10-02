# Current Task: F077 — Repository synchronization

**Status**: NOT STARTED

## Description
Continuous repository synchronization and background architecture freshness engine for DiagramHQ. Enables keeping the architecture model fresh and aligned with remote code repositories over time:
- Periodic scheduled sync and webhook-triggered synchronization (`onPush`, `onPullRequestMerged`, `onSchedule`).
- Compares previous scan fingerprint/hash against current repository commit state to detect code changes.
- Detects added, modified, and removed services, routes, datastores, and message queues.
- Generates non-destructive model update proposals with concrete evidence diffs.
- Feeds architectural drift detection (F084) when code deviates from documented C4 architecture models.
- Strict Invariant Enforced: A repo change triggers a model synchronization pass; mutations are formulated as reviewable proposals or safe drift feeds without silent unreviewed commits.

Acceptance Criteria:
- Re-scan on a schedule / webhook; update the model; feed drift (F084).
- Test: a repo change triggers a model refresh.

- Feature ID: F077
- Phase: 09 — Code Integrations
- Dependencies: F072, F084

## Next Steps
1. In `packages/domain/src/`, implement repository synchronization domain logic (`repo-sync.ts`):
   - Model `SyncTrigger` (`schedule`, `webhook`, `manual`), `SyncStatus`, `RepoSyncJob`, `SyncDriftReport`, `SyncChangeSummary`.
   - Implement `triggerRepoSync`, `evaluateRepoSyncDrift`, `applySyncProposalToModel`.
   - Unit tests in `packages/domain/src/repo-sync.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<RepoSyncDrawer />` and `<SyncScheduleModal />` in `apps/web/components/canvas/repo-sync-panel.tsx`.
   - Integration specs in `apps/web/repo-sync.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
