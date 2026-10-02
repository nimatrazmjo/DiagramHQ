import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AzureImportModal } from './components/canvas/azure-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('Azure Infrastructure Import Canvas UI (F079)', () => {
  const archId = 'arch-prod-azure' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders AzureImportModal with header, configuration inputs, resource chips, and discovered inventory', () => {
    const html = renderToString(
      <AzureImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onImportSuccess={vi.fn()}
      />
    );

    expect(html).toContain('Azure Infrastructure Import (F079)');
    expect(html).toContain('a1b2c3d4-e5f6-7890-abcd-1234567890ab');
    expect(html).toContain('rg-production-core');
    expect(html).toContain('eastus');
    expect(html).toContain('SUPPORTED AZURE RESOURCE TYPES');
    expect(html).toContain('APP SERVICE');
    expect(html).toContain('FUNCTION APP');
    expect(html).toContain('SQL DATABASE');
    expect(html).toContain('VNET');
    expect(html).toContain('Discovered Azure Inventory');
    expect(html).toContain('Import to Model');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <AzureImportModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders inventory items representing canonical Azure resource types', () => {
    const html = renderToString(
      <AzureImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    const types = [
      'VM',
      'APP_SERVICE',
      'FUNCTION_APP',
      'AKS',
      'CONTAINER_APP',
      'SQL_DATABASE',
      'COSMOS_DB',
      'STORAGE_ACCOUNT',
      'VNET',
      'APP_GATEWAY',
      'FRONT_DOOR',
      'API_MANAGEMENT',
      'SERVICE_BUS',
      'EVENT_HUBS',
      'EVENT_GRID',
    ];

    for (const t of types) {
      expect(html).toContain(t);
    }
  });
});
