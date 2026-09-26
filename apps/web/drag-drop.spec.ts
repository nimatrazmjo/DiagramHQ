import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { Node } from '@xyflow/react';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';
import {
  type Command,
  MoveNodeCommand,
  CommandDispatcher,
  defaultCommandDispatcher,
} from './lib/commands';
import {
  InfiniteCanvas,
  createNodeDragStopHandler,
} from './components/canvas/infinite-canvas';

describe('F012 — Drag and Drop & Command Architecture', () => {
  beforeEach(() => {
    defaultCommandDispatcher.clearHistory();
    vi.clearAllMocks();
  });

  describe('1. MoveNodeCommand Unit Tests', () => {
    it('initializes with unique ID, name "MoveNode", and assigned properties', () => {
      const cmd1 = new MoveNodeCommand({
        viewId: 'view-1',
        objectId: 'obj-1',
        prevPosition: { x: 10, y: 20 },
        newPosition: { x: 100, y: 200 },
      });
      const cmd2 = new MoveNodeCommand({
        viewId: 'view-1',
        objectId: 'obj-1',
        prevPosition: { x: 10, y: 20 },
        newPosition: { x: 100, y: 200 },
      });

      expect(cmd1.id).toBeDefined();
      expect(cmd2.id).toBeDefined();
      expect(cmd1.id).not.toBe(cmd2.id);
      expect(cmd1.name).toBe('MoveNode');
      expect(cmd1.viewId).toBe('view-1');
      expect(cmd1.objectId).toBe('obj-1');
      expect(cmd1.prevPosition).toEqual({ x: 10, y: 20 });
      expect(cmd1.newPosition).toEqual({ x: 100, y: 200 });
    });

    it('executes position change and calls persistFn with viewId, objectId, and newPosition', async () => {
      const mockPersistFn = vi.fn().mockResolvedValue(undefined);
      const command = new MoveNodeCommand({
        viewId: 'view-arch-1',
        objectId: 'node-auth-service',
        prevPosition: { x: 50, y: 50 },
        newPosition: { x: 250, y: 350 },
        persistFn: mockPersistFn,
      });

      const result = await command.execute();

      expect(mockPersistFn).toHaveBeenCalledTimes(1);
      expect(mockPersistFn).toHaveBeenCalledWith(
        'view-arch-1',
        'node-auth-service',
        { x: 250, y: 350 }
      );
      expect(result).toEqual({ x: 250, y: 350 });
    });

    it('undoes position change and calls persistFn with viewId, objectId, and previous position', async () => {
      const mockPersistFn = vi.fn().mockResolvedValue(undefined);
      const command = new MoveNodeCommand({
        viewId: 'view-arch-1',
        objectId: 'node-auth-service',
        prevPosition: { x: 50, y: 50 },
        newPosition: { x: 250, y: 350 },
        persistFn: mockPersistFn,
      });

      // Execute first
      await command.execute();
      expect(mockPersistFn).toHaveBeenLastCalledWith(
        'view-arch-1',
        'node-auth-service',
        { x: 250, y: 350 }
      );

      // Then undo
      const undoResult = await command.undo();

      expect(mockPersistFn).toHaveBeenCalledTimes(2);
      expect(mockPersistFn).toHaveBeenLastCalledWith(
        'view-arch-1',
        'node-auth-service',
        { x: 50, y: 50 }
      );
      expect(undoResult).toEqual({ x: 50, y: 50 });
    });

    it('executes and undoes safely without persistFn or viewId', async () => {
      const commandWithoutPersist = new MoveNodeCommand({
        objectId: 'node-test',
        prevPosition: { x: 0, y: 0 },
        newPosition: { x: 100, y: 100 },
      });

      const execResult = await commandWithoutPersist.execute();
      expect(execResult).toEqual({ x: 100, y: 100 });

      const undoResult = await commandWithoutPersist.undo();
      expect(undoResult).toEqual({ x: 0, y: 0 });
    });
  });

  describe('2. CommandDispatcher Unit Tests', () => {
    it('dispatches command, returns execution result, and records history', async () => {
      const dispatcher = new CommandDispatcher();
      const mockCommand: Command<{ status: string }> = {
        id: 'cmd-1',
        name: 'TestCommand',
        execute: vi.fn().mockResolvedValue({ status: 'success' }),
        undo: vi.fn().mockResolvedValue({ status: 'undone' }),
      };

      const result = await dispatcher.dispatch(mockCommand);

      expect(mockCommand.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'success' });
      expect(dispatcher.getHistory()).toHaveLength(1);
      expect(dispatcher.getHistory()[0]).toBe(mockCommand);
      expect(dispatcher.history).toHaveLength(1);
      expect(dispatcher.undone).toEqual([]);
    });

    it('undoes the last dispatched command and records it in undone stack', async () => {
      const dispatcher = new CommandDispatcher();
      const mockCommand: Command<number> = {
        id: 'cmd-1',
        name: 'Increment',
        execute: vi.fn().mockResolvedValue(1),
        undo: vi.fn().mockResolvedValue(0),
      };

      await dispatcher.dispatch(mockCommand);
      expect(dispatcher.getHistory()).toHaveLength(1);

      await dispatcher.undo();

      expect(mockCommand.undo).toHaveBeenCalledTimes(1);
      expect(dispatcher.getHistory()).toHaveLength(0);
      expect(dispatcher.undone).toHaveLength(1);
      expect(dispatcher.undone[0]).toBe(mockCommand);
    });

    it('redoes the previously undone command and restores it to history', async () => {
      const dispatcher = new CommandDispatcher();
      const mockCommand: Command<number> = {
        id: 'cmd-1',
        name: 'Increment',
        execute: vi.fn().mockResolvedValue(1),
        undo: vi.fn().mockResolvedValue(0),
      };

      await dispatcher.dispatch(mockCommand);
      await dispatcher.undo();
      expect(dispatcher.undone).toHaveLength(1);

      await dispatcher.redo();

      expect(mockCommand.execute).toHaveBeenCalledTimes(2);
      expect(dispatcher.undone).toHaveLength(0);
      expect(dispatcher.getHistory()).toHaveLength(1);
      expect(dispatcher.getHistory()[0]).toBe(mockCommand);
    });

    it('dispatching a new command clears undone stack', async () => {
      const dispatcher = new CommandDispatcher();
      const cmd1: Command = {
        id: 'cmd-1',
        name: 'Cmd1',
        execute: vi.fn().mockResolvedValue('1'),
        undo: vi.fn().mockResolvedValue('0'),
      };
      const cmd2: Command = {
        id: 'cmd-2',
        name: 'Cmd2',
        execute: vi.fn().mockResolvedValue('2'),
      };

      await dispatcher.dispatch(cmd1);
      await dispatcher.undo();
      expect(dispatcher.undone).toHaveLength(1);

      await dispatcher.dispatch(cmd2);
      expect(dispatcher.undone).toHaveLength(0);
      expect(dispatcher.getHistory()).toHaveLength(1);
      expect(dispatcher.getHistory()[0]).toBe(cmd2);
    });

    it('clearHistory clears both history and undone list', async () => {
      const dispatcher = new CommandDispatcher();
      const cmd1: Command = {
        id: 'cmd-1',
        name: 'Cmd1',
        execute: vi.fn().mockResolvedValue(1),
        undo: vi.fn().mockResolvedValue(0),
      };

      await dispatcher.dispatch(cmd1);
      await dispatcher.undo();
      expect(dispatcher.undone).toHaveLength(1);

      dispatcher.clearHistory();

      expect(dispatcher.getHistory()).toEqual([]);
      expect(dispatcher.undone).toEqual([]);
    });

    it('handles undo and redo safely when history or undone stack is empty', async () => {
      const dispatcher = new CommandDispatcher();

      await expect(dispatcher.undo()).resolves.toBeUndefined();
      await expect(dispatcher.redo()).resolves.toBeUndefined();
    });

    it('defaultCommandDispatcher is an exported singleton instance of CommandDispatcher', () => {
      expect(defaultCommandDispatcher).toBeInstanceOf(CommandDispatcher);
    });
  });

  describe('3. Component Tests for InfiniteCanvas Drag Callback', () => {
    const sampleNodes: CanvasNode[] = [
      {
        id: 'node-sys-1',
        type: 'system',
        position: { x: 100, y: 150 },
        data: { label: 'Banking System', description: 'Core ledger' },
      },
      {
        id: 'node-app-1',
        type: 'application',
        position: { x: 350, y: 150 },
        data: { label: 'Auth Gateway', status: 'Online' },
      },
    ];
    const sampleEdges: CanvasEdge[] = [];

    it('dragging a node dispatches a MoveNodeCommand and triggers onNodeDragStop', async () => {
      const onCommandDispatched = vi.fn();
      const onNodeDragStop = vi.fn();
      let dragStopHandler: ((event: unknown, node: Node) => void) | null = null;

      renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
          viewId: 'view-canvas-99',
          onCommandDispatched,
          onNodeDragStop,
          onDragStopReady: (handler) => {
            dragStopHandler = handler;
          },
        })
      );

      expect(dragStopHandler).toBeTypeOf('function');

      // Simulate dragging node-sys-1 from { x: 100, y: 150 } to { x: 280, y: 420 }
      const draggedNode: Node = {
        id: 'node-sys-1',
        type: 'system',
        position: { x: 280, y: 420 },
        data: { label: 'Banking System' },
      };

      await dragStopHandler!(null, draggedNode);

      // Verify onCommandDispatched was called with a MoveNodeCommand instance
      expect(onCommandDispatched).toHaveBeenCalledTimes(1);
      const command = onCommandDispatched.mock.calls[0]![0] as MoveNodeCommand;
      expect(command.name).toBe('MoveNode');
      expect(command.objectId).toBe('node-sys-1');
      expect(command.viewId).toBe('view-canvas-99');
      expect(command.prevPosition).toEqual({ x: 100, y: 150 });
      expect(command.newPosition).toEqual({ x: 280, y: 420 });

      // Verify onNodeDragStop callback was called
      expect(onNodeDragStop).toHaveBeenCalledTimes(1);
      expect(onNodeDragStop).toHaveBeenCalledWith('node-sys-1', {
        x: 280,
        y: 420,
      });

      // Verify defaultCommandDispatcher recorded the command
      expect(defaultCommandDispatcher.getHistory()).toContain(command);
    });

    it('dispatches through defaultCommandDispatcher when onCommandDispatched is omitted', async () => {
      const onNodeDragStop = vi.fn();
      let dragStopHandler: ((event: unknown, node: Node) => void) | null = null;

      renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
          viewId: 'view-default-disp',
          onNodeDragStop,
          onDragStopReady: (handler) => {
            dragStopHandler = handler;
          },
        })
      );

      expect(dragStopHandler).toBeTypeOf('function');
      defaultCommandDispatcher.clearHistory();

      const draggedNode: Node = {
        id: 'node-app-1',
        type: 'application',
        position: { x: 500, y: 300 },
        data: { label: 'Auth Gateway' },
      };

      await dragStopHandler!(null, draggedNode);

      const history = defaultCommandDispatcher.getHistory();
      expect(history).toHaveLength(1);
      const cmd = history[0] as MoveNodeCommand;
      expect(cmd.name).toBe('MoveNode');
      expect(cmd.objectId).toBe('node-app-1');
      expect(cmd.prevPosition).toEqual({ x: 350, y: 150 });
      expect(cmd.newPosition).toEqual({ x: 500, y: 300 });
      expect(onNodeDragStop).toHaveBeenCalledWith('node-app-1', {
        x: 500,
        y: 300,
      });
    });

    it('captures initial position when drag start positions map is recorded', async () => {
      const mockNodes: Node[] = [
        {
          id: 'n-1',
          type: 'system',
          position: { x: 50, y: 75 },
          data: {},
        },
      ];
      const dragStartMap = new Map<string, { x: number; y: number }>();
      dragStartMap.set('n-1', { x: 50, y: 75 });

      const onCommandDispatched = vi.fn();
      const handler = createNodeDragStopHandler({
        getNodes: () => mockNodes,
        viewId: 'v-1',
        onCommandDispatched,
        dragStartPositions: dragStartMap,
      });

      await handler(null, {
        id: 'n-1',
        type: 'system',
        position: { x: 220, y: 330 },
        data: {},
      });

      expect(onCommandDispatched).toHaveBeenCalledTimes(1);
      const cmd = onCommandDispatched.mock.calls[0]![0] as MoveNodeCommand;
      expect(cmd.prevPosition).toEqual({ x: 50, y: 75 });
      expect(cmd.newPosition).toEqual({ x: 220, y: 330 });
      // Map should have cleaned up the entry
      expect(dragStartMap.has('n-1')).toBe(false);
    });

    it('strictly conforms to Layer Boundaries Rule 3: canvas does not call fetch directly', async () => {
      const fetchSpy = vi.fn();
      // Temporarily mock global fetch to detect unauthorized direct network calls
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy;

      try {
        let dragStopHandler: ((event: unknown, node: Node) => void) | null = null;
        renderToString(
          React.createElement(InfiniteCanvas, {
            initialNodes: sampleNodes,
            viewId: 'view-rule-3',
            onDragStopReady: (handler) => {
              dragStopHandler = handler;
            },
          })
        );

        await dragStopHandler!(null, {
          id: 'node-sys-1',
          type: 'system',
          position: { x: 600, y: 700 },
          data: {},
        });

        // Ensure canvas never called fetch directly (Rule 3)
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('reload simulation: verifying initialNodes with updated positions render at new coordinates', () => {
      // Step 1: Initial load before drag-drop
      const initialNodes: CanvasNode[] = [
        {
          id: 'service-a',
          type: 'system',
          position: { x: 120, y: 180 },
          data: { label: 'Service A' },
        },
        {
          id: 'database-b',
          type: 'store',
          position: { x: 400, y: 180 },
          data: { label: 'DB B' },
        },
      ];

      const initialHtml = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes,
        })
      );

      // Verify initial rendering coordinates
      expect(initialHtml).toContain('data-testid="node-pos-service-a"');
      expect(initialHtml).toContain('data-x="120"');
      expect(initialHtml).toContain('data-y="180"');
      expect(initialHtml).toContain('service-a<!-- -->: (<!-- -->120<!-- -->, <!-- -->180<!-- -->)');

      expect(initialHtml).toContain('data-testid="node-pos-database-b"');
      expect(initialHtml).toContain('data-x="400"');
      expect(initialHtml).toContain('data-y="180"');

      // Step 2: Simulate drag and drop movement
      // User moves service-a to (310, 520) and database-b to (700, 520)
      const updatedNodes: CanvasNode[] = [
        {
          id: 'service-a',
          type: 'system',
          position: { x: 310, y: 520 },
          data: { label: 'Service A' },
        },
        {
          id: 'database-b',
          type: 'store',
          position: { x: 700, y: 520 },
          data: { label: 'DB B' },
        },
      ];

      // Step 3: Simulate reload with persisted positions
      const reloadedHtml = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: updatedNodes,
        })
      );

      // Verify reloaded canvas renders strictly at updated coordinates
      expect(reloadedHtml).toContain('data-testid="node-pos-service-a"');
      expect(reloadedHtml).toContain('data-x="310"');
      expect(reloadedHtml).toContain('data-y="520"');
      expect(reloadedHtml).toContain('service-a<!-- -->: (<!-- -->310<!-- -->, <!-- -->520<!-- -->)');

      expect(reloadedHtml).toContain('data-testid="node-pos-database-b"');
      expect(reloadedHtml).toContain('data-x="700"');
      expect(reloadedHtml).toContain('data-y="520"');
      expect(reloadedHtml).toContain('database-b<!-- -->: (<!-- -->700<!-- -->, <!-- -->520<!-- -->)');

      // Verify old coordinates are no longer present in reloaded output
      expect(reloadedHtml).not.toContain('data-x="120"');
      expect(reloadedHtml).not.toContain('data-x="400"');
      expect(reloadedHtml).not.toContain('120<!-- -->, <!-- -->180');
    });

    it('end-to-end command dispatch and reload workflow simulation', async () => {
      // In-memory view store simulating server/domain state
      const mockDatabase: Record<string, { x: number; y: number }> = {
        'node-cart': { x: 50, y: 50 },
      };

      const persistFn = vi.fn(
        async (_viewId: string, objectId: string, position: { x: number; y: number }) => {
          mockDatabase[objectId] = { ...position };
        }
      );

      // Initial state
      let initialNodes: CanvasNode[] = [
        {
          id: 'node-cart',
          type: 'application',
          position: { ...mockDatabase['node-cart']! },
          data: { label: 'Cart Microservice' },
        },
      ];

      const html1 = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes,
          viewId: 'v-checkout',
          persistFn,
        })
      );
      expect(html1).toContain('data-x="50"');
      expect(html1).toContain('data-y="50"');

      // User drags node-cart to { x: 320, y: 440 }
      const moveCommand = new MoveNodeCommand({
        viewId: 'v-checkout',
        objectId: 'node-cart',
        prevPosition: { x: 50, y: 50 },
        newPosition: { x: 320, y: 440 },
        persistFn,
      });

      await defaultCommandDispatcher.dispatch(moveCommand);

      expect(persistFn).toHaveBeenCalledWith('v-checkout', 'node-cart', {
        x: 320,
        y: 440,
      });
      expect(mockDatabase['node-cart']).toEqual({ x: 320, y: 440 });

      // Page reload: client fetches updated state
      initialNodes = [
        {
          id: 'node-cart',
          type: 'application',
          position: { ...mockDatabase['node-cart']! },
          data: { label: 'Cart Microservice' },
        },
      ];

      const htmlReload = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes,
          viewId: 'v-checkout',
          persistFn,
        })
      );
      expect(htmlReload).toContain('data-x="320"');
      expect(htmlReload).toContain('data-y="440"');
      expect(htmlReload).not.toContain('data-x="50"');

      // Undo operation
      await defaultCommandDispatcher.undo();
      expect(mockDatabase['node-cart']).toEqual({ x: 50, y: 50 });

      // Reload again after undo
      initialNodes = [
        {
          id: 'node-cart',
          type: 'application',
          position: { ...mockDatabase['node-cart']! },
          data: { label: 'Cart Microservice' },
        },
      ];

      const htmlUndoReload = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes,
          viewId: 'v-checkout',
          persistFn,
        })
      );
      expect(htmlUndoReload).toContain('data-x="50"');
      expect(htmlUndoReload).toContain('data-y="50"');
      expect(htmlUndoReload).not.toContain('data-x="320"');
    });
  });
});
