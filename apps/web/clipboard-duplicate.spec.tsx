import { describe, it, expect, beforeEach } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';
import {
  setCanvasClipboard,
  getCanvasClipboard,
  clearCanvasClipboard,
} from './lib/canvas-clipboard';
import {
  DuplicateSelectionCommand,
  PasteSelectionCommand,
  defaultCommandDispatcher,
} from './lib/commands';
import { useCanvasStore } from './lib/canvas-store';

describe('F139 — Clipboard, duplicate & default marquee-select', () => {
  beforeEach(() => {
    clearCanvasClipboard();
    defaultCommandDispatcher.clearHistory();
    useCanvasStore.setState({
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isBoxSelectMode: true,
      isSpacePanning: false,
    });
  });

  describe('1. In-app Canvas Clipboard (canvas-clipboard.ts)', () => {
    it('round-trips nodes and internal edges in memory', () => {
      const sampleNodes: Node[] = [
        {
          id: 'node-svc-1',
          type: 'application',
          position: { x: 100, y: 150 },
          data: { label: 'Auth Service', kind: 'application' },
        },
        {
          id: 'node-db-1',
          type: 'database',
          position: { x: 400, y: 150 },
          data: { label: 'Auth Database', kind: 'database' },
        },
      ];

      const sampleEdges: Edge[] = [
        {
          id: 'edge-1',
          source: 'node-svc-1',
          target: 'node-db-1',
          type: 'icepanel',
          label: 'reads/writes',
          data: { protocol: 'postgres' },
        },
      ];

      setCanvasClipboard({ nodes: sampleNodes, edges: sampleEdges });

      const clipboard = getCanvasClipboard();
      expect(clipboard).not.toBeNull();
      expect(clipboard?.nodes).toHaveLength(2);
      expect(clipboard?.edges).toHaveLength(1);
      expect(clipboard?.nodes[0]?.data.label).toBe('Auth Service');
      expect(clipboard?.nodes[1]?.data.label).toBe('Auth Database');
      expect(clipboard?.edges[0]?.label).toBe('reads/writes');
      expect(clipboard?.edges[0]?.data?.protocol).toBe('postgres');
    });

    it('clearCanvasClipboard resets the in-app clipboard', () => {
      setCanvasClipboard({
        nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node' } }],
        edges: [],
      });
      expect(getCanvasClipboard()).not.toBeNull();
      clearCanvasClipboard();
      expect(getCanvasClipboard()).toBeNull();
    });
  });

  describe('2. ⌘D Duplication & ⌘Z Reversion', () => {
    it('⌘D duplicates a selected node with offset and regenerated id; ⌘Z reverts', async () => {
      let currentNodes: Node[] = [
        {
          id: 'obj-service-1',
          type: 'application',
          position: { x: 100, y: 100 },
          data: { label: 'Payment Gateway', kind: 'application' },
        },
      ];
      let currentEdges: Edge[] = [];

      const setNodes = (fn: Node[] | ((curr: Node[]) => Node[])) => {
        currentNodes = typeof fn === 'function' ? fn(currentNodes) : fn;
      };
      const setEdges = (fn: Edge[] | ((curr: Edge[]) => Edge[])) => {
        currentEdges = typeof fn === 'function' ? fn(currentEdges) : fn;
      };

      // Create duplicated node
      const originalNode = currentNodes[0]!;
      const duplicatedNodeId = 'application-copy-123';
      const duplicateCanvasNode: CanvasNode = {
        id: duplicatedNodeId,
        type: originalNode.type ?? 'application',
        position: { x: originalNode.position.x + 30, y: originalNode.position.y + 30 },
        data: {
          ...originalNode.data,
          label: `${String(originalNode.data.label)} (Copy)`,
        },
      };

      const cmd = new DuplicateSelectionCommand({
        viewId: 'view-1',
        nodes: [duplicateCanvasNode],
      });

      await defaultCommandDispatcher.dispatch(cmd);
      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      // Duplicate exists
      expect(currentNodes).toHaveLength(2);
      expect(currentNodes[1]?.id).toBe(duplicatedNodeId);
      expect(currentNodes[1]?.data.label).toBe('Payment Gateway (Copy)');
      expect(currentNodes[1]?.position).toEqual({ x: 130, y: 130 });

      // ⌘Z Undo
      const undone = await defaultCommandDispatcher.undo();
      expect(undone).toBe(cmd);
      cmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]?.id).toBe('obj-service-1');

      // Redo restores
      await defaultCommandDispatcher.redo();
      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');
      expect(currentNodes).toHaveLength(2);
      expect(currentNodes[1]?.id).toBe(duplicatedNodeId);
    });
  });

  describe('3. ⌘C / ⌘V Round-trip with 2 nodes + 1 internal edge', () => {
    it('⌘C/⌘V round-trips a 2-node + 1-edge selection; preserves relative layout; ⌘Z reverts', async () => {
      let currentNodes: Node[] = [
        {
          id: 'node-api',
          type: 'application',
          position: { x: 50, y: 50 },
          data: { label: 'API Server', kind: 'application', env: 'production' },
        },
        {
          id: 'node-queue',
          type: 'queue',
          position: { x: 250, y: 150 },
          data: { label: 'Job Queue', kind: 'queue', messageType: 'events' },
        },
        {
          id: 'node-external',
          type: 'system',
          position: { x: 600, y: 500 },
          data: { label: 'External Partner', kind: 'system' },
        },
      ];

      let currentEdges: Edge[] = [
        {
          id: 'edge-internal',
          source: 'node-api',
          target: 'node-queue',
          type: 'icepanel',
          label: 'pushes jobs',
          data: { direction: 'forward' },
        },
        {
          id: 'edge-external',
          source: 'node-api',
          target: 'node-external',
          type: 'icepanel',
          label: 'calls webhooks',
        },
      ];

      const setNodes = (fn: Node[] | ((curr: Node[]) => Node[])) => {
        currentNodes = typeof fn === 'function' ? fn(currentNodes) : fn;
      };
      const setEdges = (fn: Edge[] | ((curr: Edge[]) => Edge[])) => {
        currentEdges = typeof fn === 'function' ? fn(currentEdges) : fn;
      };

      // User selects node-api and node-queue
      const selectedIds = ['node-api', 'node-queue'];
      useCanvasStore.getState().setSelectedNodes(selectedIds);

      // ⌘C Copy: captures selected nodes and ONLY internal edges
      const selectedNodes = currentNodes.filter((n) => selectedIds.includes(n.id));
      const selectedIdSet = new Set(selectedIds);
      const internalEdges = currentEdges.filter(
        (e) => selectedIdSet.has(e.source) && selectedIdSet.has(e.target),
      );

      expect(selectedNodes).toHaveLength(2);
      expect(internalEdges).toHaveLength(1);
      expect(internalEdges[0]?.id).toBe('edge-internal');

      setCanvasClipboard({
        nodes: selectedNodes,
        edges: internalEdges,
      });

      // ⌘V Paste: generates new IDs and pastes at cursor (e.g. x: 300, y: 300)
      const clipboard = getCanvasClipboard()!;
      expect(clipboard).not.toBeNull();

      const minX = Math.min(...clipboard.nodes.map((n) => n.position.x)); // 50
      const minY = Math.min(...clipboard.nodes.map((n) => n.position.y)); // 50
      const targetCursor = { x: 400, y: 200 };
      const dx = targetCursor.x - minX; // 350
      const dy = targetCursor.y - minY; // 150

      const idMap = new Map<string, string>();
      const pastedCanvasNodes: CanvasNode[] = clipboard.nodes.map((node) => {
        const newId = `${node.id}-pasted-clone`;
        idMap.set(node.id, newId);
        return {
          id: newId,
          type: node.type ?? 'application',
          position: {
            x: node.position.x + dx,
            y: node.position.y + dy,
          },
          data: {
            ...node.data,
            label: `${String(node.data.label)} (Paste)`,
          },
        };
      });

      const pastedCanvasEdges: CanvasEdge[] = clipboard.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({
          id: `${e.id}-pasted-clone`,
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          type: e.type ?? 'icepanel',
          label: typeof e.label === 'string' ? e.label : undefined,
          data: e.data as Record<string, unknown>,
        }));

      const pasteCmd = new PasteSelectionCommand({
        viewId: 'view-1',
        nodes: pastedCanvasNodes,
        edges: pastedCanvasEdges,
      });

      await defaultCommandDispatcher.dispatch(pasteCmd);
      pasteCmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      // Verify 2 new nodes added + 1 new internal edge added
      expect(currentNodes).toHaveLength(5); // 3 original + 2 pasted
      expect(currentEdges).toHaveLength(3); // 2 original + 1 pasted

      const pastedApi = currentNodes.find((n) => n.id === 'node-api-pasted-clone');
      const pastedQueue = currentNodes.find((n) => n.id === 'node-queue-pasted-clone');
      const pastedEdge = currentEdges.find((e) => e.id === 'edge-internal-pasted-clone');

      expect(pastedApi).toBeDefined();
      expect(pastedQueue).toBeDefined();
      expect(pastedEdge).toBeDefined();

      // Relative layout preserved:
      // Original dx = 250 - 50 = 200, dy = 150 - 50 = 100
      // Pasted dx = pastedQueue.x - pastedApi.x, dy = pastedQueue.y - pastedApi.y
      expect(pastedQueue!.position.x - pastedApi!.position.x).toBe(200);
      expect(pastedQueue!.position.y - pastedApi!.position.y).toBe(100);

      // Metadata and labels preserved
      expect(pastedApi!.data.label).toBe('API Server (Paste)');
      expect(pastedApi!.data.env).toBe('production');
      expect(pastedQueue!.data.messageType).toBe('events');

      // Remapped edge endpoints correctly point to new node IDs
      expect(pastedEdge!.source).toBe('node-api-pasted-clone');
      expect(pastedEdge!.target).toBe('node-queue-pasted-clone');
      expect(pastedEdge!.label).toBe('pushes jobs');
      expect(pastedEdge!.data?.direction).toBe('forward');

      // ⌘Z Reverts both nodes and edge
      const undone = await defaultCommandDispatcher.undo();
      expect(undone).toBe(pasteCmd);
      pasteCmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(3);
      expect(currentEdges).toHaveLength(2);
      expect(currentNodes.some((n) => n.id === 'node-api-pasted-clone')).toBe(false);
      expect(currentEdges.some((e) => e.id === 'edge-internal-pasted-clone')).toBe(false);
    });
  });

  describe('4. Alt-drag Duplicate Simulation', () => {
    it('Alt-drag duplicates node: leaves original at startPos, creates clone at dropPos; ⌘Z reverts', async () => {
      let currentNodes: Node[] = [
        {
          id: 'node-worker',
          type: 'component',
          position: { x: 100, y: 100 },
          data: { label: 'Background Worker', kind: 'component' },
        },
      ];
      let currentEdges: Edge[] = [];

      const setNodes = (fn: Node[] | ((curr: Node[]) => Node[])) => {
        currentNodes = typeof fn === 'function' ? fn(currentNodes) : fn;
      };
      const setEdges = (fn: Edge[] | ((curr: Edge[]) => Edge[])) => {
        currentEdges = typeof fn === 'function' ? fn(currentEdges) : fn;
      };

      const startPos = { x: 100, y: 100 };
      const dropPos = { x: 350, y: 220 };

      // Alt-drag drop:
      // Original restored to startPos, duplicate created at dropPos
      const originalNode = currentNodes[0]!;
      const duplicateId = 'node-worker-alt-copy';
      const duplicateNode: CanvasNode = {
        id: duplicateId,
        type: originalNode.type ?? 'component',
        position: dropPos,
        data: {
          ...originalNode.data,
          label: `${String(originalNode.data.label)} (Copy)`,
        },
      };

      const cmd = new DuplicateSelectionCommand({
        viewId: 'view-1',
        nodes: [duplicateNode],
      });

      await defaultCommandDispatcher.dispatch(cmd);
      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');

      expect(currentNodes).toHaveLength(2);
      expect(currentNodes[0]?.position).toEqual(startPos);
      expect(currentNodes[1]?.id).toBe(duplicateId);
      expect(currentNodes[1]?.position).toEqual(dropPos);

      // ⌘Z reverts Alt-drag
      await defaultCommandDispatcher.undo();
      cmd.applyCanvasUpdate(setNodes, setEdges, 'undo');

      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]?.id).toBe('node-worker');
      expect(currentNodes[0]?.position).toEqual(startPos);
    });
  });

  describe('5. Default Marquee Selection & Space Panning', () => {
    it('isBoxSelectMode is true by default enabling empty-drag marquee select', () => {
      expect(useCanvasStore.getState().isBoxSelectMode).toBe(true);
    });

    it('Space key triggers isSpacePanning and toggles panning', () => {
      expect(useCanvasStore.getState().isSpacePanning).toBe(false);
      useCanvasStore.getState().setIsSpacePanning(true);
      expect(useCanvasStore.getState().isSpacePanning).toBe(true);
      useCanvasStore.getState().setIsSpacePanning(false);
      expect(useCanvasStore.getState().isSpacePanning).toBe(false);
    });
  });
});
