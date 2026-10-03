import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SecurityArchitectureModal } from './components/canvas/security-architecture-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Security Architecture Canvas UI (F090)', () => {
  const archId = 'arch-sec-ui-test' as ArchitectureId;
  const verId = 'ver-sec-ui-v1' as VersionId;
  const wsId = 'ws-sec-ui-main' as unknown as WorkspaceId;

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
      name: 'Security Test Platform',
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

  // Model with trust boundaries, sensitive stores, and public ingress
  const testModel = mkModel(
    [
      mkObj('actor', 'External Client', 'actor'),
      mkObj('ingress', 'Edge API Gateway', 'application', {
        publicEndpoint: true,
        trustZone: 'DMZ Ingress',
        // missing requiresAuth -> flags unauthenticated endpoint
      }),
      mkObj('user-svc', 'User Directory Service', 'application', {
        trustZone: 'Core Internal VPC',
        compliance: ['PII'],
      }),
      mkObj('payments-db', 'Payments Relational Store', 'store', {
        trustZone: 'PCI Enclave',
        pci: true,
        encryptionAtRest: false, // unencrypted sensitive store
      }),
    ],
    [
      mkConn('c1', 'actor', 'ingress', 'HTTP'),
      mkConn('c2', 'ingress', 'user-svc', 'HTTP (Cross-Boundary Plaintxt)'),
      mkConn('c3', 'user-svc', 'payments-db', 'mTLS SQL', { tls: true, auth: true }),
    ]
  );

  it('renders modal with security architecture metrics, trust boundaries, and flags exposures', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <SecurityArchitectureModal
        isOpen={true}
        onClose={onClose}
        model={testModel}
      />
    );

    // Modal title
    expect(html).toContain('Security Architecture');

    // Security score
    expect(html).toContain('SCORE:');

    // KPI cards
    expect(html).toContain('Security Score');
    expect(html).toContain('Trust Boundaries');
    expect(html).toContain('Public Ingress');
    expect(html).toContain('Sensitive Stores');
    expect(html).toContain('Exposures');

    // Critical / exposures rendered
    expect(html).toContain('CRITICAL');
    expect(html).toContain('Unauthenticated Public Endpoint: Edge API Gateway');
    expect(html).toContain('Unencrypted Sensitive Store: Payments Relational Store');
  });

  it('renders modal with compliance classifications and trust boundaries', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <SecurityArchitectureModal
        isOpen={true}
        onClose={onClose}
        model={testModel}
      />
    );

    // Trust boundaries counted and rendered
    expect(html).toContain('Trust Boundaries');
    expect(html).toContain('boundary zones evaluated');

    // Ingress and sensitive stores accounted for
    expect(html).toContain('Edge API Gateway');
    expect(html).toContain('Payments Relational Store');
  });

  it('renders null when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(
      <SecurityArchitectureModal
        isOpen={false}
        onClose={onClose}
        model={testModel}
      />
    );
    expect(html).toBe('');
  });
});

