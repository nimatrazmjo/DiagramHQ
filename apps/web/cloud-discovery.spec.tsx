import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CloudDiscoveryModal } from './components/canvas/cloud-discovery-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('Cloud Resource Discovery Canvas UI (F083)', () => {
  const archId = 'arch-prod-discovery' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders CloudDiscoveryModal with title, account selector, and Run Live Scan trigger', () => {
    const html = renderToString(
      <CloudDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onApplySuccess={vi.fn()}
      />
    );

    expect(html).toContain('Live Cloud Resource Discovery');
    expect(html).toContain('Connected Cloud Accounts');
    expect(html).toContain('Run Live Scan');
    expect(html).toContain('AWS Production');
    expect(html).toContain('Azure Enterprise');
    expect(html).toContain('GCP Analytics');
    expect(html).toContain('K8s EKS Cluster');
    expect(html).toContain('No active scan report');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <CloudDiscoveryModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('provides accessible buttons, modal role, and proper cancel actions', () => {
    const html = renderToString(
      <CloudDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Cancel');
    expect(html).toContain('Close');
  });
});
