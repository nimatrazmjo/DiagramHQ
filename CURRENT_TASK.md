# Current Task: F052 — Share links

**Status**: NOT STARTED

## Description
Read-only shareable links preserving diagram view, camera/pan position, zoom level, and selected entity without requiring an account (anonymous open).
- Feature ID: F052
- Phase: 06 — Collaboration
- Acceptance criteria:
  - Read-only link preserves viewer position + selection; no account required
  - Test: anonymous open preserves state.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F052 acceptance criteria.
2. In `packages/domain/src/`, implement share link encoding, verification, and state projection (`share-links.ts`):
   - `ShareLinkToken`: token, workspaceId, viewId, camera: { panX, panY, zoom }, selectedObjectId, permissions ('read_only'), expiresAt, createdAt.
   - Functions: `generateShareLink()`, `parseShareLinkToken()`, `verifyShareLink()`, `projectAnonymousViewState()`.
   - Unit tests in `packages/domain/src/share-links.test.ts`.
3. In `apps/web/`, implement share link modal and banner:
   - `<ShareLinkModal />`: copy link, configure initial view, include current camera/selection checkbox, expiration options.
   - `<ReadOnlyBanner />`: displays "Viewing in Read-Only Mode · Anonymous Access" with action to sign up or duplicate workspace.
   - Web integration specs in `apps/web/share-links.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
