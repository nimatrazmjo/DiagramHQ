import { describe, expect, it, vi } from 'vitest';
import {
  addWebhookSubscription,
  createWebhookRegistry,
  createWebhookSubscription,
  deleteWebhookSubscription,
  dispatchWebhookEvent,
  formatWebhookPayload,
  generateHmacSignature,
  matchSubscribedWebhooks,
  updateWebhookSubscription,
  verifyWebhookSignature,
  type WebhookEventType,
  type WebhookHttpSink,
} from './webhooks';
import type { ArchitectureId, WorkspaceId } from './ids';

describe('F126 — Outbound Webhooks & Event Notification Engine', () => {
  const wsId = 'ws-engineering' as WorkspaceId;
  const archId = 'arch-payments' as ArchitectureId;

  describe('HMAC-SHA256 Signatures', () => {
    it('generates deterministic signatures matching verification', () => {
      const payload = JSON.stringify({ event: 'object.created', id: 'obj-123' });
      const secret = 'whsec_test_secret_key_123';

      const sig1 = generateHmacSignature(payload, secret);
      const sig2 = generateHmacSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1.startsWith('sha256=')).toBe(true);

      expect(verifyWebhookSignature(payload, sig1, secret)).toBe(true);
      expect(verifyWebhookSignature(payload, 'sha256=tampered', secret)).toBe(false);
      expect(verifyWebhookSignature('tampered payload', sig1, secret)).toBe(false);
    });
  });

  describe('Subscription Registry Management', () => {
    it('creates, adds, updates, and deletes webhook subscriptions', () => {
      let registry = createWebhookRegistry(wsId);
      expect(registry.subscriptions).toHaveLength(0);

      const sub1 = createWebhookSubscription({
        workspaceId: wsId,
        architectureId: archId,
        targetUrl: 'https://webhook.site/payments',
        events: ['object.created', 'object.updated', 'object.deleted'],
        description: 'Payment object lifecycle sync',
      });

      registry = addWebhookSubscription(registry, sub1);
      expect(registry.subscriptions).toHaveLength(1);
      expect(registry.subscriptions[0]?.targetUrl).toBe('https://webhook.site/payments');
      expect(registry.subscriptions[0]?.events).toContain('object.created');

      // Update
      registry = updateWebhookSubscription(registry, sub1.id, {
        description: 'Updated description',
        isActive: false,
      });
      expect(registry.subscriptions[0]?.description).toBe('Updated description');
      expect(registry.subscriptions[0]?.isActive).toBe(false);

      // Delete
      registry = deleteWebhookSubscription(registry, sub1.id);
      expect(registry.subscriptions).toHaveLength(0);
    });
  });

  describe('Event Filtering & Topic Matching', () => {
    it('matches exact event subscriptions and wildcards', () => {
      let registry = createWebhookRegistry(wsId);

      const wildcardSub = createWebhookSubscription({
        workspaceId: wsId,
        targetUrl: 'https://audit.corp.internal/all',
        events: ['*'],
      });

      const objectPrefixSub = createWebhookSubscription({
        workspaceId: wsId,
        targetUrl: 'https://catalog.corp.internal/objects',
        events: ['object.*' as WebhookEventType],
      });

      const changeSub = createWebhookSubscription({
        workspaceId: wsId,
        targetUrl: 'https://slack.corp.internal/changes',
        events: ['change.approved', 'change.merged'],
      });

      registry = addWebhookSubscription(registry, wildcardSub);
      registry = addWebhookSubscription(registry, objectPrefixSub);
      registry = addWebhookSubscription(registry, changeSub);

      // object.created should match wildcardSub and objectPrefixSub
      const objMatches = matchSubscribedWebhooks(registry, 'object.created');
      expect(objMatches).toHaveLength(2);
      expect(objMatches.map((s) => s.id)).toContain(wildcardSub.id);
      expect(objMatches.map((s) => s.id)).toContain(objectPrefixSub.id);

      // change.approved should match wildcardSub and changeSub
      const changeMatches = matchSubscribedWebhooks(registry, 'change.approved');
      expect(changeMatches).toHaveLength(2);
      expect(changeMatches.map((s) => s.id)).toContain(wildcardSub.id);
      expect(changeMatches.map((s) => s.id)).toContain(changeSub.id);

      // diagram.created should match only wildcardSub
      const diagramMatches = matchSubscribedWebhooks(registry, 'diagram.created');
      expect(diagramMatches).toHaveLength(1);
      expect(diagramMatches[0]?.id).toBe(wildcardSub.id);
    });
  });

  describe('End-to-End Action Webhook Dispatch & Test Sink', () => {
    it('fires the expected webhook to test sink on all required events', async () => {
      let registry = createWebhookRegistry(wsId);

      const testSub = createWebhookSubscription({
        workspaceId: wsId,
        architectureId: archId,
        targetUrl: 'https://api.test-sink.local/webhooks',
        secretToken: 'whsec_sink_test_key',
        events: [
          'object.created',
          'connection.created',
          'diagram.created',
          'flow.created',
          'architecture.updated',
          'version.created',
          'change.approved',
          'change.merged',
        ],
      });

      registry = addWebhookSubscription(registry, testSub);

      const receivedRequests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
      const testSink: WebhookHttpSink = vi.fn(async (url, headers, body) => {
        receivedRequests.push({ url, headers, body });
        return { status: 200, body: '{"ok":true}' };
      });

      // 1. Dispatch object.created
      const objPayload = formatWebhookPayload('object.created', wsId, {
        objectId: 'obj-edge-gateway',
        name: 'Edge API Gateway',
        kind: 'application',
      }, { architectureId: archId });

      const res1 = await dispatchWebhookEvent(registry, 'object.created', objPayload, testSink);
      expect(res1.results).toHaveLength(1);
      expect(res1.results[0]?.status).toBe('success');
      expect(res1.results[0]?.httpStatusCode).toBe(200);

      // 2. Dispatch change.merged
      const mergePayload = formatWebhookPayload('change.merged', wsId, {
        changeId: 'chg-771',
        title: 'Add Kafka Event Bus',
        mergedBy: 'usr-alice',
      }, { architectureId: archId });

      const res2 = await dispatchWebhookEvent(res1.registry, 'change.merged', mergePayload, testSink);
      expect(res2.results).toHaveLength(1);
      expect(res2.results[0]?.status).toBe('success');

      // Verify Sink Assertions
      expect(testSink).toHaveBeenCalledTimes(2);
      expect(receivedRequests).toHaveLength(2);

      const firstReq = receivedRequests[0]!;
      expect(firstReq.url).toBe('https://api.test-sink.local/webhooks');
      expect(firstReq.headers['X-DiagramHQ-Event']).toBe('object.created');
      expect(firstReq.headers['X-Hub-Signature-256']).toBeDefined();

      // Cryptographically verify signature with secret
      const isVerified = verifyWebhookSignature(
        firstReq.body,
        firstReq.headers['X-Hub-Signature-256']!,
        'whsec_sink_test_key'
      );
      expect(isVerified).toBe(true);

      // Verify audit logs in registry
      expect(res2.registry.deliveryLogs).toHaveLength(2);
      expect(res2.registry.deliveryLogs[0]?.event).toBe('change.merged');
      expect(res2.registry.deliveryLogs[1]?.event).toBe('object.created');
    });

    it('records failed delivery when sink responds with error status or rejects', async () => {
      let registry = createWebhookRegistry(wsId);
      const sub = createWebhookSubscription({
        workspaceId: wsId,
        targetUrl: 'https://faulty-sink.com/webhook',
        events: ['architecture.updated'],
      });
      registry = addWebhookSubscription(registry, sub);

      const failingSink: WebhookHttpSink = vi.fn(async () => {
        return { status: 503, body: 'Service Unavailable' };
      });

      const payload = formatWebhookPayload('architecture.updated', wsId, { version: '2.0.0' });
      const res = await dispatchWebhookEvent(registry, 'architecture.updated', payload, failingSink);

      expect(res.results).toHaveLength(1);
      expect(res.results[0]?.status).toBe('failed');
      expect(res.results[0]?.httpStatusCode).toBe(503);
      expect(res.results[0]?.error).toContain('503');
    });
  });
});
