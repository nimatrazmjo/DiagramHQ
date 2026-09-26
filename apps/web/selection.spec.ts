import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import { useCanvasStore } from './lib/canvas-store';
import {
  InfiniteCanvas,
  SystemNode,
  AppNode,
  StoreNode,
} from './components/canvas';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

describe('F011 — Object Selection', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      selectedEdgeIds: [],
      hoveredNodeId: null,
      isSpacePanning: false,
    });
    vi.clearAllMocks();
  });

  describe('1. Canvas Store Selection State (Layer Boundaries Rule 4)', () => {
    it('selectNode selects a single node and clears prior edge selection', () => {
      useCanvasStore.getState().setSelectedEdges(['edge-1']);
      useCanvasStore.getState().selectNode('node-1');

      expect(useCanvasStore.getState().selectedNodeIds).toEqual(['node-1']);
      expect(useCanvasStore.getState().selectedEdgeIds).toEqual([]);
      expect(useCanvasStore.getState().isNodeSelected('node-1')).toBe(true);
      expect(useCanvasStore.getState().isNodeSelected('node-2')).toBe(false);
    });

    it('selectNode with multi=true toggles node selection', () => {
      useCanvasStore.getState().selectNode('node-1', true);
      useCanvasStore.getState().selectNode('node-2', true);

      expect(useCanvasStore.getState().selectedNodeIds).toEqual(['node-1', 'node-2']);

      // Toggle off node-1
      useCanvasStore.getState().selectNode('node-1', true);
      expect(useCanvasStore.getState().selectedNodeIds).toEqual(['node-2']);
    });

    it('selectEdge selects a single edge and clears prior node selection', () => {
      useCanvasStore.getState().selectNode('node-1');
      useCanvasStore.getState().selectEdge('edge-1');

      expect(useCanvasStore.getState().selectedEdgeIds).toEqual(['edge-1']);
      expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
      expect(useCanvasStore.getState().isEdgeSelected('edge-1')).toBe(true);
      expect(useCanvasStore.getState().isEdgeSelected('edge-2')).toBe(false);
    });

    it('selectEdge with multi=true toggles edge selection', () => {
      useCanvasStore.getState().selectEdge('edge-1', true);
      useCanvasStore.getState().selectEdge('edge-2', true);

      expect(useCanvasStore.getState().selectedEdgeIds).toEqual(['edge-1', 'edge-2']);

      // Toggle off edge-1
      useCanvasStore.getState().selectEdge('edge-1', true);
      expect(useCanvasStore.getState().selectedEdgeIds).toEqual(['edge-2']);
    });

    it('clearSelection resets all selected nodes and edges', () => {
      useCanvasStore.getState().setSelectedNodes(['node-1', 'node-2']);
      useCanvasStore.getState().setSelectedEdges(['edge-1']);

      useCanvasStore.getState().clearSelection();

      expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
      expect(useCanvasStore.getState().selectedEdgeIds).toEqual([]);
      expect(useCanvasStore.getState().isNodeSelected('node-1')).toBe(false);
      expect(useCanvasStore.getState().isEdgeSelected('edge-1')).toBe(false);
    });
  });

  describe('2. Custom Nodes Active Selection Styling', () => {
    it('SystemNode renders highlighted active ring when selected', () => {
      const selectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(SystemNode, {
            id: 'sys-1',
            data: { label: 'Selected System' },
            selected: true,
            type: 'system',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof SystemNode>[0])
        )
      );

      expect(selectedHtml).toContain('ring-2 ring-blue-500');

      const unselectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(SystemNode, {
            id: 'sys-1',
            data: { label: 'Unselected System' },
            selected: false,
            type: 'system',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof SystemNode>[0])
        )
      );

      expect(unselectedHtml).not.toContain('ring-2 ring-blue-500');
    });

    it('AppNode renders highlighted active ring when selected', () => {
      const selectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(AppNode, {
            id: 'app-1',
            data: { label: 'Selected App' },
            selected: true,
            type: 'application',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof AppNode>[0])
        )
      );

      expect(selectedHtml).toContain('ring-2 ring-emerald-500');

      const unselectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(AppNode, {
            id: 'app-1',
            data: { label: 'Unselected App' },
            selected: false,
            type: 'application',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof AppNode>[0])
        )
      );

      expect(unselectedHtml).not.toContain('ring-2 ring-emerald-500');
    });

    it('StoreNode renders highlighted active ring when selected', () => {
      const selectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(StoreNode, {
            id: 'store-1',
            data: { label: 'Selected Store' },
            selected: true,
            type: 'store',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof StoreNode>[0])
        )
      );

      expect(selectedHtml).toContain('ring-2 ring-purple-500');

      const unselectedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(StoreNode, {
            id: 'store-1',
            data: { label: 'Unselected Store' },
            selected: false,
            type: 'store',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
          } as unknown as Parameters<typeof StoreNode>[0])
        )
      );

      expect(unselectedHtml).not.toContain('ring-2 ring-purple-500');
    });
  });

  describe('3. InfiniteCanvas Selection UI Rendering', () => {
    const sampleNodes: CanvasNode[] = [
      {
        id: 'node-sys',
        type: 'system',
        position: { x: 50, y: 50 },
        data: { label: 'Auth System' },
      },
    ];
    const sampleEdges: CanvasEdge[] = [];

    it('renders selection count badge and clear button when nodes are selected', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
          selectedNodeIds: ['node-sys'],
        })
      );

      expect(html).toContain('data-testid="selection-badge"');
      expect(html).toContain('SELECTED (ESC TO CLEAR)');
      expect(html).toContain('data-testid="clear-selection-btn"');
      expect(html).toContain('Clear');
    });

    it('hides selection badge and clear button when nothing is selected', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
          selectedNodeIds: [],
        })
      );

      expect(html).not.toContain('data-testid="selection-badge"');
      expect(html).not.toContain('data-testid="clear-selection-btn"');
    });
  });
});
