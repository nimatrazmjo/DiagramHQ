import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitectureDriftModal } from './components/canvas/drift-panel';
import type { ArchitectureId, VersionId, ArchitectureModel, WorkspaceId, ObjectId } from '@diagramhq/domain';

describe('Architecture Drift Canvas UI (F084)', () => {
  const archId = 'arch-prod-drift' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  const mockDocumentedModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: 'ws-main' as unknown as WorkspaceId,
      name: 'E-Commerce Platform',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj_gw' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Edge reverse proxy',
        metadata: { technology: 'Kong' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  };

  const mockActualModel: ArchitectureModel = {
    ...mockDocumentedModel,
    objects: [
      {
        id: 'obj_gw' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Edge reverse proxy',
        metadata: { technology: 'Envoy' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_unm_orders' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Unmanaged Orders Service',
        kind: 'application',
        description: 'Discovered service',
        metadata: { technology: 'Go' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  };

  it('renders ArchitectureDriftModal with header, KPIs, and detected drift items', () => {
    const html = renderToString(
      <ArchitectureDriftModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        documentedModel={mockDocumentedModel}
        actualModel={mockActualModel}
        onModelUpdated={vi.fn()}
        onPullRequestCreated={vi.fn()}
      />
    );

    expect(html).toContain('Architecture Drift &amp; Governance (F084)');
    expect(html).toContain('TOTAL DRIFT ITEMS');
    expect(html).toContain('UNMANAGED');
    expect(html).toContain('MISMATCHES');
    expect(html).toContain('Unmanaged application: Unmanaged Orders Service');
    expect(html).toContain('Attribute drift on API Gateway');
    expect(html).toContain('Update Model');
    expect(html).toContain('Ignore');
    expect(html).toContain('Create Change Request (PR)');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <ArchitectureDriftModal
        isOpen={false}
        onClose={vi.fn()}
        documentedModel={mockDocumentedModel}
        actualModel={mockActualModel}
      />
    );

    expect(html).toBe('');
  });

  it('provides accessible dialog attributes and interactive action buttons', () => {
    const html = renderToString(
      <ArchitectureDriftModal
        isOpen={true}
        onClose={vi.fn()}
        documentedModel={mockDocumentedModel}
        actualModel={mockActualModel}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Close');
    expect(html).toContain('View Details ▾');
  });
});
