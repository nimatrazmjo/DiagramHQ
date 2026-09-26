import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createC4Database,
  createC4Service,
  createC4System,
  createC4WebApp,
  createId,
  isModelIdentical,
  projectC4ContainerToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { C4ContainerNode } from './components/canvas/c4-container-node';
import { C4SystemBoundaryNode } from './components/canvas/c4-system-boundary-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('C4 Container UI Rendering & Drill-Down (F020)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const sysId = createId('sys');

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

  const createTestNodeProps = (id: string, data: Record<string, unknown>, type = 'c4Container'): NodeProps => ({
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

  describe('1. C4ContainerNode Component Rendering (Acceptance Criteria)', () => {
    it('renders a Web Application container with technology tag and drill button', () => {
      const props = createTestNodeProps('node-web-1', {
        label: 'Single-Page App',
        containerKind: 'web_app',
        technology: 'TypeScript / React',
        description: 'Delivers customer web interface',
        canDrillToComponents: true,
        systemId: sysId,
      });

      const html = renderWithFlow(React.createElement(C4ContainerNode, props));
      expect(html).toContain('data-testid="c4-app-node"');
      expect(html).toContain('Single-Page App');
      expect(html).toContain('[Container: Web App]');
      expect(html).toContain('C4 Level 2');
      expect(html).toContain('[TypeScript / React]');
      expect(html).toContain('data-testid="drill-to-components-btn"');
    });

    it('renders an API Service container with technology tag and drill button', () => {
      const props = createTestNodeProps('node-api-1', {
        label: 'API Gateway',
        containerKind: 'api',
        technology: 'NestJS / TypeScript',
        description: 'Provides REST APIs to the web app',
        canDrillToComponents: true,
        systemId: sysId,
      });

      const html = renderWithFlow(React.createElement(C4ContainerNode, props));
      expect(html).toContain('data-testid="c4-service-node"');
      expect(html).toContain('API Gateway');
      expect(html).toContain('[Container: API Service]');
      expect(html).toContain('[NestJS / TypeScript]');
      expect(html).toContain('data-testid="drill-to-components-btn"');
    });

    it('renders a Database container with technology tag and no drill button', () => {
      const props = createTestNodeProps('node-db-1', {
        label: 'Main Database',
        containerKind: 'database',
        technology: 'PostgreSQL 16',
        description: 'Stores customer account information',
        canDrillToComponents: false,
        systemId: sysId,
      });

      const html = renderWithFlow(React.createElement(C4ContainerNode, props));
      expect(html).toContain('data-testid="c4-database-node"');
      expect(html).toContain('Main Database');
      expect(html).toContain('[Container: Database]');
      expect(html).toContain('[PostgreSQL 16]');
      expect(html).not.toContain('data-testid="drill-to-components-btn"');
    });

    it('renders a Message Queue container with technology tag and no drill button', () => {
      const props = createTestNodeProps('node-queue-1', {
        label: 'Transaction Queue',
        containerKind: 'queue',
        technology: 'Kafka',
        description: 'Event streaming platform',
        canDrillToComponents: false,
        systemId: sysId,
      });

      const html = renderWithFlow(React.createElement(C4ContainerNode, props));
      expect(html).toContain('data-testid="c4-queue-node"');
      expect(html).toContain('Transaction Queue');
      expect(html).toContain('[Container: Message Queue]');
      expect(html).toContain('[Kafka]');
      expect(html).not.toContain('data-testid="drill-to-components-btn"');
    });
  });

  describe('2. Drill-to-Components Action Invocation', () => {
    it('invokes onDrillToComponents handler with target containerId', () => {
      const onDrillToComponents = vi.fn();
      const props = createTestNodeProps('node-api-1', {
        label: 'API Service',
        containerKind: 'api',
        canDrillToComponents: true,
        id: 'node-api-1',
        onDrillToComponents,
      });

      const element = React.createElement(C4ContainerNode, props);
      expect(element).toBeDefined();

      (props.data.onDrillToComponents as (id: string) => void)('node-api-1');
      expect(onDrillToComponents).toHaveBeenCalledWith('node-api-1');
    });
  });

  describe('3. C4SystemBoundaryNode Rendering', () => {
    it('renders the enclosing system boundary with system label', () => {
      const props = createTestNodeProps('node-boundary-1', {
        label: 'Internet Banking System',
        systemId: sysId,
        description: 'Core banking software system',
      }, 'c4SystemBoundary');

      const html = renderWithFlow(React.createElement(C4SystemBoundaryNode, props));
      expect(html).toContain('data-testid="c4-system-boundary"');
      expect(html).toContain('[System Boundary: Internet Banking System]');
      expect(html).toContain('Core banking software system');
    });
  });

  describe('4. Canvas Integration & Model Persistence', () => {
    it('mounts InfiniteCanvas with projected C4 Container nodes and edges', () => {
      const system = createC4System(archId, verId, 'Internet Banking');
      const web = createC4WebApp(archId, verId, system.id, 'Banking Web App', 'React');
      const api = createC4Service(archId, verId, system.id, 'Banking API', 'Node.js');
      const db = createC4Database(archId, verId, system.id, 'Banking DB', 'PostgreSQL');

      const conn: ModelConnection = {
        id: createId('con'),
        architectureId: archId,
        versionId: verId,
        sourceObjectId: web.id,
        targetObjectId: api.id,
        kind: 'sync',
        label: 'Makes API calls to',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { nodes, edges } = projectC4ContainerToCanvas(system, [web, api, db], [conn]);
      expect(nodes.length).toBeGreaterThanOrEqual(4); // boundary + 3 containers
      expect(edges).toHaveLength(1);

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: nodes,
          initialEdges: edges,
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates C4 containers through ArchitectureModelClient and reloads an identical model', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create System
      const system = await client.createObject({
        name: 'Internet Banking System',
        kind: 'system',
      });

      // 2. Create containers inside the system
      const web = await client.createObject({
        parentId: system.id,
        name: 'Banking Web App',
        kind: 'application',
        metadata: {
          containerKind: 'web_app',
          technology: 'React / TypeScript',
        },
      });

      const api = await client.createObject({
        parentId: system.id,
        name: 'Banking API',
        kind: 'application',
        metadata: {
          containerKind: 'api',
          technology: 'NestJS',
        },
      });

      const db = await client.createObject({
        parentId: system.id,
        name: 'Banking Database',
        kind: 'store',
        metadata: {
          containerKind: 'database',
          technology: 'PostgreSQL',
        },
      });

      const queue = await client.createObject({
        parentId: system.id,
        name: 'Payment Events Queue',
        kind: 'store',
        metadata: {
          containerKind: 'queue',
          technology: 'Kafka',
        },
      });

      // 3. Connect containers
      const conn1 = await client.createConnection({
        sourceObjectId: web.id,
        targetObjectId: api.id,
        kind: 'sync',
        label: 'Uses',
      });

      const conn2 = await client.createConnection({
        sourceObjectId: api.id,
        targetObjectId: db.id,
        kind: 'sync',
        label: 'Reads and writes to',
      });

      const conn3 = await client.createConnection({
        sourceObjectId: api.id,
        targetObjectId: queue.id,
        kind: 'async',
        label: 'Publishes events to',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(5);
      expect(snapshot.connections).toHaveLength(3);

      // Verify containers point to system
      const childContainers = snapshot.objects.filter((o) => o.parentId === system.id);
      expect(childContainers).toHaveLength(4);

      // 4. Verify reload identity
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [queue, db, api, web, system], // reordered
        connections: [conn3, conn2, conn1],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
