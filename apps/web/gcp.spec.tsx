import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GcpImportModal } from './components/canvas/gcp-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('GCP Infrastructure Import Canvas UI (F080)', () => {
  const archId = 'arch-prod-gcp' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders GcpImportModal with header, configuration inputs, resource chips, and discovered inventory', () => {
    const html = renderToString(
      <GcpImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onImportSuccess={vi.fn()}
      />
    );

    expect(html).toContain('Google Cloud Infrastructure Import (F080)');
    expect(html).toContain('gcp-production-corp');
    expect(html).toContain('organizations/1234567890');
    expect(html).toContain('us-central1');
    expect(html).toContain('SUPPORTED GCP RESOURCE TYPES');
    expect(html).toContain('CLOUD RUN');
    expect(html).toContain('CLOUD SQL');
    expect(html).toContain('SPANNER');
    expect(html).toContain('VPC');
    expect(html).toContain('Discovered GCP Inventory');
    expect(html).toContain('Import to Model');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <GcpImportModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders inventory items representing canonical GCP resource types', () => {
    const html = renderToString(
      <GcpImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    const types = [
      'GCE',
      'GKE',
      'CLOUD_RUN',
      'CLOUD_FUNCTIONS',
      'APP_ENGINE',
      'CLOUD_SQL',
      'SPANNER',
      'BIGTABLE',
      'FIRESTORE',
      'GCS',
      'VPC',
      'CLOUD_LB',
      'CLOUD_CDN',
      'API_GATEWAY',
      'PUBSUB',
      'EVENTARC',
      'CLOUD_TASKS',
    ];

    for (const t of types) {
      expect(html).toContain(t);
    }
  });
});
