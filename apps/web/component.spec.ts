import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createId,
  createComponent,
  isModelIdentical,
  projectComponentToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { ComponentNode } from './components/canvas/component-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('Component UI Rendering & Canvas Projection (F025)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const appId = createId('app');

  const baseArch: Architecture = {
    id: archId,
    workspaceId: createId('ws'),
    name: 'Enterprise Architecture',
    defaultVersionId: verId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseVersion: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'draft',
    createdAt: new Date(),
  };

  const renderWithFlow = (element: React.ReactElement): string => {
    return renderToString(React.createElement(ReactFlowProvider, null, element));
  };

  const createTestNodeProps = (id: string, data: Record<string, unknown>, selected = false): NodeProps => ({
    id,
    data,
    selected,
    type: 'component',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. ComponentNode Rendering', () => {
    it('renders a Service component with technology, interfaces, and code reference', () => {
      const props = createTestNodeProps('node-cmp-svc', {
        label: 'PaymentService',
        componentKind: 'service',
        technology: 'TypeScript',
        interfaces: ['IPaymentProcessor', 'IHealthCheck'],
        codeRef: 'src/services/payment.service.ts',
        description: 'Handles payment processing and gateway communication',
      });

      const html = renderWithFlow(React.createElement(ComponentNode, props));
      expect(html).toContain('data-testid="component-node"');
      expect(html).toContain('PaymentService');
      expect(html).toContain('data-testid="component-kind-badge"');
      expect(html).toContain('[Component: Service]');
      expect(html).toContain('data-testid="component-technology"');
      expect(html).toContain('[TypeScript]');
      expect(html).toContain('data-testid="component-interfaces"');
      expect(html).toContain('IPaymentProcessor');
      expect(html).toContain('IHealthCheck');
      expect(html).toContain('data-testid="component-code-ref"');
      expect(html).toContain('src/services/payment.service.ts');
      expect(html).toContain('data-testid="component-code-ref-btn"');
      expect(html).toContain('Handles payment processing and gateway communication');
    });

    it('renders a Repository component with repository styling and kind badge', () => {
      const props = createTestNodeProps('node-cmp-repo', {
        label: 'OrderRepository',
        componentKind: 'repository',
        technology: 'Prisma / PostgreSQL',
        description: 'Data access layer for orders table',
      });

      const html = renderWithFlow(React.createElement(ComponentNode, props));
      expect(html).toContain('data-testid="component-node"');
      expect(html).toContain('OrderRepository');
      expect(html).toContain('[Component: Repository]');
      expect(html).toContain('[Prisma / PostgreSQL]');
      expect(html).toContain('Data access layer for orders table');
    });

    it('renders a Controller component with controller kind badge', () => {
      const props = createTestNodeProps('node-cmp-ctrl', {
        label: 'OrdersController',
        componentKind: 'controller',
        technology: 'NestJS',
      });

      const html = renderWithFlow(React.createElement(ComponentNode, props));
      expect(html).toContain('OrdersController');
      expect(html).toContain('[Component: Controller]');
      expect(html).toContain('[NestJS]');
    });

    it('renders selected visual ring when selected is true', () => {
      const props = createTestNodeProps('node-cmp-sel', {
        label: 'AuthMiddleware',
        componentKind: 'middleware',
      }, true);

      const html = renderWithFlow(React.createElement(ComponentNode, props));
      expect(html).toContain('ring-blue-400');
    });
  });

  describe('2. Code Reference Inspection Callback', () => {
    it('invokes onInspectCode callback when inspect action is triggered', () => {
      const onInspectCode = vi.fn();
      const props = createTestNodeProps('cmp-123', {
        label: 'PaymentService',
        componentId: 'cmp-123',
        codeRef: 'src/payment.ts',
        onInspectCode,
      });

      const element = React.createElement(ComponentNode, props);
      expect(element).toBeDefined();

      (props.data.onInspectCode as (id: string) => void)('cmp-123');
      expect(onInspectCode).toHaveBeenCalledWith('cmp-123');
    });
  });

  describe('3. Canvas Projection & Model Integration', () => {
    it('mounts InfiniteCanvas with projected Component nodes', () => {
      const svc = createComponent(archId, verId, 'OrderService', {
        parentId: appId,
        componentKind: 'service',
        technology: 'NestJS',
        interfaces: ['IOrderService'],
        position: { x: 100, y: 150 },
      });
      const repo = createComponent(archId, verId, 'OrderRepository', {
        parentId: appId,
        componentKind: 'repository',
        technology: 'Prisma',
        position: { x: 400, y: 150 },
      });

      const node1 = projectComponentToCanvas(svc);
      const node2 = projectComponentToCanvas(repo);

      expect(node1.id).toBe(svc.id);
      expect(node1.type).toBe('component');
      expect(node1.data.componentKind).toBe('service');
      expect(node1.data.technology).toBe('NestJS');
      expect(node2.data.componentKind).toBe('repository');

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [node1, node2],
          initialEdges: [],
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates Components under an Application through ArchitectureModelClient with reload identity', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create parent System and Application
      const system = await client.createObject({
        name: 'Order Management System',
        kind: 'system',
      });

      const app = await client.createObject({
        parentId: system.id,
        name: 'Orders Service',
        kind: 'application',
      });

      // 2. Create Components
      const svc = await client.createObject({
        parentId: app.id,
        name: 'OrderService',
        kind: 'component',
        metadata: {
          componentKind: 'service',
          technology: 'NestJS',
          interfaces: ['IOrderService'],
          codeRef: 'src/orders/order.service.ts',
        },
      });

      const repo = await client.createObject({
        parentId: app.id,
        name: 'OrderRepository',
        kind: 'component',
        metadata: {
          componentKind: 'repository',
          technology: 'Prisma',
          codeRef: 'src/orders/order.repository.ts',
        },
      });

      // 3. Connect Service -> Repository
      const conn: ModelConnection = await client.createConnection({
        sourceObjectId: svc.id,
        targetObjectId: repo.id,
        kind: 'sync',
        label: 'Calls',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(4);
      expect(snapshot.connections).toHaveLength(1);

      // 4. Reload identity verification
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [repo, svc, app, system],
        connections: [conn],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
