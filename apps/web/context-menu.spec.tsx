import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CanvasContextMenu } from './components/canvas/context-menu';
import {
  CreateNodeCommand,
  DeleteNodeCommand,
  DeleteEdgeCommand,
  ReverseEdgeCommand,
  defaultCommandDispatcher,
} from './lib/commands';
import type { Node, Edge } from '@xyflow/react';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

type NodeUpdater = Node[] | ((prev: Node[]) => Node[]);
type EdgeUpdater = Edge[] | ((prev: Edge[]) => Edge[]);

describe('F138 — Canvas Context Menus', () => {
  describe('1. CanvasContextMenu UI Rendering', () => {
    it('renders node context menu with Rename, Duplicate, Add connection, Add to view, Drill in, and Delete', () => {
      const mockNode: Node = {
        id: 'node-auth-1',
        type: 'application',
        position: { x: 100, y: 150 },
        data: { label: 'Auth Gateway' },
      };

      const html = renderToString(
        <CanvasContextMenu
          menu={{
            type: 'node',
            x: 200,
            y: 250,
            node: mockNode,
          }}
          onClose={() => {}}
        />,
      );

      expect(html).toContain('data-testid="canvas-context-menu"');
      expect(html).toContain('data-testid="context-menu-node"');
      expect(html).toContain('Auth Gateway');
      expect(html).toContain('data-testid="context-menu-item-rename"');
      expect(html).toContain('data-testid="context-menu-item-duplicate"');
      expect(html).toContain('data-testid="context-menu-item-add-connection"');
      expect(html).toContain('data-testid="context-menu-item-add-to-view"');
      expect(html).toContain('data-testid="context-menu-item-drill-in"');
      expect(html).toContain('data-testid="context-menu-item-delete"');
    });

    it('renders edge context menu with Edit label, Reverse, and Delete', () => {
      const mockEdge: Edge = {
        id: 'edge-auth-db',
        source: 'node-auth-1',
        target: 'node-db-1',
        label: 'gRPC stream',
      };

      const html = renderToString(
        <CanvasContextMenu
          menu={{
            type: 'edge',
            x: 350,
            y: 300,
            edge: mockEdge,
          }}
          onClose={() => {}}
        />,
      );

      expect(html).toContain('data-testid="canvas-context-menu"');
      expect(html).toContain('data-testid="context-menu-edge"');
      expect(html).toContain('gRPC stream');
      expect(html).toContain('data-testid="context-menu-item-edit-label"');
      expect(html).toContain('data-testid="context-menu-item-reverse"');
      expect(html).toContain('data-testid="context-menu-item-delete-edge"');
    });

    it('renders pane context menu with Add object, Paste, Select all, Fit view, and Auto-layout', () => {
      const html = renderToString(
        <CanvasContextMenu
          menu={{
            type: 'pane',
            x: 500,
            y: 400,
            flowX: 300,
            flowY: 220,
          }}
          onClose={() => {}}
          canPaste={true}
        />,
      );

      expect(html).toContain('data-testid="canvas-context-menu"');
      expect(html).toContain('data-testid="context-menu-pane"');
      expect(html).toContain('data-testid="context-menu-item-add-object"');
      expect(html).toContain('data-testid="context-menu-item-paste"');
      expect(html).toContain('data-testid="context-menu-item-select-all"');
      expect(html).toContain('data-testid="context-menu-item-fit-view"');
      expect(html).toContain('data-testid="context-menu-item-auto-layout"');
    });
  });

  describe('2. Context Menu Actions & Command Dispatches (F138 Acceptance Criteria)', () => {
    it('right-click node → Duplicate adds a copy; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      const originalNode: CanvasNode = {
        id: 'node-service-1',
        type: 'application',
        position: { x: 100, y: 100 },
        data: { label: 'Order Processing', kind: 'application' },
      };

      let currentNodes: Node[] = [
        {
          id: originalNode.id,
          type: originalNode.type,
          position: { ...originalNode.position },
          data: { ...originalNode.data },
        },
      ];

      const setNodes = (updater: NodeUpdater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };
      const setEdges = (_updater: EdgeUpdater) => {};

      // Duplicate action creates a copy at offset
      const duplicateId = 'node-service-1-copy';
      const duplicateNode: CanvasNode = {
        id: duplicateId,
        type: originalNode.type,
        position: { x: originalNode.position.x + 40, y: originalNode.position.y + 40 },
        data: {
          ...originalNode.data,
          label: `${String(originalNode.data.label)} (Copy)`,
        },
      };

      const duplicateCmd = new CreateNodeCommand({
        viewId: 'view-1',
        node: duplicateNode,
      });

      await defaultCommandDispatcher.dispatch(duplicateCmd);
      duplicateCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentNodes).toHaveLength(2);
      expect(currentNodes[1]?.id).toBe(duplicateId);
      expect(currentNodes[1]?.data.label).toBe('Order Processing (Copy)');
      expect(currentNodes[1]?.position).toEqual({ x: 140, y: 140 });

      // ⌘Z Revert
      const undone = await defaultCommandDispatcher.undo();
      expect(undone).toBe(duplicateCmd);
      duplicateCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]?.id).toBe('node-service-1');
    });

    it('right-click node → Delete removes it; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      const nodeToDelete: CanvasNode = {
        id: 'node-cache-1',
        type: 'database',
        position: { x: 200, y: 200 },
        data: { label: 'Redis Cache' },
      };

      const edgeConnected: CanvasEdge = {
        id: 'edge-to-cache',
        source: 'node-app-1',
        target: 'node-cache-1',
        type: 'icepanel',
      };

      let currentNodes: Node[] = [
        {
          id: nodeToDelete.id,
          type: nodeToDelete.type,
          position: { ...nodeToDelete.position },
          data: { ...nodeToDelete.data },
        },
      ];

      let currentEdges: Edge[] = [
        {
          id: edgeConnected.id,
          source: edgeConnected.source,
          target: edgeConnected.target,
        },
      ];

      const setNodes = (updater: NodeUpdater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };
      const setEdges = (updater: EdgeUpdater) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      const deleteCmd = new DeleteNodeCommand({
        viewId: 'view-1',
        node: nodeToDelete,
        connectedEdges: [edgeConnected],
      });

      await defaultCommandDispatcher.dispatch(deleteCmd);
      setNodes((nds) => nds.filter((n) => n.id !== nodeToDelete.id));
      setEdges((eds) => eds.filter((e) => e.target !== nodeToDelete.id));

      expect(currentNodes).toHaveLength(0);
      expect(currentEdges).toHaveLength(0);

      // ⌘Z Revert
      await defaultCommandDispatcher.undo();
      deleteCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]?.id).toBe('node-cache-1');
      expect(currentEdges).toHaveLength(1);
      expect(currentEdges[0]?.id).toBe('edge-to-cache');
    });

    it('right-click pane → Add object creates one at cursor; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      let currentNodes: Node[] = [];
      const setNodes = (updater: NodeUpdater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };
      const setEdges = (_updater: EdgeUpdater) => {};

      const cursorPosition = { x: 420, y: 310 };
      const newNode: CanvasNode = {
        id: 'queue-new-1',
        type: 'queue',
        position: cursorPosition,
        data: { label: 'New Message Queue', kind: 'queue' },
      };

      const createCmd = new CreateNodeCommand({
        viewId: 'view-1',
        node: newNode,
      });

      await defaultCommandDispatcher.dispatch(createCmd);
      createCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]?.id).toBe('queue-new-1');
      expect(currentNodes[0]?.position).toEqual({ x: 420, y: 310 });
      expect(currentNodes[0]?.data.label).toBe('New Message Queue');

      // ⌘Z Revert
      await defaultCommandDispatcher.undo();
      createCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(0);
    });

    it('right-click edge → Reverse reverses direction; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      let currentEdges: Edge[] = [
        {
          id: 'edge-reverse-test',
          source: 'node-A',
          target: 'node-B',
        },
      ];

      const setNodes = (_updater: NodeUpdater) => {};
      const setEdges = (updater: EdgeUpdater) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      const reverseCmd = new ReverseEdgeCommand({
        edgeId: 'edge-reverse-test',
        prevSource: 'node-A',
        newSource: 'node-B',
        prevTarget: 'node-B',
        newTarget: 'node-A',
      });

      await defaultCommandDispatcher.dispatch(reverseCmd);
      reverseCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentEdges[0]?.source).toBe('node-B');
      expect(currentEdges[0]?.target).toBe('node-A');

      // ⌘Z Revert
      await defaultCommandDispatcher.undo();
      reverseCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentEdges[0]?.source).toBe('node-A');
      expect(currentEdges[0]?.target).toBe('node-B');
    });

    it('right-click edge → Delete removes connection; ⌘Z reverts', async () => {
      defaultCommandDispatcher.clearHistory();

      const edgeToDelete: Edge = {
        id: 'edge-delete-test',
        source: 'node-X',
        target: 'node-Y',
      };

      let currentEdges: Edge[] = [edgeToDelete];
      const setNodes = (_updater: NodeUpdater) => {};
      const setEdges = (updater: EdgeUpdater) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      const deleteEdgeCmd = new DeleteEdgeCommand({ edge: edgeToDelete });
      await defaultCommandDispatcher.dispatch(deleteEdgeCmd);
      deleteEdgeCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentEdges).toHaveLength(0);

      // ⌘Z Revert
      await defaultCommandDispatcher.undo();
      deleteEdgeCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentEdges).toHaveLength(1);
      expect(currentEdges[0]?.id).toBe('edge-delete-test');
    });
  });
});
