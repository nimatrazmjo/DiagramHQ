import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveNodesCommand, type NodeMoveItem } from './lib/commands/move-nodes-command';
import { CommandDispatcher } from './lib/commands/dispatcher';
import { useCanvasStore } from './lib/canvas-store';

// ----------------------------------------------------------------
// MoveNodesCommand unit tests
// ----------------------------------------------------------------
describe('MoveNodesCommand', () => {
  const moves: NodeMoveItem[] = [
    { objectId: 'obj_a', prevPosition: { x: 0, y: 0 }, newPosition: { x: 50, y: 50 } },
    { objectId: 'obj_b', prevPosition: { x: 100, y: 200 }, newPosition: { x: 150, y: 250 } },
  ];

  it('has name "MoveNodes"', () => {
    const cmd = new MoveNodesCommand({ moves });
    expect(cmd.name).toBe('MoveNodes');
  });

  it('has a unique id', () => {
    const cmd1 = new MoveNodesCommand({ moves });
    const cmd2 = new MoveNodesCommand({ moves });
    expect(cmd1.id).not.toBe(cmd2.id);
  });

  it('execute returns newPositions for all nodes', async () => {
    const cmd = new MoveNodesCommand({ moves });
    const result = await cmd.execute();
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({ objectId: 'obj_a', position: { x: 50, y: 50 } });
    expect(result[1]!).toEqual({ objectId: 'obj_b', position: { x: 150, y: 250 } });
  });

  it('undo returns prevPositions for all nodes', async () => {
    const cmd = new MoveNodesCommand({ moves });
    await cmd.execute();
    const result = await cmd.undo();
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({ objectId: 'obj_a', position: { x: 0, y: 0 } });
    expect(result[1]!).toEqual({ objectId: 'obj_b', position: { x: 100, y: 200 } });
  });

  it('execute calls persistFn with all updated positions', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new MoveNodesCommand({ viewId: 'vw_1', moves, persistFn });
    await cmd.execute();
    expect(persistFn).toHaveBeenCalledOnce();
    expect(persistFn).toHaveBeenCalledWith('vw_1', [
      { objectId: 'obj_a', x: 50, y: 50 },
      { objectId: 'obj_b', x: 150, y: 250 },
    ]);
  });

  it('undo calls persistFn with previous positions', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new MoveNodesCommand({ viewId: 'vw_1', moves, persistFn });
    await cmd.execute();
    persistFn.mockClear();
    await cmd.undo();
    expect(persistFn).toHaveBeenCalledOnce();
    expect(persistFn).toHaveBeenCalledWith('vw_1', [
      { objectId: 'obj_a', x: 0, y: 0 },
      { objectId: 'obj_b', x: 100, y: 200 },
    ]);
  });

  it('preserves relative offsets between nodes (delta invariant)', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new MoveNodesCommand({ viewId: 'vw_1', moves, persistFn });
    const result = await cmd.execute();

    const deltaA = {
      dx: result[0]!.position.x - moves[0]!.prevPosition.x,
      dy: result[0]!.position.y - moves[0]!.prevPosition.y,
    };
    const deltaB = {
      dx: result[1]!.position.x - moves[1]!.prevPosition.x,
      dy: result[1]!.position.y - moves[1]!.prevPosition.y,
    };
    // Both nodes moved by the same delta, preserving relative layout
    expect(deltaA.dx).toBe(deltaB.dx);
    expect(deltaA.dy).toBe(deltaB.dy);
  });

  it('does NOT call persistFn when viewId is absent', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new MoveNodesCommand({ moves, persistFn }); // no viewId
    await cmd.execute();
    expect(persistFn).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// CommandDispatcher undo/redo with MoveNodesCommand
// ----------------------------------------------------------------
describe('CommandDispatcher with MoveNodesCommand', () => {
  it('records MoveNodesCommand in history after dispatch', async () => {
    const dispatcher = new CommandDispatcher();
    const moves: NodeMoveItem[] = [
      { objectId: 'n1', prevPosition: { x: 0, y: 0 }, newPosition: { x: 10, y: 20 } },
    ];
    const cmd = new MoveNodesCommand({ moves });
    await dispatcher.dispatch(cmd);
    expect(dispatcher.getHistory()).toHaveLength(1);
    expect(dispatcher.getHistory()[0]!.name).toBe('MoveNodes');
  });

  it('undo restores previous positions', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new CommandDispatcher();
    const moves: NodeMoveItem[] = [
      { objectId: 'n1', prevPosition: { x: 0, y: 0 }, newPosition: { x: 10, y: 20 } },
    ];
    const cmd = new MoveNodesCommand({ viewId: 'vw_x', moves, persistFn });
    await dispatcher.dispatch(cmd);
    persistFn.mockClear();
    await dispatcher.undo();
    expect(persistFn).toHaveBeenCalledWith('vw_x', [{ objectId: 'n1', x: 0, y: 0 }]);
  });
});

// ----------------------------------------------------------------
// Canvas Store: multi-select state
// ----------------------------------------------------------------
describe('useCanvasStore — multi-select state', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isBoxSelectMode: true,
    });
  });

  it('toggleNodeSelection adds a new node ID', () => {
    useCanvasStore.getState().toggleNodeSelection('node_1');
    expect(useCanvasStore.getState().selectedNodeIds).toContain('node_1');
  });

  it('toggleNodeSelection removes an already-selected node ID', () => {
    useCanvasStore.getState().toggleNodeSelection('node_1');
    useCanvasStore.getState().toggleNodeSelection('node_1');
    expect(useCanvasStore.getState().selectedNodeIds).not.toContain('node_1');
  });

  it('can select multiple nodes via toggleNodeSelection', () => {
    useCanvasStore.getState().toggleNodeSelection('node_a');
    useCanvasStore.getState().toggleNodeSelection('node_b');
    const { selectedNodeIds } = useCanvasStore.getState();
    expect(selectedNodeIds).toContain('node_a');
    expect(selectedNodeIds).toContain('node_b');
    expect(selectedNodeIds).toHaveLength(2);
  });

  it('toggleEdgeSelection adds and removes an edge ID', () => {
    useCanvasStore.getState().toggleEdgeSelection('edge_1');
    expect(useCanvasStore.getState().selectedEdgeIds).toContain('edge_1');
    useCanvasStore.getState().toggleEdgeSelection('edge_1');
    expect(useCanvasStore.getState().selectedEdgeIds).not.toContain('edge_1');
  });

  it('isBoxSelectMode is true by default', () => {
    expect(useCanvasStore.getState().isBoxSelectMode).toBe(true);
  });

  it('toggleBoxSelectMode turns box-select off', () => {
    useCanvasStore.getState().toggleBoxSelectMode();
    expect(useCanvasStore.getState().isBoxSelectMode).toBe(false);
  });

  it('toggleBoxSelectMode turns box-select on when already off', () => {
    useCanvasStore.getState().setBoxSelectMode(false);
    useCanvasStore.getState().toggleBoxSelectMode();
    expect(useCanvasStore.getState().isBoxSelectMode).toBe(true);
  });

  it('clearSelection resets all selected IDs', () => {
    useCanvasStore.getState().toggleNodeSelection('node_1');
    useCanvasStore.getState().toggleEdgeSelection('edge_1');
    useCanvasStore.getState().clearSelection();
    expect(useCanvasStore.getState().selectedNodeIds).toHaveLength(0);
    expect(useCanvasStore.getState().selectedEdgeIds).toHaveLength(0);
  });
});
