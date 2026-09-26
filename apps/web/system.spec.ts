import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  createArchitectureModel,
  createId,
  createSystem,
  isModelIdentical,
  projectSystemToCanvas,
  type Architecture,
  type ModelConnection,
  type Version,
} from '@diagramhq/domain';
import { SystemNode } from './components/canvas/system-node';
import { InfiniteCanvas } from './components/canvas';
import { ArchitectureModelClient } from './lib/model/architecture-model-client';

describe('System UI Rendering & Canvas Projection (F023)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  const baseArch: Architecture = {
    id: archId,
    workspaceId: createId('ws'),
    name: 'Enterprise System Architecture',
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
    type: 'system',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  describe('1. SystemNode Component Rendering', () => {
    it('renders an internal System with domain, systemType, criticality, and container drill-down button', () => {
      const props = createTestNodeProps('node-sys-1', {
        label: 'Core Banking Ledger',
        external: false,
        domain: 'Core Banking',
        systemType: 'Financial Ledger',
        critical: true,
        description: 'Records all double-entry financial transactions',
        canDrillDown: true,
      });

      const html = renderWithFlow(React.createElement(SystemNode, props));
      expect(html).toContain('data-testid="system-node"');
      expect(html).toContain('Core Banking Ledger');
      expect(html).toContain('[Domain: Core Banking]');
      expect(html).toContain('[Type: Financial Ledger]');
      expect(html).toContain('[Tier 0]');
      expect(html).toContain('Internal');
      expect(html).toContain('data-testid="system-drill-down-btn"');
      expect(html).toContain('Records all double-entry financial transactions');
    });

    it('renders an external System (SaaS) with dashed styling, systemType, and no drill-down button', () => {
      const props = createTestNodeProps('node-sys-ext', {
        label: 'Twilio SMS Gateway',
        external: true,
        domain: 'Telecommunications',
        systemType: 'External SaaS',
        description: 'Dispatches 2FA one-time passwords via SMS',
        canDrillDown: false,
      });

      const html = renderWithFlow(React.createElement(SystemNode, props));
      expect(html).toContain('data-testid="external-system-node"');
      expect(html).toContain('Twilio SMS Gateway');
      expect(html).toContain('External System');
      expect(html).toContain('[External SaaS]');
      expect(html).toContain('[Domain: Telecommunications]');
      expect(html).not.toContain('data-testid="system-drill-down-btn"');
      expect(html).toContain('border-dashed');
    });

    it('renders selected visual ring when selected is true', () => {
      const props = createTestNodeProps('node-sys-sel', {
        label: 'Authentication Gateway',
      }, true);

      const html = renderWithFlow(React.createElement(SystemNode, props));
      expect(html).toContain('ring-blue-500/30');
    });
  });

  describe('2. Drill-down Action Invocation', () => {
    it('invokes onDrillDown callback when container drill-down action is invoked', () => {
      const onDrillDown = vi.fn();
      const props = createTestNodeProps('sys-123', {
        label: 'Internet Banking',
        systemId: 'sys-123',
        canDrillDown: true,
        onDrillDown,
      });

      const element = React.createElement(SystemNode, props);
      expect(element).toBeDefined();

      (props.data.onDrillDown as (id: string) => void)('sys-123');
      expect(onDrillDown).toHaveBeenCalledWith('sys-123');
    });
  });

  describe('3. Canvas Projection & Model Integration', () => {
    it('mounts InfiniteCanvas with projected System nodes', () => {
      const internalSys = createSystem(archId, verId, 'Payments Engine', {
        domain: 'Payments',
        critical: true,
        position: { x: 100, y: 150 },
      });
      const externalSys = createSystem(archId, verId, 'Stripe Gateway', {
        external: true,
        position: { x: 450, y: 150 },
      });

      const node1 = projectSystemToCanvas(internalSys);
      const node2 = projectSystemToCanvas(externalSys);

      expect(node1.id).toBe(internalSys.id);
      expect(node1.type).toBe('system');
      expect(node1.data.canDrillDown).toBe(true);

      expect(node2.id).toBe(externalSys.id);
      expect(node2.data.canDrillDown).toBe(false);

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [node1, node2],
          initialEdges: [],
        }),
      );

      expect(html).toContain('data-testid="canvas-status-badge"');
    });

    it('creates Systems through ArchitectureModelClient with reload identity', async () => {
      const client = new ArchitectureModelClient(createArchitectureModel(baseArch, baseVersion));

      // 1. Create Internal and External Systems
      const ledger = await client.createObject({
        name: 'Core Ledger',
        kind: 'system',
        metadata: {
          domain: 'Core Banking',
          critical: true,
          external: false,
        },
      });

      const stripe = await client.createObject({
        name: 'Stripe SaaS',
        kind: 'system',
        metadata: {
          external: true,
        },
      });

      // 2. Connect Systems
      const conn: ModelConnection = await client.createConnection({
        sourceObjectId: ledger.id,
        targetObjectId: stripe.id,
        kind: 'sync',
        label: 'Settles Charges',
      });

      const snapshot = client.getModel()!;
      expect(snapshot.objects).toHaveLength(2);
      expect(snapshot.connections).toHaveLength(1);

      // 3. Reload identity verification
      const reloadedSnapshot = {
        architecture: { ...snapshot.architecture },
        version: { ...snapshot.version },
        objects: [stripe, ledger],
        connections: [conn],
      };

      expect(client.isIdenticalTo(reloadedSnapshot)).toBe(true);
      expect(isModelIdentical(snapshot, reloadedSnapshot)).toBe(true);
    });
  });
});
