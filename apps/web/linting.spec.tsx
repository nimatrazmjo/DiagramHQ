import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitectureLintModal } from './components/canvas/lint-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Architecture Linting Canvas UI (F085)', () => {
  const archId = 'arch-prod-lint' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

  const mockCleanModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Clean Platform',
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
        id: 'obj_shopper' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Shopper Actor',
        kind: 'actor',
        description: 'Customer persona',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_storefront' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Storefront Service',
        kind: 'application',
        description: 'Next.js web client',
        metadata: { technology: 'Next.js' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn_1' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_shopper' as unknown as ObjectId,
        targetObjectId: 'obj_storefront' as unknown as ObjectId,
        label: 'Visits site',
        kind: 'sync',
        description: 'HTTPS',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockViolatingModel: ArchitectureModel = {
    ...mockCleanModel,
    objects: [
      {
        id: 'obj_isolated_db' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Isolated Database',
        kind: 'store',
        description: '', // Missing description -> info
        metadata: {}, // Missing technology -> warning
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn_dangling' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_isolated_db' as unknown as ObjectId,
        targetObjectId: 'obj_missing_target' as unknown as ObjectId,
        label: 'Dangling link',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  it('renders clean banner and 100/100 score for a compliant model', () => {
    const html = renderToString(
      <ArchitectureLintModal
        isOpen={true}
        onClose={vi.fn()}
        model={mockCleanModel}
      />
    );

    expect(html).toContain('Architecture Linting &amp; Quality (F085)');
    expect(html).toContain('Architecture Model is 100% Clean');
    expect(html).toContain('Score: 100 / 100');
  });

  it('renders issue summary cards, severity filters, and finding cards for violating model', () => {
    const html = renderToString(
      <ArchitectureLintModal
        isOpen={true}
        onClose={vi.fn()}
        model={mockViolatingModel}
      />
    );

    expect(html).toContain('HEALTH SCORE');
    expect(html).toContain('TOTAL ISSUES');
    expect(html).toContain('ERRORS');
    expect(html).toContain('WARNINGS');
    expect(html).toContain('Dangling Connection');
    expect(html).toContain('ARCH-001');
    expect(html).toContain('Remediation:');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <ArchitectureLintModal
        isOpen={false}
        onClose={vi.fn()}
        model={mockCleanModel}
      />
    );

    expect(html).toBe('');
  });
});
