import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import {
  projectViewModelToCanvas,
  type CanvasNode,
  type CanvasEdge,
  type CanvasViewport,
} from '@diagramhq/domain';
import { useCanvasStore } from './lib/canvas-store';
import {
  ReactFlowCanvasRenderer,
  nodeTypes,
  SystemNode,
  AppNode,
  StoreNode,
  InfiniteCanvas,
} from './components/canvas';

describe('Web Canvas Implementation (F009 - Infinite Canvas)', () => {
  beforeEach(() => {
    useCanvasStore.getState().clearSelection();
    useCanvasStore.getState().setViewport({ x: 0, y: 0, zoom: 1 });
    useCanvasStore.getState().setHoveredNode(null);
  });

  describe('1. useCanvasStore (Layer Boundaries Rule 4)', () => {
    it('initializes with default viewport and empty transient selection', () => {
      const state = useCanvasStore.getState();
      expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
      expect(state.selectedNodeIds).toEqual([]);
      expect(state.selectedEdgeIds).toEqual([]);
      expect(state.hoveredNodeId).toBeNull();
    });

    it('updates viewport correctly without mutating previous state', () => {
      const newViewport: CanvasViewport = { x: 150, y: -80, zoom: 1.75 };
      useCanvasStore.getState().setViewport(newViewport);

      expect(useCanvasStore.getState().viewport).toEqual(newViewport);
    });

    it('updates selected nodes and edges', () => {
      useCanvasStore.getState().setSelectedNodes(['node-1', 'node-2']);
      useCanvasStore.getState().setSelectedEdges(['edge-1']);

      expect(useCanvasStore.getState().selectedNodeIds).toEqual(['node-1', 'node-2']);
      expect(useCanvasStore.getState().selectedEdgeIds).toEqual(['edge-1']);
    });

    it('clears selection cleanly', () => {
      useCanvasStore.getState().setSelectedNodes(['node-1']);
      useCanvasStore.getState().setSelectedEdges(['edge-1']);
      expect(useCanvasStore.getState().selectedNodeIds.length).toBe(1);

      useCanvasStore.getState().clearSelection();
      expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
      expect(useCanvasStore.getState().selectedEdgeIds).toEqual([]);
    });

    it('updates and clears hovered node', () => {
      useCanvasStore.getState().setHoveredNode('node-hover');
      expect(useCanvasStore.getState().hoveredNodeId).toBe('node-hover');

      useCanvasStore.getState().setHoveredNode(null);
      expect(useCanvasStore.getState().hoveredNodeId).toBeNull();
    });

    it('strictly conforms to Layer Boundaries Rule 4: contains zero domain entities', () => {
      const state = useCanvasStore.getState();
      const keys = Object.keys(state);

      // Verify that no domain entities (objects, connections, views, models, architectures) exist in the store
      const forbiddenDomainKeys = [
        'objects',
        'connections',
        'views',
        'viewObjects',
        'models',
        'architectures',
        'organizations',
        'members',
        'nodes',
        'edges',
      ];

      for (const forbiddenKey of forbiddenDomainKeys) {
        expect(keys).not.toContain(forbiddenKey);
      }

      // Check allowed keys only
      const allowedKeys = new Set([
        'viewport',
        'selectedNodeIds',
        'selectedEdgeIds',
        'hoveredNodeId',
        'isSpacePanning',
        'isBoxSelectMode',
        'isSnapToGridEnabled',
        'setViewport',
        'setSelectedNodes',
        'setSelectedEdges',
        'clearSelection',
        'setHoveredNode',
        'setIsSpacePanning',
        'selectNode',
        'selectEdge',
        'toggleNodeSelection',
        'toggleEdgeSelection',
        'isNodeSelected',
        'isEdgeSelected',
        'toggleBoxSelectMode',
        'setBoxSelectMode',
        'toggleSnapToGrid',
        'setSnapToGrid',
        'zoomIn',
        'zoomOut',
        'resetZoom',
      ]);

      for (const key of keys) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    });
  });

  describe('2. ReactFlowCanvasRenderer (CanvasRenderer<HTMLElement> Contract)', () => {
    it('encapsulates renderer name as "react-flow"', () => {
      const renderer = new ReactFlowCanvasRenderer();
      expect(renderer.name).toBe('react-flow');
    });

    it('implements mount and unmount lifecycle', () => {
      const renderer = new ReactFlowCanvasRenderer();
      expect(renderer.isMounted()).toBe(false);
      expect(renderer.getContainer()).toBeNull();

      const mockContainer = { tagName: 'DIV' } as unknown as HTMLElement;
      renderer.mount(mockContainer);
      expect(renderer.isMounted()).toBe(true);
      expect(renderer.getContainer()).toBe(mockContainer);

      renderer.unmount();
      expect(renderer.isMounted()).toBe(false);
      expect(renderer.getContainer()).toBeNull();
    });

    it('renders nodes and edges and notifies listeners', () => {
      const renderer = new ReactFlowCanvasRenderer();
      const sampleNodes: CanvasNode[] = [
        {
          id: 'n1',
          type: 'system',
          position: { x: 10, y: 20 },
          data: { label: 'System 1' },
        },
      ];
      const sampleEdges: CanvasEdge[] = [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'default',
        },
      ];

      const renderSpy = vi.fn();
      const unsubscribe = renderer.onRender(renderSpy);

      renderer.render(sampleNodes, sampleEdges);

      expect(renderer.getNodes()).toEqual(sampleNodes);
      expect(renderer.getEdges()).toEqual(sampleEdges);
      expect(renderSpy).toHaveBeenCalledWith(sampleNodes, sampleEdges);

      unsubscribe();
      renderer.render([], []);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('manages viewport and triggers interactionHandler callback', () => {
      const renderer = new ReactFlowCanvasRenderer();
      const onViewportChangeSpy = vi.fn();
      renderer.setInteractionHandler({
        onViewportChange: onViewportChangeSpy,
      });

      const newViewport: CanvasViewport = { x: 200, y: 150, zoom: 1.25 };
      renderer.setViewport(newViewport);

      expect(renderer.getViewport()).toEqual(newViewport);
      expect(onViewportChangeSpy).toHaveBeenCalledWith(newViewport);
    });

    it('delegates fitView to attached React Flow instance bridge', () => {
      const renderer = new ReactFlowCanvasRenderer();
      const fitViewSpy = vi.fn();
      renderer.attachBridge({
        fitView: fitViewSpy,
      });

      renderer.fitView();
      expect(fitViewSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Model Projection (projectViewModelToCanvas)', () => {
    it('projects domain objects and connections into canvas nodes and edges', () => {
      const objects = [
        {
          id: 'sys-1',
          name: 'Payment System',
          kind: 'system',
          description: 'Payment processing boundary',
        },
        {
          id: 'app-1',
          name: 'Auth Service',
          kind: 'application',
          description: 'Authentication provider',
        },
        {
          id: 'store-1',
          name: 'Users DB',
          kind: 'store',
          description: 'Postgres DB',
        },
      ];

      const connections = [
        {
          id: 'c1',
          sourceId: 'app-1',
          targetId: 'sys-1',
          kind: 'sync',
        },
        {
          id: 'c2',
          sourceId: 'app-1',
          targetId: 'store-1',
          kind: 'async',
        },
      ];

      const viewObjects = [
        { objectId: 'sys-1', x: 50, y: 80 },
        { objectId: 'app-1', x: 300, y: 80 },
      ];

      const result = projectViewModelToCanvas({
        objects,
        connections,
        viewObjects,
      });

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // sys-1 has explicit position
      const sysNode = result.nodes.find((n) => n.id === 'sys-1');
      expect(sysNode).toBeDefined();
      expect(sysNode?.type).toBe('system');
      expect(sysNode?.position).toEqual({ x: 50, y: 80 });
      expect(sysNode?.data.label).toBe('Payment System');
      expect(sysNode?.data.description).toBe('Payment processing boundary');

      // app-1 has explicit position
      const appNode = result.nodes.find((n) => n.id === 'app-1');
      expect(appNode).toBeDefined();
      expect(appNode?.type).toBe('application');
      expect(appNode?.position).toEqual({ x: 300, y: 80 });

      // store-1 lacks explicit position, gets grid fallback
      const storeNode = result.nodes.find((n) => n.id === 'store-1');
      expect(storeNode).toBeDefined();
      expect(storeNode?.type).toBe('store');
      expect(storeNode?.position.x).toBe(0);
      expect(storeNode?.position.y).toBe(0);

      // Edge mappings
      const c1Edge = result.edges.find((e) => e.id === 'c1');
      expect(c1Edge?.source).toBe('app-1');
      expect(c1Edge?.target).toBe('sys-1');
      expect(c1Edge?.label).toBe('sync');
      expect(c1Edge?.animated).toBe(false);

      const c2Edge = result.edges.find((e) => e.id === 'c2');
      expect(c2Edge?.animated).toBe(true); // async connections are animated
    });
  });

  describe('4. Custom Architecture Nodes', () => {
    it('registers system, application, store, and default in nodeTypes', () => {
      expect(nodeTypes.system).toBe(SystemNode);
      expect(nodeTypes.application).toBe(AppNode);
      expect(nodeTypes.store).toBe(StoreNode);
      expect(nodeTypes.default).toBe(SystemNode);
    });

    it('renders SystemNode with system icon, label, and description', () => {
      const html = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(SystemNode, {
            id: 'sys-node-1',
            data: {
              label: 'Core Banking System',
              description: 'Handles ledger transactions',
            },
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

      expect(html).toContain('Core Banking System');
      expect(html).toContain('Handles ledger transactions');
      expect(html).toContain('System Boundary');
      expect(html).toContain('data-testid="system-node"');
    });

    it('renders AppNode with app icon, label, and status', () => {
      const html = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(AppNode, {
            id: 'app-node-1',
            data: {
              label: 'Payment Service',
              status: 'Healthy',
              description: 'Microservice for payment intents',
            },
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

      expect(html).toContain('Payment Service');
      expect(html).toContain('Healthy');
      expect(html).toContain('App Service');
      expect(html).toContain('data-testid="app-node"');
    });

    it('renders StoreNode with cylinder icon, label, and kind', () => {
      const html = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(StoreNode, {
            id: 'store-node-1',
            data: {
              label: 'Primary Postgres DB',
              kind: 'PostgreSQL',
              description: 'Relational data cluster',
            },
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

      expect(html).toContain('Primary Postgres DB');
      expect(html).toContain('PostgreSQL');
      expect(html).toContain('Data Store');
      expect(html).toContain('data-testid="store-node"');
    });
  });

  describe('5. InfiniteCanvas Component', () => {
    it('mounts and renders container, status badge, and components', () => {
      const sampleNodes: CanvasNode[] = [
        {
          id: 'sys-node',
          type: 'system',
          position: { x: 50, y: 50 },
          data: { label: 'Test System', description: 'Testing node rendering' },
        },
        {
          id: 'app-node',
          type: 'application',
          position: { x: 250, y: 50 },
          data: { label: 'Test App', status: 'Active' },
        },
      ];
      const sampleEdges: CanvasEdge[] = [
        {
          id: 'edge-1',
          source: 'sys-node',
          target: 'app-node',
          type: 'default',
          label: 'calls',
        },
      ];

      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
        })
      );

      expect(html).toContain('data-testid="infinite-canvas-container"');
      expect(html).toContain('data-testid="canvas-status-badge"');
      expect(html).toContain('Infinite Canvas — React Flow Renderer (ADR-0002)');
      expect(html).toContain('react-flow');
    });
  });
});
