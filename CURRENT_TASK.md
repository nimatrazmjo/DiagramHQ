# Current Task: F116 — Notifications

**Status**: NOT STARTED

## Description
Multi-channel notification engine (in-app, email, Slack, Microsoft Teams) for architectural events: model changes, comments, mentions, and version review requests.
- Feature ID: F116
- Phase: 06 — Collaboration
- Dependencies: F050, F051, F054
- Acceptance criteria:
  - In-app notifications for changes, comments, mentions, reviews
  - Multi-channel dispatch (email, Slack, Microsoft Teams) via pluggable transports / dispatchers
  - Test: an event produces a notification; channel dispatch tested (stub transport).

## Next Steps
1. Review `PHASE-06-COLLABORATION.md` for F116 acceptance criteria.
2. In `packages/domain/src/`, implement notifications dispatcher and inbox engine (`notifications.ts`):
   - Notification events: `change`, `comment`, `mention`, `review_requested`, `review_approved`.
   - Notification channels: `in_app`, `email`, `slack`, `teams`.
   - Transport interface: `NotificationTransport` (with memory/stub transport for tests).
   - Functions: `createNotification`, `dispatchNotification`, `filterNotificationsForUser`, `markNotificationRead`, `markAllNotificationsRead`.
   - Unit tests in `packages/domain/src/notifications.test.ts`.
3. In `apps/web/`, implement notification bell / inbox panel:
   - `<NotificationCenter />` dropdown / flyout showing categorized unread notifications.
   - Channel config / badge component `<NotificationBadge />`.
   - Web integration specs in `apps/web/notifications.spec.tsx`.
4. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
