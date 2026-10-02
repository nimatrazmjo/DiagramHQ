import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BlastRadiusModal } from './components/canvas/blast-radius-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Blast-Radius Canvas UI (F088)', () => {
  const archId = 'arch-br-test' as ArchitectureId;
  const verId = 'ver-br-v1' as VersionId;
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

  // Actor → WebApp → APIGateway → DB
  const gatewayModel = mkModel(
    [
      mkObj('actor', 'End User', 'actor'),
      mkObj('webapp', 'Web Application', 'application', { owner: 'frontend-team' }),
      mkObj('gateway', 'API Gateway', 'application'),
      mkObj('db', 'PostgreSQL DB', 'store'),
    ],
    [
      mkConn('c1', 'actor', 'webapp', 'HTTPS'),
      mkConn('c2', 'webapp', 'gateway', 'REST'),
      mkConn('c3', 'gateway', 'db', 'SQL'),
    ]
  );

  // Isolated internal services, no actor
  const isolatedModel = mkModel(
    [
      mkObj('svc', 'Internal Service', 'application'),
      mkObj('proc', 'Data Processor', 'application'),
    ],
    [mkConn('c1', 'svc', 'proc', 'async')]
  );

  it('renders modal with blast-radius metrics and customer-facing warning', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <BlastRadiusModal
        isOpen={true}
        onClose={onClose}
        model={gatewayModel}
        targetNodeId={'gateway' as unknown as ObjectId}
      />
    );

    // Modal title
    expect(html).toContain('Blast-Radius Analysis');
    // Target name
    expect(html).toContain('API Gateway');
    // Severity badge present
    expect(html).toMatch(/critical|high|medium|low/i);
    // Metric cards
    expect(html).toContain('Services');
    expect(html).toContain('Customer Facing');
    expect(html).toContain('Flows');
    // Impacted node Web Application shown
    expect(html).toContain('Web Application');
    // End User (actor) shown as customer-facing
    expect(html).toContain('End User');
    expect(html).toContain('CUSTOMER');
  });

  it('renders modal with no critical warning for isolated internal service failure', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <BlastRadiusModal
        isOpen={true}
        onClose={onClose}
        model={isolatedModel}
        targetNodeId={'proc' as unknown as ObjectId}
      />
    );

    // Modal renders
    expect(html).toContain('Blast-Radius Analysis');
    // No customer-facing critical warning
    expect(html).not.toContain('Critical path with no fallback detected');
    // Internal Service is upstream
    expect(html).toContain('Internal Service');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <BlastRadiusModal
        isOpen={false}
        onClose={onClose}
        model={gatewayModel}
        targetNodeId={'gateway' as unknown as ObjectId}
      />
    );
    expect(html).toBe('');
  });
});
