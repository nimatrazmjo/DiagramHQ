import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DependencyAnalysisModal } from './components/canvas/dependency-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Dependency Analysis Canvas UI (F087)', () => {
  const archId = 'arch-dep-test' as ArchitectureId;
  const verId = 'ver-dep-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

  // Cyclic model: A → B → C → A
  const cyclicModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Cyclic Platform',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj_a' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Service A',
        kind: 'application',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_b' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Service B',
        kind: 'application',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_c' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'Service C',
        kind: 'application',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn_ab' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_a' as unknown as ObjectId,
        targetObjectId: 'obj_b' as unknown as ObjectId,
        kind: 'sync',
        label: 'calls',
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conn_bc' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_b' as unknown as ObjectId,
        targetObjectId: 'obj_c' as unknown as ObjectId,
        kind: 'sync',
        label: 'calls',
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conn_ca' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_c' as unknown as ObjectId,
        targetObjectId: 'obj_a' as unknown as ObjectId,
        kind: 'sync',
        label: 'calls back',
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  // Linear model: Actor → App → Store (indirect path)
  const linearModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Linear Platform',
      defaultVersionId: verId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj_actor' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'End User',
        kind: 'actor',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_api' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'API Service',
        kind: 'application',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_store' as unknown as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        name: 'PostgreSQL DB',
        kind: 'store',
        description: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'conn_user_api' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_actor' as unknown as ObjectId,
        targetObjectId: 'obj_api' as unknown as ObjectId,
        kind: 'sync',
        label: 'HTTPS',
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conn_api_store' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: 'obj_api' as unknown as ObjectId,
        targetObjectId: 'obj_store' as unknown as ObjectId,
        kind: 'data',
        label: 'SQL',
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  it('renders modal with metrics and cycle warning for cyclic model', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <DependencyAnalysisModal isOpen={true} onClose={onClose} model={cyclicModel} />
    );

    // Title
    expect(html).toContain('Dependency Analysis');
    // Cycle warning banner
    expect(html).toContain('circular dependency');
    // Metric cards
    expect(html).toContain('Nodes');
    expect(html).toContain('Direct');
    expect(html).toContain('Cycles');
    // Edge data: Service A → Service B
    expect(html).toContain('Service A');
    expect(html).toContain('Service B');
  });

  it('renders modal with indirect path info for non-cyclic model', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <DependencyAnalysisModal isOpen={true} onClose={onClose} model={linearModel} />
    );

    // Title
    expect(html).toContain('Dependency Analysis');
    // No cycle banner
    expect(html).not.toContain('circular dependency');
    // Shows nodes
    expect(html).toContain('End User');
    expect(html).toContain('API Service');
    expect(html).toContain('PostgreSQL DB');
    // Indirect label present for transitive path
    expect(html).toContain('indirect');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <DependencyAnalysisModal isOpen={false} onClose={onClose} model={linearModel} />
    );
    expect(html).toBe('');
  });
});
