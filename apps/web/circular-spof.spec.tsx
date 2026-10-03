import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CircularSpofModal } from './components/canvas/circular-spof-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Circular Dependencies & SPOF Canvas UI (F130)', () => {
  const archId = 'arch-spof-ui-test' as ArchitectureId;
  const verId = 'ver-spof-ui-v1' as VersionId;
  const wsId = 'ws-spof-ui-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string = 'application',
    metadata: Record<string, unknown> = {}
  ) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: 'Component for structural risk testing.',
    position: null,
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkConn = (
    id: string,
    src: string,
    tgt: string,
    label?: string,
    kind: 'sync' | 'async' | 'data' = 'sync'
  ) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind,
    label: label ?? null,
    description: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkModel = (
    objects: ReturnType<typeof mkObj>[],
    connections: ReturnType<typeof mkConn>[]
  ): ArchitectureModel => ({
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'E-Commerce Cloud Architecture',
      description: 'Microservices architecture with cyclic dependencies and database bottlenecks.',
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
    objects,
    connections,
  });

  // Topology with a cycle and high fan-in SPOF
  const sampleModel = mkModel(
    [
      mkObj('cart', 'Cart Service'),
      mkObj('checkout', 'Checkout Service'),
      mkObj('inventory', 'Inventory Service'),
      mkObj('db', 'Central Order Database', 'store'), // SPOF: 3 incoming connections, unreplicated
    ],
    [
      // Cycle: cart -> checkout -> inventory -> cart
      mkConn('c1', 'cart', 'checkout', 'initiate checkout'),
      mkConn('c2', 'checkout', 'inventory', 'reserve stock'),
      mkConn('c3', 'inventory', 'cart', 'refresh cart state'),
      // Fan-in SPOF: cart, checkout, inventory all connect to db
      mkConn('c4', 'cart', 'db', 'save cart', 'data'),
      mkConn('c5', 'checkout', 'db', 'write order', 'data'),
      mkConn('c6', 'inventory', 'db', 'update stock', 'data'),
    ]
  );

  it('renders modal with title, metrics, cycle findings, and SPOF findings', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <CircularSpofModal
        isOpen={true}
        onClose={onClose}
        model={sampleModel}
      />
    );

    // Header title & badge
    expect(html).toContain('Circular Dependencies &amp; SPOF Detection');
    expect(html).toContain('CRITICAL');

    // KPI cards
    expect(html).toContain('Structural Score');
    expect(html).toContain('Cycles Detected');
    expect(html).toContain('SPOFs Flagged');
    expect(html).toContain('Max Fan-In');
    expect(html).toContain('Critical Risks');

    // Cycle detection content
    expect(html).toContain('Circular Dependency Loops');
    expect(html).toContain('Cart Service ➔ Checkout Service ➔ Inventory Service ➔ Cart Service');
    expect(html).toContain('Decoupling Recommendation:');

    // SPOF detection content
    expect(html).toContain('Single Points of Failure (SPOFs)');
    expect(html).toContain('Central Order Database');
    expect(html).toContain('Fan-in: 3');
    expect(html).toContain('FAN IN BOTTLENECK');
    expect(html).toContain('UNREPLICATED STORE');
    expect(html).toContain('Deploy multi-AZ primary/replica database replication');

    // Action buttons
    expect(html).toContain('Copy Summary');
    expect(html).toContain('Export JSON');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <CircularSpofModal
        isOpen={false}
        onClose={onClose}
        model={sampleModel}
      />
    );
    expect(html).toBe('');
  });
});
