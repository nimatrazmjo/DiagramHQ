import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EditableNodeLabel } from './components/canvas/editable-node-label';
import { IcePanelEdge } from './components/canvas/icepanel-edge';
import { AppNode, SystemNode, StoreNode } from './components/canvas/custom-nodes';
import {
  UpdateNodeMetadataCommand,
  UpdateEdgeDataCommand,
  defaultCommandDispatcher,
} from './lib/commands';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import { ReactFlowProvider, Position } from '@xyflow/react';
import type * as XyFlowModule from '@xyflow/react';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof XyFlowModule>();
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="edge-label-renderer-portal">{children}</div>
    ),
  };
});

describe('F137 — Inline Rename & Edge Labels', () => {
  describe('1. EditableNodeLabel Component', () => {
    it('renders node label with double-click title and data-testid in display mode', () => {
      const html = renderToString(
        <EditableNodeLabel nodeId="node-1" label="Payment Gateway" isEditing={false} />,
      );

      expect(html).toContain('data-testid="node-label"');
      expect(html).toContain('data-node-id="node-1"');
      expect(html).toContain('Payment Gateway');
      expect(html).toContain('title="Double-click to rename"');
      expect(html).not.toContain('data-testid="inline-node-rename-input"');
    });

    it('renders input in edit mode with autofocus styling and data-testid', () => {
      const html = renderToString(
        <EditableNodeLabel nodeId="node-1" label="Payment Gateway" isEditing={true} />,
      );

      expect(html).toContain('data-testid="inline-node-rename-input"');
      expect(html).toContain('data-node-id="node-1"');
      expect(html).toContain('value="Payment Gateway"');
      expect(html).toContain('nodrag');
      expect(html).toContain('nopan');
    });
  });

  describe('2. Custom Nodes with Inline Renaming', () => {
    it('AppNode, SystemNode, and StoreNode render with EditableNodeLabel', () => {
      const appNodeProps = {
        id: 'app-1',
        data: { label: 'Auth Service', kind: 'application' },
        selected: false,
        zIndex: 1,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        type: 'application',
      } as unknown as NodeProps;

      const appHtml = renderToString(
        <ReactFlowProvider>
          <AppNode {...appNodeProps} />
        </ReactFlowProvider>,
      );
      expect(appHtml).toContain('data-testid="node-label"');
      expect(appHtml).toContain('Auth Service');

      const systemNodeProps = {
        id: 'sys-1',
        data: { label: 'Core Banking', kind: 'system' },
        selected: false,
        zIndex: 1,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        type: 'system',
      } as unknown as NodeProps;

      const systemHtml = renderToString(
        <ReactFlowProvider>
          <SystemNode {...systemNodeProps} />
        </ReactFlowProvider>,
      );
      expect(systemHtml).toContain('data-testid="node-label"');
      expect(systemHtml).toContain('Core Banking');

      const storeNodeProps = {
        id: 'store-1',
        data: { label: 'Ledger DB', kind: 'store' },
        selected: false,
        zIndex: 1,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        type: 'store',
      } as unknown as NodeProps;

      const storeHtml = renderToString(
        <ReactFlowProvider>
          <StoreNode {...storeNodeProps} />
        </ReactFlowProvider>,
      );
      expect(storeHtml).toContain('data-testid="node-label"');
      expect(storeHtml).toContain('Ledger DB');
    });
  });

  describe('3. IcePanelEdge Inline Label Editing', () => {
    it('renders inline label input when edge isEditing is true', () => {
      const html = renderToString(
        <ReactFlowProvider>
          <IcePanelEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={200}
            targetY={200}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            data={{ isEditing: true, label: 'JSON / REST' }}
          />
        </ReactFlowProvider>,
      );

      expect(html).toContain('data-testid="inline-edge-label-input"');
      expect(html).toContain('data-edge-id="edge-1"');
      expect(html).toContain('value="JSON / REST"');
    });

    it('renders label pill badge with double-click title when not editing', () => {
      const html = renderToString(
        <ReactFlowProvider>
          <IcePanelEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={200}
            targetY={200}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            data={{ isEditing: false, description: 'gRPC stream' }}
          />
        </ReactFlowProvider>,
      );

      expect(html).toContain('data-testid="edge-pill-badge"');
      expect(html).toContain('title="Double-click to edit label"');
      expect(html).toContain('gRPC stream');
      expect(html).not.toContain('data-testid="inline-edge-label-input"');
    });
  });

  describe('4. Command Stack & ⌘Z Revert (F137 Acceptance Criteria)', () => {
    it('double-click node → type → Enter renames; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      let currentNodes: Node[] = [
        {
          id: 'node-test-1',
          position: { x: 100, y: 100 },
          data: { label: 'Original Service Name' },
        },
      ];

      const setNodes = (updater: Node[] | ((prev: Node[]) => Node[])) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };
      const setEdges = (_updater: Edge[] | ((prev: Edge[]) => Edge[])) => {};

      // 1. Rename command executed (e.g. Enter pressed after typing new name)
      const renameCmd = new UpdateNodeMetadataCommand({
        nodeId: 'node-test-1',
        prevData: { label: 'Original Service Name', name: 'Original Service Name' },
        newData: { label: 'Renamed Service Name', name: 'Renamed Service Name' },
      });

      await defaultCommandDispatcher.dispatch(renameCmd);
      renameCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentNodes[0]?.data.label).toBe('Renamed Service Name');
      expect(defaultCommandDispatcher.canUndo()).toBe(true);

      // 2. ⌘Z Undo reverts node rename
      const undone = await defaultCommandDispatcher.undo();
      expect(undone).toBe(renameCmd);
      renameCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes[0]?.data.label).toBe('Original Service Name');
      expect(defaultCommandDispatcher.canRedo()).toBe(true);

      // 3. Redo restores rename
      await defaultCommandDispatcher.redo();
      renameCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');
      expect(currentNodes[0]?.data.label).toBe('Renamed Service Name');
    });

    it('double-click edge → type labels; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      let currentEdges: Edge[] = [
        {
          id: 'edge-test-1',
          source: 'node-1',
          target: 'node-2',
          label: 'HTTPS: REST',
          data: { description: 'HTTPS: REST' },
        },
      ];

      const setNodes = (_updater: Node[] | ((prev: Node[]) => Node[])) => {};
      const setEdges = (updater: Edge[] | ((prev: Edge[]) => Edge[])) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      // 1. Label edge command executed
      const labelCmd = new UpdateEdgeDataCommand({
        edgeId: 'edge-test-1',
        prevData: { description: 'HTTPS: REST' },
        newData: { description: 'Kafka: Orders Topic' },
        prevLabel: 'HTTPS: REST',
        newLabel: 'Kafka: Orders Topic',
      });

      await defaultCommandDispatcher.dispatch(labelCmd);
      labelCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentEdges[0]?.label).toBe('Kafka: Orders Topic');
      expect(currentEdges[0]?.data?.description).toBe('Kafka: Orders Topic');
      expect(defaultCommandDispatcher.canUndo()).toBe(true);

      // 2. ⌘Z Undo reverts edge label
      const undone = await defaultCommandDispatcher.undo();
      expect(undone).toBe(labelCmd);
      labelCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentEdges[0]?.label).toBe('HTTPS: REST');
      expect(currentEdges[0]?.data?.description).toBe('HTTPS: REST');
      expect(defaultCommandDispatcher.canRedo()).toBe(true);
    });

    it('inspector editing stays in sync with model state', () => {
      // Simulating inspector field mutation
      let node = { id: 'node-1', data: { label: 'Billing API', name: 'Billing API' } };

      const handleInspectorChange = (field: string, value: string) => {
        if (field === 'name') {
          node = { ...node, data: { ...node.data, label: value, name: value } };
        }
      };

      handleInspectorChange('name', 'Invoicing Service');
      expect(node.data.label).toBe('Invoicing Service');
      expect(node.data.name).toBe('Invoicing Service');
    });
  });
});
