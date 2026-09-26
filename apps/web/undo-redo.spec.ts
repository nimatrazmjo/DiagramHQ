import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { CanvasEdge, CanvasNode } from '@diagramhq/domain';
import type { Node, Edge } from '@xyflow/react';
import type { StateSetFn } from './lib/commands/command';
import {
  CommandDispatcher,
  CreateNodeCommand,
  DeleteNodeCommand,
  ConnectNodesCommand,
  UpdateNodeMetadataCommand,
  MoveNodeCommand,
  MoveNodesCommand,
  AlignNodesCommand,
  ApplyLayoutCommand,
  type Command,
} from './lib/commands';
import { InfiniteCanvas } from './components/canvas/infinite-canvas';

describe('F016 — Undo/redo: CommandDispatcher', () => {
  let dispatcher: CommandDispatcher;

  beforeEach(() => {
    dispatcher = new CommandDispatcher();
  });

  it('starts with empty history and undone stacks', () => {
    expect(dispatcher.canUndo()).toBe(false);
    expect(dispatcher.canRedo()).toBe(false);
    expect(dispatcher.getHistory()).toHaveLength(0);
    expect(dispatcher.getUndone()).toHaveLength(0);
    expect(dispatcher.peekUndo()).toBeUndefined();
    expect(dispatcher.peekRedo()).toBeUndefined();
  });

  it('records commands in history and enables undo', async () => {
    const dummyCmd: Command<string> = {
      id: 'cmd-1',
      name: 'Dummy',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok-undone'),
    };

    await dispatcher.dispatch(dummyCmd);

    expect(dummyCmd.execute).toHaveBeenCalled();
    expect(dispatcher.canUndo()).toBe(true);
    expect(dispatcher.canRedo()).toBe(false);
    expect(dispatcher.peekUndo()).toBe(dummyCmd);
    expect(dispatcher.getHistory()).toEqual([dummyCmd]);
  });

  it('undo reverts the command and moves it to undone stack', async () => {
    const dummyCmd: Command<string> = {
      id: 'cmd-1',
      name: 'Dummy',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok-undone'),
    };

    await dispatcher.dispatch(dummyCmd);
    const undoneCmd = await dispatcher.undo();

    expect(undoneCmd).toBe(dummyCmd);
    expect(dummyCmd.undo).toHaveBeenCalled();
    expect(dispatcher.canUndo()).toBe(false);
    expect(dispatcher.canRedo()).toBe(true);
    expect(dispatcher.peekRedo()).toBe(dummyCmd);
  });

  it('redo re-executes the command and moves it back to history stack', async () => {
    const dummyCmd: Command<string> = {
      id: 'cmd-1',
      name: 'Dummy',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok-undone'),
    };

    await dispatcher.dispatch(dummyCmd);
    await dispatcher.undo();
    const redoneCmd = await dispatcher.redo();

    expect(redoneCmd).toBe(dummyCmd);
    expect(dummyCmd.execute).toHaveBeenCalledTimes(2);
    expect(dispatcher.canUndo()).toBe(true);
    expect(dispatcher.canRedo()).toBe(false);
  });

  it('dispatching a new command clears the undone stack', async () => {
    const cmd1: Command<string> = {
      id: 'cmd-1',
      name: 'Cmd1',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok'),
    };
    const cmd2: Command<string> = {
      id: 'cmd-2',
      name: 'Cmd2',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok'),
    };

    await dispatcher.dispatch(cmd1);
    await dispatcher.undo();
    expect(dispatcher.canRedo()).toBe(true);

    await dispatcher.dispatch(cmd2);
    expect(dispatcher.canRedo()).toBe(false);
    expect(dispatcher.getUndone()).toHaveLength(0);
    expect(dispatcher.getHistory()).toEqual([cmd2]);
  });

  it('notifies subscribers on dispatch, undo, redo, and clearHistory', async () => {
    const listener = vi.fn();
    const unsubscribe = dispatcher.subscribe(listener);

    const dummyCmd: Command<string> = {
      id: 'cmd-1',
      name: 'Dummy',
      execute: vi.fn().mockResolvedValue('ok'),
      undo: vi.fn().mockResolvedValue('ok'),
    };

    await dispatcher.dispatch(dummyCmd);
    expect(listener).toHaveBeenCalledTimes(1);

    await dispatcher.undo();
    expect(listener).toHaveBeenCalledTimes(2);

    await dispatcher.redo();
    expect(listener).toHaveBeenCalledTimes(3);

    dispatcher.clearHistory();
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    await dispatcher.dispatch(dummyCmd);
    expect(listener).toHaveBeenCalledTimes(4);
  });
});

describe('F016 — Reversible Canvas Commands', () => {
  describe('CreateNodeCommand', () => {
    const node: CanvasNode = {
      id: 'node-1',
      type: 'custom',
      position: { x: 100, y: 150 },
      data: { label: 'New Node' },
    };

    it('executes and calls persistCreateFn', async () => {
      const persistCreateFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new CreateNodeCommand({ viewId: 'vw_1', node, persistCreateFn });

      const res = await cmd.execute();
      expect(res).toBe(node);
      expect(persistCreateFn).toHaveBeenCalledWith('vw_1', node);
    });

    it('undo calls persistDeleteFn', async () => {
      const persistDeleteFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new CreateNodeCommand({ viewId: 'vw_1', node, persistDeleteFn });

      const res = await cmd.undo();
      expect(res).toBe(node);
      expect(persistDeleteFn).toHaveBeenCalledWith('vw_1', 'node-1');
    });

    it('applyCanvasUpdate adds node on execute and removes node on undo', () => {
      const cmd = new CreateNodeCommand({ node });
      let currentNodes: Node[] = [];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]!.id).toBe('node-1');

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes).toHaveLength(0);
    });
  });

  describe('DeleteNodeCommand', () => {
    const node: CanvasNode = {
      id: 'node-del',
      type: 'custom',
      position: { x: 200, y: 300 },
      data: { label: 'Deleted Node' },
    };
    const connectedEdges: CanvasEdge[] = [
      { id: 'edge-1', source: 'node-del', target: 'other-node' },
    ];

    it('executes and calls persistDeleteFn', async () => {
      const persistDeleteFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new DeleteNodeCommand({ viewId: 'vw_1', node, connectedEdges, persistDeleteFn });

      const res = await cmd.execute();
      expect(res).toEqual({ nodeId: 'node-del' });
      expect(persistDeleteFn).toHaveBeenCalledWith('vw_1', 'node-del');
    });

    it('undo calls persistRestoreFn with node and connected edges', async () => {
      const persistRestoreFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new DeleteNodeCommand({ viewId: 'vw_1', node, connectedEdges, persistRestoreFn });

      const res = await cmd.undo();
      expect(res).toEqual({ nodeId: 'node-del' });
      expect(persistRestoreFn).toHaveBeenCalledWith('vw_1', node, connectedEdges);
    });

    it('applyCanvasUpdate removes node and edges on execute, restores them on undo', () => {
      const cmd = new DeleteNodeCommand({ node, connectedEdges });
      let currentNodes: Node[] = [{ id: 'node-del', position: { x: 200, y: 300 }, data: {} }];
      let currentEdges: Edge[] = [{ id: 'edge-1', source: 'node-del', target: 'other-node' }];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };
      const setEdges: StateSetFn<Edge> = (updater) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, setEdges, 'execute');
      expect(currentNodes).toHaveLength(0);
      expect(currentEdges).toHaveLength(0);

      cmd.applyCanvasUpdate(setNodes, setEdges, 'undo');
      expect(currentNodes).toHaveLength(1);
      expect(currentNodes[0]!.id).toBe('node-del');
      expect(currentEdges).toHaveLength(1);
      expect(currentEdges[0]!.id).toBe('edge-1');
    });
  });

  describe('ConnectNodesCommand', () => {
    const edge: CanvasEdge = {
      id: 'edge-new',
      source: 'node-a',
      target: 'node-b',
      label: 'calls',
    };

    it('executes and calls persistCreateFn', async () => {
      const persistCreateFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new ConnectNodesCommand({ viewId: 'vw_1', edge, persistCreateFn });

      const res = await cmd.execute();
      expect(res).toBe(edge);
      expect(persistCreateFn).toHaveBeenCalledWith('vw_1', edge);
    });

    it('undo calls persistDeleteFn', async () => {
      const persistDeleteFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new ConnectNodesCommand({ viewId: 'vw_1', edge, persistDeleteFn });

      const res = await cmd.undo();
      expect(res).toBe(edge);
      expect(persistDeleteFn).toHaveBeenCalledWith('vw_1', 'edge-new');
    });

    it('applyCanvasUpdate adds edge on execute, removes edge on undo', () => {
      const cmd = new ConnectNodesCommand({ edge });
      let currentEdges: Edge[] = [];
      const setEdges: StateSetFn<Edge> = (updater) => {
        currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      };

      cmd.applyCanvasUpdate(() => {}, setEdges, 'execute');
      expect(currentEdges).toHaveLength(1);
      expect(currentEdges[0]!.id).toBe('edge-new');

      cmd.applyCanvasUpdate(() => {}, setEdges, 'undo');
      expect(currentEdges).toHaveLength(0);
    });
  });

  describe('UpdateNodeMetadataCommand', () => {
    const prevData = { label: 'Old Title', technology: 'TypeScript' };
    const newData = { label: 'New Title', technology: 'Go' };

    it('executes and calls persistFn with newData', async () => {
      const persistFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new UpdateNodeMetadataCommand({
        viewId: 'vw_1',
        nodeId: 'node-meta',
        prevData,
        newData,
        persistFn,
      });

      const res = await cmd.execute();
      expect(res).toEqual({ nodeId: 'node-meta', data: newData });
      expect(persistFn).toHaveBeenCalledWith('vw_1', 'node-meta', newData);
    });

    it('undo calls persistFn with prevData', async () => {
      const persistFn = vi.fn().mockResolvedValue(undefined);
      const cmd = new UpdateNodeMetadataCommand({
        viewId: 'vw_1',
        nodeId: 'node-meta',
        prevData,
        newData,
        persistFn,
      });

      const res = await cmd.undo();
      expect(res).toEqual({ nodeId: 'node-meta', data: prevData });
      expect(persistFn).toHaveBeenCalledWith('vw_1', 'node-meta', prevData);
    });

    it('applyCanvasUpdate updates node data on execute, reverts on undo', () => {
      const cmd = new UpdateNodeMetadataCommand({
        nodeId: 'node-meta',
        prevData,
        newData,
      });
      let currentNodes: Node[] = [{ id: 'node-meta', position: { x: 0, y: 0 }, data: prevData }];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes[0]!.data.label).toBe('New Title');

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes[0]!.data.label).toBe('Old Title');
    });
  });

  describe('MoveNodeCommand & MoveNodesCommand canvas sync', () => {
    it('MoveNodeCommand updates position on execute and restores on undo', () => {
      const cmd = new MoveNodeCommand({
        objectId: 'node-move',
        prevPosition: { x: 10, y: 20 },
        newPosition: { x: 100, y: 200 },
      });
      let currentNodes: Node[] = [{ id: 'node-move', position: { x: 10, y: 20 }, data: {} }];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes[0]!.position).toEqual({ x: 100, y: 200 });

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes[0]!.position).toEqual({ x: 10, y: 20 });
    });

    it('MoveNodesCommand updates multiple positions on execute and restores on undo', () => {
      const cmd = new MoveNodesCommand({
        moves: [
          { objectId: 'a', prevPosition: { x: 0, y: 0 }, newPosition: { x: 50, y: 50 } },
          { objectId: 'b', prevPosition: { x: 10, y: 10 }, newPosition: { x: 60, y: 60 } },
        ],
      });
      let currentNodes: Node[] = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 10, y: 10 }, data: {} },
      ];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes[0]!.position).toEqual({ x: 50, y: 50 });
      expect(currentNodes[1]!.position).toEqual({ x: 60, y: 60 });

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes[0]!.position).toEqual({ x: 0, y: 0 });
      expect(currentNodes[1]!.position).toEqual({ x: 10, y: 10 });
    });
  });

  describe('AlignNodesCommand & ApplyLayoutCommand canvas sync', () => {
    it('AlignNodesCommand updates aligned positions on execute and restores on undo', () => {
      const nodes = [
        { id: 'a', position: { x: 10, y: 0 }, width: 100, height: 50 },
        { id: 'b', position: { x: 50, y: 0 }, width: 100, height: 50 },
      ];
      const cmd = new AlignNodesCommand({
        nodes,
        operation: { type: 'align', axis: 'left' },
      });
      let currentNodes: Node[] = [
        { id: 'a', position: { x: 10, y: 0 }, data: {} },
        { id: 'b', position: { x: 50, y: 0 }, data: {} },
      ];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes[0]!.position.x).toBe(10);
      expect(currentNodes[1]!.position.x).toBe(10);

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes[0]!.position.x).toBe(10);
      expect(currentNodes[1]!.position.x).toBe(50);
    });

    it('ApplyLayoutCommand updates positions on execute and restores on undo', () => {
      const nodes = [
        { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
        { id: 'b', position: { x: 50, y: 50 }, width: 100, height: 50 },
      ];
      const positions = [{ x: 100, y: 100 }, { x: 200, y: 200 }];
      const cmd = new ApplyLayoutCommand({ nodes, positions });
      let currentNodes: Node[] = [
        { id: 'a', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', position: { x: 50, y: 50 }, data: {} },
      ];
      const setNodes: StateSetFn<Node> = (updater) => {
        currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      };

      cmd.applyCanvasUpdate(setNodes, () => {}, 'execute');
      expect(currentNodes[0]!.position).toEqual({ x: 100, y: 100 });
      expect(currentNodes[1]!.position).toEqual({ x: 200, y: 200 });

      cmd.applyCanvasUpdate(setNodes, () => {}, 'undo');
      expect(currentNodes[0]!.position).toEqual({ x: 0, y: 0 });
      expect(currentNodes[1]!.position).toEqual({ x: 50, y: 50 });
    });
  });
});

describe('F016 — InfiniteCanvas Toolbar UI', () => {
  it('renders undo and redo buttons with disabled state when history is empty', () => {
    const html = renderToString(React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [] }));
    expect(html).toContain('data-testid="undo-btn"');
    expect(html).toContain('data-testid="redo-btn"');
    expect(html).toMatch(/data-testid="undo-btn"[^>]*disabled/);
    expect(html).toMatch(/data-testid="redo-btn"[^>]*disabled/);
  });
});
