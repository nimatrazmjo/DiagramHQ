import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GRID_COL_WIDTH,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROW_HEIGHT,
  mapKindToNodeType,
  projectViewModelToCanvas,
  type CanvasEdge,
  type CanvasInteractionHandler,
  type CanvasNode,
  type CanvasRenderer,
  type CanvasViewport,
  type ProjectViewModelConnection,
  type ProjectViewModelObject,
  type ProjectViewModelViewObject,
} from './canvas';

describe('Canvas Domain Model', () => {
  describe('mapKindToNodeType', () => {
    it('maps known architectural kinds to their respective node types', () => {
      expect(mapKindToNodeType('system')).toBe('system');
      expect(mapKindToNodeType('application')).toBe('application');
      expect(mapKindToNodeType('store')).toBe('store');
      expect(mapKindToNodeType('component')).toBe('component');
      expect(mapKindToNodeType('actor')).toBe('actor');
      expect(mapKindToNodeType('group')).toBe('group');
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(mapKindToNodeType('  APPLICATION  ')).toBe('application');
      expect(mapKindToNodeType('Store')).toBe('store');
    });

    it('defaults unknown kinds or missing values to "system"', () => {
      expect(mapKindToNodeType('unknown_kind')).toBe('system');
      expect(mapKindToNodeType('')).toBe('system');
      expect(mapKindToNodeType(null)).toBe('system');
      expect(mapKindToNodeType(undefined)).toBe('system');
    });
  });

  describe('projectViewModelToCanvas', () => {
    const mockObjects: ProjectViewModelObject[] = [
      {
        id: 'sys-1',
        name: 'Order System',
        kind: 'system',
        description: 'Core order processing',
        parentId: null,
      },
      {
        id: 'app-1',
        name: 'Order Service',
        kind: 'application',
        description: 'REST API service',
        parentId: 'sys-1',
      },
      {
        id: 'sto-1',
        name: 'Order DB',
        kind: 'store',
        description: null,
      },
    ];

    const mockConnections: ProjectViewModelConnection[] = [
      {
        id: 'conn-1',
        sourceId: 'app-1',
        targetId: 'sto-1',
        kind: 'sync',
        description: 'SQL queries over TLS',
      },
      {
        id: 'conn-2',
        sourceId: 'sys-1',
        targetId: 'app-1',
        kind: 'async',
      },
    ];

    it('projects domain objects and connections into canvas nodes and edges', () => {
      const result = projectViewModelToCanvas({
        objects: mockObjects,
        connections: mockConnections,
      });

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // Verify node projections
      const [node1, node2, node3] = result.nodes;

      expect(node1).toEqual({
        id: 'sys-1',
        type: 'system',
        position: { x: 0, y: 0 },
        data: {
          label: 'Order System',
          kind: 'system',
          description: 'Core order processing',
        },
      });

      expect(node2).toEqual({
        id: 'app-1',
        type: 'application',
        position: { x: DEFAULT_GRID_COL_WIDTH, y: 0 },
        data: {
          label: 'Order Service',
          kind: 'application',
          description: 'REST API service',
        },
        parentId: 'sys-1',
      });

      expect(node3).toEqual({
        id: 'sto-1',
        type: 'store',
        position: { x: DEFAULT_GRID_COL_WIDTH * 2, y: 0 },
        data: {
          label: 'Order DB',
          kind: 'store',
          description: undefined,
        },
      });

      // Verify edge projections
      const [edge1, edge2] = result.edges;

      expect(edge1).toEqual({
        id: 'conn-1',
        source: 'app-1',
        target: 'sto-1',
        label: 'sync',
        type: 'default',
        animated: false,
        data: {
          kind: 'sync',
          description: 'SQL queries over TLS',
        },
      });

      expect(edge2).toEqual({
        id: 'conn-2',
        source: 'sys-1',
        target: 'app-1',
        label: 'async',
        type: 'default',
        animated: true,
        data: {
          kind: 'async',
          description: undefined,
        },
      });
    });

    it('handles empty inputs gracefully', () => {
      const result = projectViewModelToCanvas({
        objects: [],
        connections: [],
      });
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('supports positional arguments overload', () => {
      const result = projectViewModelToCanvas(mockObjects, mockConnections);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('respects layout positions and dimensions from viewObjects', () => {
      const viewObjects: ProjectViewModelViewObject[] = [
        {
          objectId: 'sys-1',
          x: 450,
          y: 300,
          width: 320,
          height: 240,
        },
        {
          objectId: 'sto-1',
          position: { x: 900, y: 600 },
          width: 200,
          height: 150,
        },
      ];

      const result = projectViewModelToCanvas({
        objects: mockObjects,
        connections: mockConnections,
        viewObjects,
      });

      const sysNode = result.nodes.find((n) => n.id === 'sys-1');
      expect(sysNode?.position).toEqual({ x: 450, y: 300 });
      expect(sysNode?.width).toBe(320);
      expect(sysNode?.height).toBe(240);

      const stoNode = result.nodes.find((n) => n.id === 'sto-1');
      expect(stoNode?.position).toEqual({ x: 900, y: 600 });
      expect(stoNode?.width).toBe(200);
      expect(stoNode?.height).toBe(150);

      // app-1 was not in viewObjects, so it receives fallback grid position (0, 0)
      const appNode = result.nodes.find((n) => n.id === 'app-1');
      expect(appNode?.position).toEqual({ x: 0, y: 0 });
      expect(appNode?.width).toBeUndefined();
      expect(appNode?.height).toBeUndefined();
    });

    it('calculates fallback grid coordinates correctly across rows and columns', () => {
      const manyObjects: ProjectViewModelObject[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `obj-${i}`,
          name: `Object ${i}`,
          kind: 'application',
        })
      );

      const result = projectViewModelToCanvas({
        objects: manyObjects,
        connections: [],
      });

      expect(result.nodes).toHaveLength(10);

      // Default grid columns = 4
      expect(DEFAULT_GRID_COLUMNS).toBe(4);

      // Row 0
      expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
      expect(result.nodes[1].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH,
        y: 0,
      });
      expect(result.nodes[2].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH * 2,
        y: 0,
      });
      expect(result.nodes[3].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH * 3,
        y: 0,
      });

      // Row 1
      expect(result.nodes[4].position).toEqual({
        x: 0,
        y: DEFAULT_GRID_ROW_HEIGHT,
      });
      expect(result.nodes[5].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH,
        y: DEFAULT_GRID_ROW_HEIGHT,
      });
      expect(result.nodes[6].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH * 2,
        y: DEFAULT_GRID_ROW_HEIGHT,
      });
      expect(result.nodes[7].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH * 3,
        y: DEFAULT_GRID_ROW_HEIGHT,
      });

      // Row 2
      expect(result.nodes[8].position).toEqual({
        x: 0,
        y: DEFAULT_GRID_ROW_HEIGHT * 2,
      });
      expect(result.nodes[9].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH,
        y: DEFAULT_GRID_ROW_HEIGHT * 2,
      });
    });

    it('respects custom gridColumns option when provided', () => {
      const objects: ProjectViewModelObject[] = [
        { id: '1', name: 'One', kind: 'system' },
        { id: '2', name: 'Two', kind: 'system' },
        { id: '3', name: 'Three', kind: 'system' },
      ];

      const result = projectViewModelToCanvas({
        objects,
        connections: [],
        gridColumns: 2,
      });

      expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
      expect(result.nodes[1].position).toEqual({
        x: DEFAULT_GRID_COL_WIDTH,
        y: 0,
      });
      expect(result.nodes[2].position).toEqual({
        x: 0,
        y: DEFAULT_GRID_ROW_HEIGHT,
      });
    });
  });

  describe('CanvasRenderer interface contract', () => {
    interface MockContainer {
      id: string;
      childrenCount: number;
    }

    class MockCanvasRenderer implements CanvasRenderer<MockContainer> {
      readonly name = 'mock-renderer';

      public container: MockContainer | null = null;
      public isMounted = false;
      public nodes: CanvasNode[] = [];
      public edges: CanvasEdge[] = [];
      public viewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };
      public interactionHandler: CanvasInteractionHandler | null = null;
      public fitViewCalled = false;

      mount(container: MockContainer): void {
        this.container = container;
        this.isMounted = true;
      }

      unmount(): void {
        this.container = null;
        this.isMounted = false;
        this.nodes = [];
        this.edges = [];
      }

      render(nodes: CanvasNode[], edges: CanvasEdge[]): void {
        this.nodes = [...nodes];
        this.edges = [...edges];
        if (this.container) {
          this.container.childrenCount = nodes.length + edges.length;
        }
      }

      setViewport(viewport: CanvasViewport): void {
        this.viewport = { ...viewport };
        this.interactionHandler?.onViewportChange?.(this.viewport);
      }

      getViewport(): CanvasViewport {
        return { ...this.viewport };
      }

      fitView(): void {
        this.fitViewCalled = true;
        this.setViewport({ x: 100, y: 50, zoom: 0.8 });
      }

      setInteractionHandler(handler: CanvasInteractionHandler): void {
        this.interactionHandler = handler;
      }

      // Test helper to simulate user interaction
      simulateNodeClick(id: string): void {
        this.interactionHandler?.onNodeClick?.(id);
      }

      simulateDragStop(id: string, x: number, y: number): void {
        this.interactionHandler?.onNodeDragStop?.(id, { x, y });
      }

      simulateSelectionChange(nodeIds: string[], edgeIds: string[]): void {
        this.interactionHandler?.onSelectionChange?.(nodeIds, edgeIds);
      }
    }

    it('satisfies the CanvasRenderer interface contract lifecycle', () => {
      const renderer: CanvasRenderer<MockContainer> = new MockCanvasRenderer();
      const mockInstance = renderer as MockCanvasRenderer;

      expect(renderer.name).toBe('mock-renderer');
      expect(mockInstance.isMounted).toBe(false);

      // Mount
      const container: MockContainer = { id: 'canvas-container-root', childrenCount: 0 };
      renderer.mount(container);
      expect(mockInstance.isMounted).toBe(true);
      expect(mockInstance.container).toBe(container);

      // Render nodes & edges
      const nodes: CanvasNode[] = [
        {
          id: 'n1',
          type: 'system',
          position: { x: 10, y: 20 },
          data: { label: 'Node 1' },
        },
      ];
      const edges: CanvasEdge[] = [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'default',
        },
      ];

      renderer.render(nodes, edges);
      expect(mockInstance.nodes).toHaveLength(1);
      expect(mockInstance.edges).toHaveLength(1);
      expect(container.childrenCount).toBe(2);

      // Viewport manipulation
      const initialViewport = renderer.getViewport();
      expect(initialViewport).toEqual({ x: 0, y: 0, zoom: 1 });

      renderer.setViewport({ x: 200, y: 150, zoom: 1.5 });
      expect(renderer.getViewport()).toEqual({ x: 200, y: 150, zoom: 1.5 });

      renderer.fitView();
      expect(mockInstance.fitViewCalled).toBe(true);
      expect(renderer.getViewport()).toEqual({ x: 100, y: 50, zoom: 0.8 });

      // Unmount
      renderer.unmount();
      expect(mockInstance.isMounted).toBe(false);
      expect(mockInstance.container).toBeNull();
      expect(mockInstance.nodes).toHaveLength(0);
      expect(mockInstance.edges).toHaveLength(0);
    });

    it('attaches and delegates events through CanvasInteractionHandler', () => {
      const renderer = new MockCanvasRenderer();

      const onNodeClick = vi.fn();
      const onNodeDragStop = vi.fn();
      const onSelectionChange = vi.fn();
      const onViewportChange = vi.fn();

      const handler: CanvasInteractionHandler = {
        onNodeClick,
        onNodeDragStop,
        onSelectionChange,
        onViewportChange,
      };

      renderer.setInteractionHandler(handler);

      // Trigger node click
      renderer.simulateNodeClick('node-42');
      expect(onNodeClick).toHaveBeenCalledWith('node-42');

      // Trigger drag stop
      renderer.simulateDragStop('node-42', 350, 420);
      expect(onNodeDragStop).toHaveBeenCalledWith('node-42', { x: 350, y: 420 });

      // Trigger selection change
      renderer.simulateSelectionChange(['node-1', 'node-2'], ['edge-1']);
      expect(onSelectionChange).toHaveBeenCalledWith(
        ['node-1', 'node-2'],
        ['edge-1']
      );

      // Trigger viewport change via setViewport
      renderer.setViewport({ x: 50, y: 80, zoom: 2 });
      expect(onViewportChange).toHaveBeenCalledWith({ x: 50, y: 80, zoom: 2 });
    });
  });
});
