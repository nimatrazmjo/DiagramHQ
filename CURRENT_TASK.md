# Current Task: F051 — Mentions

**Status**: NOT STARTED

## Description
@mentions inside comments and descriptions with notifications, and converting a comment into a tracked task.
- Feature ID: F051
- Phase: 06 — Collaboration
- Acceptance criteria:
  - @mention notifies; convert a comment to a task
  - Test: comment with @mention fires notification + convert to task.

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F051 acceptance criteria.
2. In `packages/domain/src/`, implement mention parser and task conversion engine (`mentions.ts`):
   - Mention parsing: `parseMentions(text: string): { userHandles: string[]; objectRefs: string[] }`
   - Mention notification generation: `generateMentionNotifications()` producing notification records for mentioned users.
   - Task model & conversion: `ArchitectureTask` (id, title, description, status, assigneeId, sourceCommentId, targetType, targetId, createdAt, updatedAt) and `convertCommentToTask()`.
   - Unit tests in `packages/domain/src/mentions.test.ts`.
3. In `apps/web/`, implement mentions and task UI:
   - `<MentionSuggestions />` autocomplete popup for `@username` and `#object`.
   - "Convert to Task" action button on comment cards in `<CommentsPanel />`.
   - `<TaskBadge />` indicator showing linked task status.
   - Web integration specs in `apps/web/mentions.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
