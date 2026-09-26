import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createC4Controller,
  createC4DomainService,
  createC4Repository,
  createC4WebApp,
  createId,
  isModelIdentical,
  projectC4ComponentToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { C4ComponentNode } from './components/canvas/c4-component-node';
import { C4ContainerBoundaryNode } from './components/canvas/c4-container-boundary-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('C4 Component UI Rendering & L4 Code Mapping (F021)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const contId = createId('app');

  const baseArch: Architecture = {
    id: archId,
    workspaceId: createId('ws'),
    name: 'Retail Banking Architecture',
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

  const createTestNodeProps = (id: string, data: Record<string, unknown>, type = 'c4Component'): NodeProps => ({
    id,
    data,
    selected: false,
    type,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. C4ComponentNode Component Rendering (Acceptance Criteria)', () => {
    it('renders a Controller component with technology tag and L4 code mapping stub', () => {
      const props = createTestNodeProps('node-ctrl-1', {
        label: 'Accounts Controller',
        componentKind: 'controller',
        technology: 'NestJS Controller',
        description: 'Handles HTTP requests for bank accounts',
        containerId: contId,
        codeMappingStub: {
          filePath: 'src/accounts/accounts.controller.ts',
          symbol: 'AccountsController',
        },
      });

      const html = renderWithFlow(React.createElement(C4ComponentNode, props));
      expect(html).toContain('data-testid="c4-controller-node"');
      expect(html).toContain('Accounts Controller');
      expect(html).toContain('[Component: Controller]');
      expect(html).toContain('C4 Level 3');
      expect(html).toContain('[NestJS Controller]');
      expect(html).toContain('src/accounts/accounts.controller.ts');
      expect(html).toContain('data-testid="c4-code-mapping-btn"');
    });

    it('renders a Service component with technology tag and L4 code mapping stub', () => {
      const props = createTestNodeProps('node-svc-1', {
        label: 'Transfer Service',
        componentKind: 'service',
        technology: 'NestJS Service',
        description: 'Executes money transfers between accounts',
        containerId: contId,
        codeMappingStub: {
          filePath: 'src/transfers/transfer.service.ts',
          symbol: 'TransferService',
        },
      });

      const html = renderWithFlow(React.createElement(C4ComponentNode, props));
      expect(html).toContain('data-testid="c4-component-service-node"');
      expect(html).toContain('Transfer Service');
      expect(html).toContain('[Component: Service]');
      expect(html).toContain('[NestJS Service]');
      expect(html).toContain('src/transfers/transfer.service.ts');
    });

    it('renders a Repository component with technology tag', () => {
      const props = createTestNodeProps('node-repo-1', {
        label: 'Account Repository',
        componentKind: 'repository',
        technology: 'Prisma Client',
        description: 'Queries accounts table',
        containerId: contId,
      });

      const html = renderWithFlow(React.createElement(C4ComponentNode, props));
      expect(html).toContain('data-testid="c4-repository-node"');
      expect(html).toContain('Account Repository');
      expect(html).toContain('[Component: Repository]');
      expect(html).toContain('[Prisma Client]');
      expect(html).not.toContain('data-testid="c4-code-mapping-btn"');
    });
  });

  describe('2. Level 4 Code Mapping Stub Action Invocation', () => {
    it('invokes onInspectCodeStub callback when inspect action is clicked', () => {
      const onInspectCodeStub = vi.fn();
      const props = createTestNodeProps('node-ctrl-1', {
        label: 'Accounts Controller',
        componentKind: 'controller',
        containerId: contId,
        id: 'node-ctrl-1',
        codeMappingStub: {
          filePath: 'src/accounts/accounts.controller.ts',
        },
        onInspectCodeStub,
      });

      const element = React.createElement(C4ComponentNode, props);
      expect(element).toBeDefined();

      (props.data.onInspectCodeStub as (id: string) => void)('node-ctrl-1');
      expect(onInspectCodeStub).toHaveBeenCalledWith('node-ctrl-1');
    });
  });

  describe('3. C4ContainerBoundaryNode Rendering', () => {
    it('renders the enclosing container boundary with container name and technology', () => {
      const props = createTestNodeProps('node-boundary-1', {
        label: 'API Gateway',
        technology: 'NestJS / TypeScript',
        description: 'Backend REST API application',
      }, 'c4ContainerBoundary');

      const html = renderWithFlow(React.createElement(C4ContainerBoundaryNode, props));
      expect(html).toContain('data-testid="c4-container-boundary"');
      expect(html).toContain('[Container Boundary: API Gateway]');
      expect(html).toContain('[NestJS / TypeScript]');
      expect(html).toContain('Backend REST API application');
    });
  });

  describe('4. Canvas Integration & Model Persistence', () => {
    it('mounts InfiniteCanvas with projected C4 Component nodes and edges', () => {
      const container = createC4WebApp(archId, verId, createId('sys'), 'Banking API', 'NestJS');
      const ctrl = createC4Controller(archId, verId, container.id, 'Accounts Controller');
      const svc = createC4DomainService(archId, verId, container.id, 'Transfer Service');
      const repo = createC4Repository(archId, verId, container.id, 'Account Repository');

      const conn: ModelConnection = {
        id: createId('con'),
        architectureId: archId,
        versionId: verId,
        sourceObjectId: ctrl.id,
        targetObjectId: svc.id,
        kind: 'sync',
        label: 'Delegates transfer requests',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { nodes, edges } = projectC4ComponentToCanvas(container, [ctrl, svc, repo], [conn]);
      expect(nodes.length).toBeGreaterThanOrEqual(4); // boundary + 3 components
      expect(edges).toHaveLength(1);

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: nodes,
          initialEdges: edges,
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates C4 components through ArchitectureModelClient and reloads an identical model', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create System and Container
      const system = await client.createObject({
        name: 'Internet Banking System',
        kind: 'system',
      });

      const container = await client.createObject({
        parentId: system.id,
        name: 'Banking API',
        kind: 'application',
      });

      // 2. Create components inside the container
      const ctrl = await client.createObject({
        parentId: container.id,
        name: 'Accounts Controller',
        kind: 'component',
        metadata: {
          componentKind: 'controller',
          technology: 'NestJS Controller',
          codeMappingStub: {
            filePath: 'src/accounts/accounts.controller.ts',
          },
        },
      });

      const svc = await client.createObject({
        parentId: container.id,
        name: 'Transfer Service',
        kind: 'component',
        metadata: {
          componentKind: 'service',
          technology: 'NestJS Service',
        },
      });

      const repo = await client.createObject({
        parentId: container.id,
        name: 'Account Repository',
        kind: 'component',
        metadata: {
          componentKind: 'repository',
          technology: 'Prisma Client',
        },
      });

      // 3. Connect components
      const conn1 = await client.createConnection({
        sourceObjectId: ctrl.id,
        targetObjectId: svc.id,
        kind: 'sync',
        label: 'Delegates to',
      });

      const conn2 = await client.createConnection({
        sourceObjectId: svc.id,
        targetObjectId: repo.id,
        kind: 'sync',
        label: 'Reads/writes through',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(5);
      expect(snapshot.connections).toHaveLength(2);

      const components = snapshot.objects.filter((o) => o.parentId === container.id);
      expect(components).toHaveLength(3);

      // 4. Verify reload identity
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [repo, svc, ctrl, container, system],
        connections: [conn2, conn1],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
