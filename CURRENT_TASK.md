# Current Task: F060 — Pull requests

**Status**: NOT STARTED

## Description
Architecture Pull Request (PR) review engine and UI allowing proposals to merge architecture branches with diffs, risk assessment ratings, affected systems, threaded line/entity reviews, comments, and approvals/rejections.
- Feature ID: F060
- Phase: 07 — Versioning
- Dependencies: F057, F058, F059
- Acceptance criteria:
  - Titled PR with diff, risk, affected systems; review/comment/approve/reject
  - Test: a PR shows the correct diff and can be reviewed.

## Next Steps
1. Review `PHASE-07-VERSIONING.md` for F060 acceptance criteria.
2. In `packages/domain/src/`, implement architecture PR engine (`pull-requests.ts`):
   - PR lifecycle: `createArchitecturePullRequest`, `reviewPullRequest` (approve/reject/request changes), `addPullRequestComment`, `calculatePullRequestRisk`.
   - Unit tests in `packages/domain/src/pull-requests.test.ts`.
3. In `apps/web/`, implement PR review modal / page:
   - `<PullRequestDetails />` and `<PullRequestReviewActions />`.
   - Web integration specs in `apps/web/pull-requests.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
