# Current Task: F050 — Comments

**Status**: NOT STARTED

## Description
Threaded comments on objects, connections, diagrams, flows, docs, and changes with reply and resolve functionality.
- Feature ID: F050
- Phase: 06 — Collaboration
- Acceptance criteria:
  - Comments on objects, connections, diagrams, flows, docs, changes
  - Reply + resolve
  - Test: comment CRUD + resolve on the right entity.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F050 acceptance criteria.
2. In `packages/domain/src/`, implement comment domain model and pure functions (`comments.ts`):
   - `CommentTargetType`: `'object' | 'connection' | 'diagram' | 'flow' | 'doc' | 'change'`
   - `Comment`: id, authorId, authorName, authorColor, targetType, targetId, content, createdAt, updatedAt, resolved, resolvedBy, resolvedAt, parentCommentId (for replies).
   - Functions: `createComment()`, `replyComment()`, `resolveComment()`, `reopenComment()`, `editComment()`, `deleteComment()`, `filterCommentsByTarget()`, `getCommentThreads()`.
   - Unit tests in `packages/domain/src/comments.test.ts`.
3. In `apps/web/`, implement comments UI components:
   - `<CommentsPanel />`: thread list, replies, resolve button, comment composer, target badge.
   - Canvas comment pin / bubble indicators on nodes/connections.
   - Web integration specs in `apps/web/comments.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
