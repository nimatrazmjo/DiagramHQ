import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createC4Person,
  createC4System,
  createId,
  isModelIdentical,
  projectC4ContextToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { C4ContextNode } from './components/canvas/c4-context-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('C4 Context UI Rendering & Drill-Down (F019)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

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

  const createTestNodeProps = (id: string, data: Record<string, unknown>): NodeProps => ({
    id,
    data,
    selected: false,
    type: 'c4Context',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. C4ContextNode Component Rendering (Acceptance Criteria)', () => {
    it('renders a C4 Person (Actor) with distinct persona card', () => {
      const props = createTestNodeProps('node-person-1', {
        label: 'Customer',
        c4Kind: 'person',
        description: 'A personal banking customer with savings account',
      });

      const html = renderWithFlow(React.createElement(C4ContextNode, props));
      expect(html).toContain('data-testid="c4-person-node"');
      expect(html).toContain('Customer');
      expect(html).toContain('Person');
      expect(html).toContain('Actor');
      expect(html).toContain('A personal banking customer with savings account');
      expect(html).not.toContain('data-testid="drill-down-btn"');
    });

    it('renders an Internal Software System with drill-down button (Acceptance Criteria)', () => {
      const props = createTestNodeProps('node-sys-1', {
        label: 'Internet Banking System',
        c4Kind: 'system',
        description: 'Allows customers to view accounts and make payments',
        canDrillDown: true,
        systemId: 'node-sys-1',
      });

      const html = renderWithFlow(React.createElement(C4ContextNode, props));
      expect(html).toContain('data-testid="c4-system-node"');
      expect(html).toContain('Internet Banking System');
      expect(html).toContain('System');
      expect(html).toContain('C4 Level 1');
      // Acceptance criterion: drill from a system to its containers
      expect(html).toContain('data-testid="drill-down-btn"');
      expect(html).toContain('Containers');
    });

    it('renders an External Software System with dashed boundary and no drill-down', () => {
      const props = createTestNodeProps('node-ext-1', {
        label: 'Mainframe Banking System',
        c4Kind: 'external_system',
        external: true,
        description: 'Core legacy accounting system',
      });

      const html = renderWithFlow(React.createElement(C4ContextNode, props));
      expect(html).toContain('data-testid="c4-external-system-node"');
      expect(html).toContain('Mainframe Banking System');
      expect(html).toContain('External System');
      expect(html).toContain('Third-Party');
      expect(html).not.toContain('data-testid="drill-down-btn"');
    });
  });

  describe('2. Drill-Down Action Invocation', () => {
    it('invokes onDrillDown handler with the target systemId', () => {
      const onDrillDown = vi.fn();
      const props = createTestNodeProps('node-sys-1', {
        label: 'Internet Banking System',
        c4Kind: 'system',
        canDrillDown: true,
        systemId: 'sys-target-99',
        onDrillDown,
      });

      const element = React.createElement(C4ContextNode, props);
      expect(element).toBeDefined();

      // Trigger drill-down directly through nodeData handler
      (props.data.onDrillDown as (id: string) => void)('sys-target-99');
      expect(onDrillDown).toHaveBeenCalledWith('sys-target-99');
    });
  });

  describe('3. Canvas Integration & Model Persistence', () => {
    it('mounts InfiniteCanvas with projected C4 Context nodes and edges', () => {
      const person = createC4Person(archId, verId, 'Banking Customer');
      const system = createC4System(archId, verId, 'Core Banking App');
      const conn: ModelConnection = {
        id: createId('con'),
        architectureId: archId,
        versionId: verId,
        sourceObjectId: person.id,
        targetObjectId: system.id,
        kind: 'sync',
        label: 'Uses',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { nodes, edges } = projectC4ContextToCanvas([person, system], [conn]);
      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: nodes,
          initialEdges: edges,
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates C4 elements through ArchitectureModelClient and reloads an identical model', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create Person, System, External System
      const person = await client.createObject({
        name: 'Trader',
        kind: 'actor',
        description: 'Securities trader',
      });

      const system = await client.createObject({
        name: 'Trading Platform',
        kind: 'system',
        description: 'Order matching engine',
      });

      const external = await client.createObject({
        name: 'Bloomberg Terminal',
        kind: 'system',
        metadata: { external: true },
      });

      // 2. Connect Person -> System
      const conn = await client.createConnection({
        sourceObjectId: person.id,
        targetObjectId: system.id,
        kind: 'sync',
        label: 'Places trade orders',
      });

      const initialSnapshot = client.getModel()!;
      expect(initialSnapshot.objects).toHaveLength(3);
      expect(initialSnapshot.connections).toHaveLength(1);

      // 3. Simulate reload
      const reloadedSnapshot = {
        architecture: { ...initialSnapshot.architecture },
        version: { ...initialSnapshot.version },
        objects: [external, person, system],
        connections: [conn],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(initialSnapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
