import { describe, it, expect } from 'vitest';
import { traceDataLineage } from './data-lineage';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from './types';

describe('Data Lineage Tracing & Compliance Engine (F091)', () => {
  const archId = 'arch-lineage-test' as ArchitectureId;
  const verId = 'ver-lineage-v1' as VersionId;
  const wsId = 'ws-lineage-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string,
    metadata?: Record<string, unknown>
  ) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: null,
    position: null,
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
    description: null,
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
   * End-to-end 5-hop pipeline:
   * Source Store (Postgres DB with PII/PCI)
   *   → ETL Service (hop 1)
   *   → Data Warehouse (hop 2)
   *   → Analytics API (hop 3)
   *   → Reporting Dashboard (hop 4)
   *   → BI Analyst Actor (hop 5)
   */
  const deepPipelineModel = mkModel(
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

  it('traces end-to-end data lineage across 4+ hops from source of truth to consumption', () => {
    const report = traceDataLineage(deepPipelineModel, 'db' as unknown as ObjectId);

    // 1. Source node is correctly identified
    expect(report.sourceNodeName).toBe('Customer Master DB');
    expect(report.sourceKind).toBe('store');
    expect(report.sourceComplianceZones).toContain('PII');
    expect(report.sourceComplianceZones).toContain('PCI');

    // 2. Traverses across 4+ hops (reaches 5 hops)
    expect(report.metrics.maxHopsReached).toBeGreaterThanOrEqual(4);
    expect(report.metrics.maxHopsReached).toBe(5);

    // 3. Consumers discovered
    const finalPath = report.paths.find((p) => p.targetNodeName === 'BI Analyst');
    expect(finalPath).toBeDefined();
    expect(finalPath!.totalHops).toBe(5);
    expect(finalPath!.hops.length).toBe(6); // [source, hop1, hop2, hop3, hop4, hop5]

    // Verify sequence of hops in path
    const hopNames = finalPath!.hops.map((h) => h.nodeName);
    expect(hopNames).toEqual([
      'Customer Master DB',
      'Nightly ETL Pipeline',
      'Cloud Data Warehouse',
      'Analytics Query Gateway',
      'Executive BI Dashboard',
      'BI Analyst',
    ]);
  });

  it('highlights compliance zones (PII / PCI) along the path and flags boundary crossings', () => {
    const report = traceDataLineage(deepPipelineModel, 'db' as unknown as ObjectId);

    // 1. Compliance zones highlighted along path
    expect(report.metrics.complianceZoneCounts.PII).toBeGreaterThanOrEqual(2);
    expect(report.metrics.complianceZoneCounts.PCI).toBeGreaterThanOrEqual(1);

    // 2. Boundary crossings detected
    expect(report.boundaryCrossings.length).toBeGreaterThanOrEqual(3);

    // Crossing from Analytics VPC to Corporate Network without TLS
    const unencryptedCrossing = report.boundaryCrossings.find(
      (c) =>
        c.fromZone === 'Analytics VPC' &&
        c.toZone === 'Corporate Network' &&
        !c.hasInTransitEncryption
    );
    expect(unencryptedCrossing).toBeDefined();
    expect(unencryptedCrossing!.isCompliant).toBe(false);
    expect(unencryptedCrossing!.warning).toContain('without in-transit encryption');

    // Metrics reflect non-compliant crossing
    expect(report.metrics.boundaryCrossingCount).toBeGreaterThanOrEqual(3);
    expect(report.metrics.nonCompliantCrossingCount).toBeGreaterThanOrEqual(1);
    expect(report.metrics.isFullyEncryptedInTransit).toBe(false);
  });

  it('resolves read/query edge reversals for store consumption', () => {
    // Service reads from DB: App queries DB, then sends to Web
    const queryModel = mkModel(
      [
        mkObj('orders-db', 'Orders DB', 'store', { pii: true }),
        mkObj('orders-svc', 'Orders Service', 'application'),
        mkObj('web', 'Web Front-End', 'application'),
        mkObj('customer', 'Customer', 'actor'),
      ],
      [
        // App queries DB -> data flows DB -> App
        mkConn('c1', 'orders-svc', 'orders-db', 'SQL query / read'),
        mkConn('c2', 'orders-svc', 'web', 'gRPC stream', { tls: true }),
        mkConn('c3', 'web', 'customer', 'HTTPS JSON', { tls: true }),
      ]
    );

    const report = traceDataLineage(queryModel, 'orders-db' as unknown as ObjectId);

    // Trace reaches Customer in 3 hops even though connection was orders-svc -> orders-db
    expect(report.metrics.maxHopsReached).toBe(3);
    const customerPath = report.paths.find((p) => p.targetNodeName === 'Customer');
    expect(customerPath).toBeDefined();
    expect(customerPath!.totalHops).toBe(3);
  });
});
