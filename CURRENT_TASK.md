# Current Task: F126 — Webhooks

**Status**: NOT STARTED

## Description
Outbound event notification and webhook dispatch system for DiagramHQ:
- Configures webhook endpoints with target URLs, secret signatures (HMAC SHA-256 `X-Hub-Signature-256`), and subscribed event types.
- Emits standard lifecycle events:
  - `object.created`, `object.updated`, `object.deleted`
  - `connection.created`, `connection.updated`, `connection.deleted`
  - `diagram.created`, `flow.created`
  - `architecture.updated`, `version.created`
  - `change.approved`, `change.merged`
- Delivery pipeline: payload formulation, cryptographic HMAC signature generation, exponential backoff retries, and delivery audit logging (status code, latency, attempt count, timestamp).
- Strict Invariant Enforced: Every webhook dispatch includes a cryptographically verifiable payload and delivery event status.

Acceptance Criteria:
- Emit object.*, connection.*, diagram.created, flow.created, architecture.updated, version.created, change.approved, change.merged
- Test: an action fires the expected webhook (test sink).

- Feature ID: F126
- Phase: 09 — Code Integrations
- Dependencies: F007, F077

## Next Steps
1. In `packages/domain/src/`, implement Webhook domain module (`webhooks.ts`):
   - Model `WebhookSubscription`, `WebhookEvent`, `WebhookEventType`, `WebhookDeliveryLog`, `WebhookRegistry`.
   - Implement `createWebhookSubscription`, `emitWebhookEvent`, `deliverWebhook`, `verifyWebhookSignature`.
   - Unit tests in `packages/domain/src/webhooks.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<WebhookManagerModal />` and `<WebhookDeliveryLogDrawer />` in `apps/web/components/canvas/webhooks-panel.tsx`.
   - Integration specs in `apps/web/webhooks.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
