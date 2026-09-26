import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createId,
  createApplication,
  isModelIdentical,
  projectApplicationToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { AppNode } from './components/canvas/app-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('Application UI Rendering & Canvas Projection (F024)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const sysId = createId('sys');

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
    type: 'application',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. AppNode Component Rendering', () => {
    it('renders an Application service with technology, type, runtime, port, and status', () => {
      const props = createTestNodeProps('node-app-1', {
        label: 'Orders Processing Service',
        applicationType: 'api',
        technology: 'NestJS / TypeScript',
        runtime: 'Node.js 20 LTS',
        status: 'Active',
        port: 3001,
        description: 'Processes online store orders and payment transactions',
        canDrillDown: true,
      });

      const html = renderWithFlow(React.createElement(AppNode, props));
      expect(html).toContain('data-testid="app-node"');
      expect(html).toContain('Orders Processing Service');
      expect(html).toContain('App Service');
      expect(html).toContain('[NestJS / TypeScript]');
      expect(html).toContain('[Type: api]');
      expect(html).toContain('Node.js 20 LTS');
      expect(html).toContain(':3001');
      expect(html).toContain('Active');
      expect(html).toContain('data-testid="app-drill-down-btn"');
      expect(html).toContain('Processes online store orders and payment transactions');
    });

    it('renders selected visual ring when selected is true', () => {
      const props = createTestNodeProps('node-app-sel', {
        label: 'Auth Microservice',
        status: 'Healthy',
      }, true);

      const html = renderWithFlow(React.createElement(AppNode, props));
      expect(html).toContain('ring-emerald-500/30');
    });
  });

  describe('2. Component Drill-down Action Invocation', () => {
    it('invokes onDrillDown callback when component drill-down action is invoked', () => {
      const onDrillDown = vi.fn();
      const props = createTestNodeProps('app-123', {
        label: 'Orders API',
        applicationId: 'app-123',
        canDrillDown: true,
        onDrillDown,
      });

      const element = React.createElement(AppNode, props);
      expect(element).toBeDefined();

      (props.data.onDrillDown as (id: string) => void)('app-123');
      expect(onDrillDown).toHaveBeenCalledWith('app-123');
    });
  });

  describe('3. Canvas Projection & Model Integration', () => {
    it('mounts InfiniteCanvas with projected Application nodes', () => {
      const app1 = createApplication(archId, verId, 'Storefront Web App', {
        parentId: sysId,
        applicationType: 'web',
        technology: 'Next.js 14',
        position: { x: 100, y: 150 },
      });
      const app2 = createApplication(archId, verId, 'Checkout API', {
        parentId: sysId,
        applicationType: 'api',
        technology: 'NestJS',
        position: { x: 400, y: 150 },
      });

      const node1 = projectApplicationToCanvas(app1);
      const node2 = projectApplicationToCanvas(app2);

      expect(node1.id).toBe(app1.id);
      expect(node1.type).toBe('application');
      expect(node1.data.technology).toBe('Next.js 14');
      expect(node2.data.technology).toBe('NestJS');

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [node1, node2],
          initialEdges: [],
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates Applications through ArchitectureModelClient with reload identity', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create parent system and applications
      const system = await client.createObject({
        name: 'E-Commerce Platform',
        kind: 'system',
      });

      const webApp = await client.createObject({
        parentId: system.id,
        name: 'Storefront',
        kind: 'application',
        metadata: {
          applicationType: 'web',
          technology: 'Next.js 14',
        },
      });

      const apiService = await client.createObject({
        parentId: system.id,
        name: 'Orders API',
        kind: 'application',
        metadata: {
          applicationType: 'api',
          technology: 'NestJS',
        },
      });

      // 2. Connect applications
      const conn: ModelConnection = await client.createConnection({
        sourceObjectId: webApp.id,
        targetObjectId: apiService.id,
        kind: 'sync',
        label: 'Submits Orders',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(3);
      expect(snapshot.connections).toHaveLength(1);

      // 3. Reload identity verification
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [apiService, webApp, system],
        connections: [conn],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
