import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DataLineageModal } from './components/canvas/data-lineage-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Data Lineage Canvas UI (F091)', () => {
  const archId = 'arch-lineage-ui-test' as ArchitectureId;
  const verId = 'ver-lineage-ui-v1' as VersionId;
  const wsId = 'ws-lineage-ui-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string,
    metadata?: Record<string, unknown>
  ) => ({
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

  const mkConn = (
    id: string,
    src: string,
    tgt: string,
    label?: string,
    metadata?: Record<string, unknown>
  ) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: null as null,
    metadata: metadata ?? {},
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
      name: 'Lineage Test Platform',
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

  /**
   * 4+ hop lineage pipeline:
   * Source Store (Postgres DB with PII/PCI)
   *   → ETL Service (hop 1)
   *   → Data Warehouse (hop 2)
   *   → Analytics API (hop 3)
   *   → Reporting Dashboard (hop 4)
   *   → BI Analyst (hop 5)
   */
  const pipelineModel = mkModel(
    [
      mkObj('db', 'Customer Master DB', 'store', {
        trustZone: 'Secure Data Tier',
        pii: true,
        pci: true,
      }),
      mkObj('etl', 'Nightly ETL Pipeline', 'application', {
        trustZone: 'Secure Data Tier',
        pii: true,
      }),
      mkObj('dwh', 'Cloud Data Warehouse', 'store', {
        trustZone: 'Analytics VPC',
        compliance: ['PII'],
      }),
      mkObj('api', 'Analytics Query Gateway', 'application', {
        trustZone: 'Analytics VPC',
      }),
      mkObj('dashboard', 'Executive BI Dashboard', 'application', {
        trustZone: 'Corporate Network',
      }),
      mkObj('analyst', 'BI Analyst', 'actor', {
        trustZone: 'Public Internet',
      }),
    ],
    [
      mkConn('c1', 'db', 'etl', 'CDC Stream', { tls: true }),
      mkConn('c2', 'etl', 'dwh', 'Batch Load', { tls: true }),
      mkConn('c3', 'dwh', 'api', 'SQL Query', { tls: true }),
      mkConn('c4', 'api', 'dashboard', 'REST / JSON', { tls: false }), // Missing TLS across boundary
      mkConn('c5', 'dashboard', 'analyst', 'HTTPS', { tls: true }),
    ]
  );

  it('renders modal with lineage trace across 4+ hops and highlights compliance zones', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <DataLineageModal
        isOpen={true}
        onClose={onClose}
        model={pipelineModel}
        initialSourceNodeId="db"
      />
    );

    // Modal title
    expect(html).toContain('Data Lineage &amp; Compliance Tracing');

    // Source node Customer Master DB
    expect(html).toContain('Customer Master DB');

    // Compliance badges present (PII, PCI)
    expect(html).toContain('PII');
    expect(html).toContain('PCI');

    // Traverses 4+ hops (5 hops)
    expect(html).toContain('5 hops');

    // KPI cards
    expect(html).toContain('Max Hops');
    expect(html).toContain('End Consumers');
    expect(html).toContain('Boundary Crossings');
    expect(html).toContain('Unencrypted Crossings');

    // Hops rendered along path
    expect(html).toContain('Nightly ETL Pipeline');
    expect(html).toContain('Cloud Data Warehouse');
    expect(html).toContain('Analytics Query Gateway');
    expect(html).toContain('Executive BI Dashboard');
    expect(html).toContain('BI Analyst');

    // Flags unencrypted boundary crossing
    expect(html).toContain('unencrypted boundary crossing(s) detected');
    expect(html).toContain('CROSSING VIOLATION');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <DataLineageModal
        isOpen={false}
        onClose={onClose}
        model={pipelineModel}
      />
    );
    expect(html).toBe('');
  });
});
