# F052 — Share links — PR Review

## Evaluator Pass (Checker role)

Diff reviewed against acceptance criteria in `PHASE-06-COLLABORATION.md` (F052 section). Commands independently run and verified.

### Files changed
- `packages/domain/src/ids.ts` — `'shl'` prefix and `ShareLinkId` brand type declared.
- `packages/domain/src/share-links.ts` — pure domain models (`ShareLinkCameraState`, `ShareLinkPayload`, `AnonymousViewState`) and functions (`createShareLink`, `encodeShareLinkToken`, `decodeShareLinkToken`, `verifyShareLink`, `resolveAnonymousViewState`, `generateShareLinkUrl`).
- `packages/domain/src/share-links.test.ts` — 6 domain unit tests covering share link creation, URL-safe base64 token serialization/deserialization, expiration enforcement, and anonymous view state preservation; all pass.
- `packages/domain/src/index.ts` — share-links engine exported.
- `apps/web/components/canvas/share-link-modal.tsx` — `<ShareLinkModal />` and `<ReadOnlyBanner />` components.
- `apps/web/components/canvas/index.ts` — exports added.
- `apps/web/share-links.spec.tsx` — 4 web integration tests verifying anonymous view state preservation (pan, zoom, selection), expiration verification, and component rendering; all pass.

### Acceptance criteria check
- ✅ **Read-only link preserves viewer position + selection; no account required** — verified by pure domain share link token engine and anonymous view state resolution.
- ✅ **Test: anonymous open preserves state** — verified by `share-links.test.ts` (test 6: Acceptance Test: anonymous open preserves state) and `share-links.spec.tsx` (test 1: Acceptance Test: anonymous open preserves state).

### Verification evidence
```
pnpm typecheck          → exit 0 (all workspace packages clean)
pnpm lint               → exit 0 (ESLint clean)
pnpm test               → exit 0 (870 tests passed across domain, web, api)
pnpm check-architecture → clean (layer boundaries strictly preserved)
pnpm build              → exit 0 (all routes and packages compiled cleanly)
```

### Evaluator scores (rubric: verification/evaluator-rubric.md)
```
Feature: F052
Scores: acceptance=5, correctness=5, boundaries=5, modularity=5, evidence=5  => avg 5.0
Verdict: PASS
```

### Findings
None. Complete implementation with zero boundary violations, clean architecture, and 100% test pass rate.

Approved.
