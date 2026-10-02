import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SdkPanelModal } from './components/canvas/sdk-panel';

describe('Developer SDK & API Panel (F127)', () => {
  it('renders SdkPanelModal with header, configuration inputs, code snippet, and in-memory test runner', () => {
    const html = renderToString(
      <SdkPanelModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId="arch-production-core"
        defaultApiKey="dhq_live_test_key_123"
      />
    );

    expect(html).toContain('DiagramHQ Developer SDK &amp; API');
    expect(html).toContain('TypeScript SDK');
    expect(html).toContain('CURL');
    expect(html).toContain('CLI');
    expect(html).toContain('dhq_live_test_key_123');
    expect(html).toContain('arch-production-core');
    expect(html).toContain('@diagramhq/sdk');
    expect(html).toContain('Interactive SDK Verification');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <SdkPanelModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders code snippet containing SDK client creation and object methods by default', () => {
    const html = renderToString(
      <SdkPanelModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId="arch-demo-abc"
      />
    );

    expect(html).toContain('createDiagramHQClient');
    expect(html).toContain('client.objects.list');
    expect(html).toContain('client.objects.create');
  });
});
