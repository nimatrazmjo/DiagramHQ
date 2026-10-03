import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitectureDocumentationModal } from './components/canvas/architecture-documentation-panel';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ConnectionId,
} from '@diagramhq/domain';

describe('Architecture Documentation Canvas UI (F092)', () => {
  const archId = 'arch-doc-test' as ArchitectureId;
  const verId = 'ver-doc-v1' as VersionId;
  const wsId = 'ws-doc-main' as unknown as WorkspaceId;

  const mkObj = (
    id: string,
    name: string,
    kind: string = 'application',
    parentId: string | null = null,
    metadata: Record<string, unknown> = {},
  ) => ({
    id: id as unknown as ObjectId,
    architectureId: archId,
    versionId: verId,
    parentId: parentId ? (parentId as unknown as ObjectId) : null,
    name,
    kind: kind as 'actor' | 'application' | 'store' | 'component' | 'system' | 'group',
    description: `Official documentation for ${name}.`,
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
    metadata: Record<string, unknown> = {},
  ) => ({
    id: id as unknown as ConnectionId,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: src as unknown as ObjectId,
    targetObjectId: tgt as unknown as ObjectId,
    kind: 'sync' as const,
    label: label ?? null,
    description: `Connection from ${src} to ${tgt}`,
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mkModel = (
    objects: ReturnType<typeof mkObj>[],
    connections: ReturnType<typeof mkConn>[],
  ): ArchitectureModel => ({
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniFlow Cloud Platform',
      description: 'Global distributed event-driven enterprise architecture.',
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
    objects,
    connections,
  });

  it('renders nothing when isOpen is false', () => {
    const model = mkModel([], []);
    const html = renderToString(
      <ArchitectureDocumentationModal
        isOpen={false}
        onClose={() => {}}
        model={model}
      />,
    );
    expect(html).toBe('');
  });

  it('renders the documentation modal with tree, header, and overview page when open', () => {
    const webApp = mkObj('obj-web', 'Storefront Web', 'application', null, {
      technology: 'Next.js 15',
      team: 'Team Frontend',
      status: 'active',
      criticality: 'high',
    });
    const apiGw = mkObj('obj-api', 'API Edge Gateway', 'system', null, {
      technology: 'Kong / Envoy',
      team: 'Core Platform',
      status: 'active',
      criticality: 'critical',
    });
    const orderSvc = mkObj('obj-orders', 'Order Service', 'application', null, {
      technology: 'Go 1.23 / gRPC',
      team: 'Orders Squad',
      status: 'active',
      criticality: 'critical',
      domain: 'Orders',
      tags: ['orders', 'microservice'],
      repository: 'https://github.com/omniflow/order-service',
    });
    const orderWorker = mkObj('obj-worker', 'Order Event Worker', 'component', 'obj-orders', {
      technology: 'Go Routines',
      status: 'active',
    });
    const orderDb = mkObj('obj-db', 'Orders DB', 'store', null, {
      technology: 'PostgreSQL 16',
      status: 'active',
    });

    const conn1 = mkConn('c-1', 'obj-web', 'obj-api', 'Inbound HTTPS', { protocol: 'HTTPS' });
    const conn2 = mkConn('c-2', 'obj-api', 'obj-orders', 'gRPC Forwarding', { protocol: 'gRPC' });
    const conn3 = mkConn('c-3', 'obj-orders', 'obj-db', 'SQL Queries', { protocol: 'Postgres Wire' });

    const model = mkModel(
      [webApp, apiGw, orderSvc, orderWorker, orderDb],
      [conn1, conn2, conn3],
    );

    const html = renderToString(
      <ArchitectureDocumentationModal
        isOpen={true}
        onClose={() => {}}
        model={model}
      />,
    );

    // Modal structure & header checks
    expect(html).toContain('Architecture Living Documentation');
    expect(html).toContain('OmniFlow Cloud Platform');
    expect(html).toContain('5 Objects');

    // Sidebar Tree checks
    expect(html).toContain('Storefront Web');
    expect(html).toContain('API Edge Gateway');
    expect(html).toContain('Order Service');
    expect(html).toContain('Order Event Worker');
    expect(html).toContain('Orders DB');

    // Tabs
    expect(html).toContain('Overview &amp; Metadata');
    expect(html).toContain('Connections');
    expect(html).toContain('Hierarchy');
    expect(html).toContain('Markdown Spec');
    expect(html).toContain('Artifacts');
  });

  it('renders an object documentation page from metadata and connections when selectedObjectId is provided', () => {
    const apiGw = mkObj('obj-api', 'API Edge Gateway', 'system', null, {
      technology: 'Kong / Envoy',
      team: 'Core Platform',
      status: 'active',
    });
    const orderSvc = mkObj('obj-orders', 'Order Service', 'application', null, {
      technology: 'Go 1.23 / gRPC',
      team: 'Orders Squad',
      status: 'active',
      criticality: 'critical',
      domain: 'Orders',
      tags: ['orders', 'microservice'],
      repository: 'https://github.com/omniflow/order-service',
      documentation: 'https://docs.omniflow.internal/order-service',
    });
    const orderWorker = mkObj('obj-worker', 'Order Event Worker', 'component', 'obj-orders', {
      technology: 'Go Routines',
      status: 'active',
    });
    const orderDb = mkObj('obj-db', 'Orders DB', 'store', null, {
      technology: 'PostgreSQL 16',
      status: 'active',
    });

    const conn1 = mkConn('c-1', 'obj-api', 'obj-orders', 'Forward Order Requests', { protocol: 'gRPC' });
    const conn2 = mkConn('c-2', 'obj-orders', 'obj-db', 'Store Transaction Data', { protocol: 'Postgres Wire' });

    const model = mkModel(
      [apiGw, orderSvc, orderWorker, orderDb],
      [conn1, conn2],
    );

    const html = renderToString(
      <ArchitectureDocumentationModal
        isOpen={true}
        onClose={() => {}}
        model={model}
        selectedObjectId="obj-orders"
      />,
    );

    // Active object header checks
    expect(html).toContain('Order Service');
    expect(html).toContain('APPLICATION');
    expect(html).toContain('CRITICAL CRITICALITY');
    expect(html).toContain('Team: Orders Squad');
    expect(html).toContain('Official documentation for Order Service.');

    // Breadcrumbs check
    expect(html).toContain('Location:');
    expect(html).toContain('OmniFlow Cloud Platform');

    // Overview & Metadata tab contents
    expect(html).toContain('Go 1.23 / gRPC');
    expect(html).toContain('Orders');
    expect(html).toContain('#orders');
    expect(html).toContain('#microservice');

    // Inbound & Outbound Connections summary rendered in sections
    expect(html).toContain('Inbound Integrations (Callers)');
    expect(html).toContain('API Edge Gateway');
    expect(html).toContain('Outbound Dependencies');
    expect(html).toContain('Orders DB');

    // Contained subcomponents
    expect(html).toContain('Contained Components &amp; Subsystems');
    expect(html).toContain('Order Event Worker');

    // Action buttons
    expect(html).toContain('Copy Markdown');
    expect(html).toContain('Target in Canvas');
  });
});
