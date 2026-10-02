import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FailureSimulationModal } from './components/canvas/failure-simulation-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Failure Simulation Canvas UI (F089)', () => {
  const archId = 'arch-sim-test' as ArchitectureId;
  const verId = 'ver-sim-v1' as VersionId;
  const wsId = 'ws-main' as unknown as WorkspaceId;

  const mkObj = (id: string, name: string, kind: string, metadata?: Record<string, unknown>) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null as null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: null as null,
    position: null as null,
    metadata: metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkConn = (id: string, src: string, tgt: string, label?: string) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: null as null,
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
      name: 'Test Platform',
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

  // Actor → WebApp → APIGateway → PostgresDB
  //                              → Redis (hasFallback: true)
  const fullModel = mkModel(
    [
      mkObj('actor', 'End User', 'actor'),
      mkObj('webapp', 'Web Application', 'application', { owner: 'frontend-team' }),
      mkObj('gateway', 'API Gateway', 'application'),
      mkObj('db', 'PostgreSQL DB', 'store'),
      mkObj('cache', 'Redis Cache', 'store', { hasFallback: true }),
    ],
    [
      mkConn('c1', 'actor', 'webapp', 'HTTPS'),
      mkConn('c2', 'webapp', 'gateway', 'REST'),
      mkConn('c3', 'gateway', 'db', 'SQL'),
      mkConn('c4', 'gateway', 'cache', 'TCP'),
    ]
  );

  it('renders modal with failure simulation metrics and flags downstream nodes with fallback distinguished', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <FailureSimulationModal
        isOpen={true}
        onClose={onClose}
        model={fullModel}
        initialDownedNodeIds={['db']}
      />
    );

    // Modal title
    expect(html).toContain('Failure Simulation');

    // Severity banner present
    expect(html).toMatch(/critical|high|medium|low/i);

    // KPI cards
    expect(html).toContain('Downed Nodes');
    expect(html).toContain('Degraded (No Fallback)');
    expect(html).toContain('Fallback Active');
    expect(html).toContain('Customer Facing');

    // Downed node PostgreSQL DB
    expect(html).toContain('PostgreSQL DB');
    expect(html).toContain('DOWN');

    // Downstream API Gateway degraded without fallback
    expect(html).toContain('API Gateway');
    expect(html).toContain('DEGRADED');
    expect(html).toContain('NO FALLBACK');

    // Redis Cache is not upstream of DB, remains healthy
    expect(html).toContain('Redis Cache');
    expect(html).toContain('HEALTHY');
  });

  it('distinguishes fallback-ready services when simulated downstream', () => {
    // Model with a fallback-capable service
    const resilientModel = mkModel(
      [
        mkObj('actor', 'End User', 'actor'),
        mkObj('orders', 'Order Service', 'application', { hasFallback: true }),
        mkObj('db', 'Orders DB', 'store'),
      ],
      [
        mkConn('c1', 'actor', 'orders', 'HTTPS'),
        mkConn('c2', 'orders', 'db', 'SQL'),
      ]
    );

    const onClose = vi.fn();
    const html = renderToString(
      <FailureSimulationModal
        isOpen={true}
        onClose={onClose}
        model={resilientModel}
        initialDownedNodeIds={['db']}
      />
    );

    // Orders DB is DOWN
    expect(html).toContain('Orders DB');
    expect(html).toContain('DOWN');

    // Order Service has fallback → shows FALLBACK READY
    expect(html).toContain('Order Service');
    expect(html).toContain('FALLBACK READY');
    expect(html).toContain('FALLBACK ACTIVE');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <FailureSimulationModal
        isOpen={false}
        onClose={onClose}
        model={fullModel}
      />
    );
    expect(html).toBe('');
  });
});
