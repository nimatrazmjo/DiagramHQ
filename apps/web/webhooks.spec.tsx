import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type WorkspaceId,
  createWebhookRegistry,
  createWebhookSubscription,
  addWebhookSubscription,
} from '@diagramhq/domain';
import { WebhookManagerModal } from './components/canvas/webhooks-panel';

describe('Outbound Webhooks Canvas UI (F126)', () => {
  const wsId = 'ws-acme-corp' as WorkspaceId;

  let registry = createWebhookRegistry(wsId);
  const sub1 = createWebhookSubscription({
    workspaceId: wsId,
    targetUrl: 'https://api.acme.corp/webhooks/architecture',
    description: 'Corporate architecture events stream',
    events: ['object.created', 'connection.created', 'change.merged'],
  });
  registry = addWebhookSubscription(registry, sub1);

  it('renders WebhookManagerModal with header, metrics, and subscriptions', () => {
    const html = renderToString(
      <WebhookManagerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={registry}
        onAddSubscription={vi.fn()}
      />
    );

    expect(html).toContain('Outbound Webhooks');
    expect(html).toContain('F126');
    expect(html).toContain('HMAC SHA-256');
    expect(html).toContain('https://api.acme.corp/webhooks/architecture');
    expect(html).toContain('object.created');
    expect(html).toContain('connection.created');
    expect(html).toContain('change.merged');
    expect(html).toContain('Subscriptions');
  });

  it('renders empty subscriptions state when registry has no subscriptions', () => {
    const emptyRegistry = createWebhookRegistry(wsId);
    const html = renderToString(
      <WebhookManagerModal
        isOpen={true}
        onClose={vi.fn()}
        registry={emptyRegistry}
      />
    );

    expect(html).toContain('No Webhook Endpoints Configured');
    expect(html).toContain('Add First Endpoint');
  });

  it('renders closed state returning null without rendering content', () => {
    const html = renderToString(
      <WebhookManagerModal
        isOpen={false}
        onClose={vi.fn()}
        registry={registry}
      />
    );
    expect(html).toBe('');
  });
});
