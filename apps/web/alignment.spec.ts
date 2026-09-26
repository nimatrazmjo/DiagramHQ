import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { Node } from '@xyflow/react';
import type { AlignableNode } from '@diagramhq/domain';
import { AlignNodesCommand, type AlignOperation } from './lib/commands/align-nodes-command';
import { CommandDispatcher } from './lib/commands/dispatcher';
import { useCanvasStore } from './lib/canvas-store';
import { AlignmentToolbar } from './components/canvas/alignment-toolbar';
import { toAlignableNode, snapGroupPositions } from './components/canvas/infinite-canvas';

// ----------------------------------------------------------------
// AlignNodesCommand unit tests
// ----------------------------------------------------------------
describe('AlignNodesCommand', () => {
  const nodes: AlignableNode[] = [
    { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
    { id: 'b', position: { x: 200, y: 300 }, width: 50, height: 100 },
  ];

  it('has name "AlignNodes"', () => {
    const cmd = new AlignNodesCommand({ nodes, operation: { type: 'align', axis: 'left' } });
    expect(cmd.name).toBe('AlignNodes');
  });

  it('has a unique id', () => {
    const op: AlignOperation = { type: 'align', axis: 'left' };
    const cmd1 = new AlignNodesCommand({ nodes, operation: op });
    const cmd2 = new AlignNodesCommand({ nodes, operation: op });
    expect(cmd1.id).not.toBe(cmd2.id);
  });

  it('execute aligns nodes left and returns objectId/position pairs', async () => {
    const cmd = new AlignNodesCommand({ nodes, operation: { type: 'align', axis: 'left' } });
    const result = await cmd.execute();
    expect(result).toEqual([
      { objectId: 'a', position: { x: 0, y: 0 } },
      { objectId: 'b', position: { x: 0, y: 300 } },
    ]);
  });

  it('undo restores original positions', async () => {
    const cmd = new AlignNodesCommand({ nodes, operation: { type: 'align', axis: 'left' } });
    await cmd.execute();
    const result = await cmd.undo();
    expect(result).toEqual([
      { objectId: 'a', position: { x: 0, y: 0 } },
      { objectId: 'b', position: { x: 200, y: 300 } },
    ]);
  });

  it('execute calls persistFn with new positions when viewId is set', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new AlignNodesCommand({
      viewId: 'vw_1',
      nodes,
      operation: { type: 'align', axis: 'top' },
      persistFn,
    });
    await cmd.execute();
    expect(persistFn).toHaveBeenCalledWith('vw_1', [
      { objectId: 'a', x: 0, y: 0 },
      { objectId: 'b', x: 200, y: 0 },
    ]);
  });

  it('does NOT call persistFn when viewId is absent', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new AlignNodesCommand({ nodes, operation: { type: 'align', axis: 'left' }, persistFn });
    await cmd.execute();
    expect(persistFn).not.toHaveBeenCalled();
  });

  it('supports the distribute operation', async () => {
    const three: AlignableNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, width: 100 },
      { id: 'b', position: { x: 150, y: 0 }, width: 50 },
      { id: 'c', position: { x: 300, y: 0 }, width: 20 },
    ];
    const cmd = new AlignNodesCommand({
      nodes: three,
      operation: { type: 'distribute', axis: 'horizontal' },
    });
    const result = await cmd.execute();
    expect(result.map((r) => r.objectId)).toEqual(['a', 'b', 'c']);
    expect(result[0]!.position).toEqual({ x: 0, y: 0 });
    expect(result[2]!.position).toEqual({ x: 300, y: 0 });
  });
});

// ----------------------------------------------------------------
// CommandDispatcher undo/redo with AlignNodesCommand
// ----------------------------------------------------------------
describe('CommandDispatcher with AlignNodesCommand', () => {
  it('records AlignNodesCommand in history after dispatch', async () => {
    const dispatcher = new CommandDispatcher();
    const nodes: AlignableNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 40, y: 40 } },
    ];
    const cmd = new AlignNodesCommand({ nodes, operation: { type: 'align', axis: 'left' } });
    await dispatcher.dispatch(cmd);
    expect(dispatcher.getHistory()).toHaveLength(1);
    expect(dispatcher.getHistory()[0]!.name).toBe('AlignNodes');
  });

  it('undo via dispatcher restores previous positions and persists them', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new CommandDispatcher();
    const nodes: AlignableNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 40, y: 40 } },
    ];
    const cmd = new AlignNodesCommand({
      viewId: 'vw_x',
      nodes,
      operation: { type: 'align', axis: 'left' },
      persistFn,
    });
    await dispatcher.dispatch(cmd);
    persistFn.mockClear();
    await dispatcher.undo();
    expect(persistFn).toHaveBeenCalledWith('vw_x', [
      { objectId: 'a', x: 0, y: 0 },
      { objectId: 'b', x: 40, y: 40 },
    ]);
  });
});

// ----------------------------------------------------------------
// toAlignableNode: React Flow measured-size mapping
// ----------------------------------------------------------------
describe('toAlignableNode', () => {
  const baseNode = { id: 'n1', position: { x: 10, y: 20 } } as Node;

  it('prefers auto-measured dimensions over top-level width/height', () => {
    const node = { ...baseNode, width: 999, height: 999, measured: { width: 120, height: 60 } } as Node;
    expect(toAlignableNode(node)).toEqual({
      id: 'n1',
      position: { x: 10, y: 20 },
      width: 120,
      height: 60,
    });
  });

  it('falls back to top-level width/height when unmeasured', () => {
    const node = { ...baseNode, width: 80, height: 40 } as Node;
    expect(toAlignableNode(node)).toEqual({
      id: 'n1',
      position: { x: 10, y: 20 },
      width: 80,
      height: 40,
    });
  });

  it('is undefined for both when neither is present', () => {
    const node = { ...baseNode } as Node;
    expect(toAlignableNode(node)).toEqual({
      id: 'n1',
      position: { x: 10, y: 20 },
      width: undefined,
      height: undefined,
    });
  });
});

// ----------------------------------------------------------------
// snapGroupPositions: rigid-body group snap-to-grid
// ----------------------------------------------------------------
describe('snapGroupPositions', () => {
  it('returns an empty map for no positions', () => {
    expect(snapGroupPositions([]).size).toBe(0);
  });

  it('snaps the anchor (first) node to the grid', () => {
    const result = snapGroupPositions([{ id: 'a', position: { x: 105, y: 8 } }]);
    expect(result.get('a')).toEqual({ x: 100, y: 0 });
  });

  it('preserves relative offsets between grouped nodes (rigid-body snap)', () => {
    // a and b are 10px apart on x; independent per-node snapping would
    // change that gap (105->100, 115->120 = 20px apart). A shared delta
    // derived from the anchor must keep them exactly 10px apart.
    const result = snapGroupPositions([
      { id: 'a', position: { x: 105, y: 0 } },
      { id: 'b', position: { x: 115, y: 0 } },
    ]);
    const a = result.get('a')!;
    const b = result.get('b')!;
    expect(a).toEqual({ x: 100, y: 0 });
    expect(b.x - a.x).toBe(10);
  });

  it('respects a custom grid size', () => {
    const result = snapGroupPositions(
      [{ id: 'a', position: { x: 37, y: 63 } }],
      25,
    );
    expect(result.get('a')).toEqual({ x: 25, y: 75 });
  });
});

// ----------------------------------------------------------------
// Canvas Store: snap-to-grid state
// ----------------------------------------------------------------
describe('useCanvasStore — snap-to-grid state', () => {
  beforeEach(() => {
    useCanvasStore.setState({ isSnapToGridEnabled: false });
  });

  it('isSnapToGridEnabled is false by default', () => {
    expect(useCanvasStore.getState().isSnapToGridEnabled).toBe(false);
  });

  it('toggleSnapToGrid turns snap on', () => {
    useCanvasStore.getState().toggleSnapToGrid();
    expect(useCanvasStore.getState().isSnapToGridEnabled).toBe(true);
  });

  it('toggleSnapToGrid turns snap off when already on', () => {
    useCanvasStore.getState().setSnapToGrid(true);
    useCanvasStore.getState().toggleSnapToGrid();
    expect(useCanvasStore.getState().isSnapToGridEnabled).toBe(false);
  });
});

// ----------------------------------------------------------------
// AlignmentToolbar component
// ----------------------------------------------------------------
describe('AlignmentToolbar', () => {
  const noop = () => {};

  it('renders all 6 align buttons, 2 distribute buttons, and the snap toggle', () => {
    const html = renderToString(
      React.createElement(AlignmentToolbar, {
        onAlign: noop,
        onDistribute: noop,
        canDistribute: true,
        snapEnabled: false,
        onToggleSnap: noop,
      }),
    );

    for (const axis of ['left', 'right', 'top', 'bottom', 'centerH', 'centerV']) {
      expect(html).toContain(`data-testid="align-${axis}-btn"`);
    }
    expect(html).toContain('data-testid="distribute-horizontal-btn"');
    expect(html).toContain('data-testid="distribute-vertical-btn"');
    expect(html).toContain('data-testid="snap-to-grid-btn"');
  });

  it('disables distribute buttons when canDistribute is false', () => {
    const html = renderToString(
      React.createElement(AlignmentToolbar, {
        onAlign: noop,
        onDistribute: noop,
        canDistribute: false,
        snapEnabled: false,
        onToggleSnap: noop,
      }),
    );
    expect(html).toMatch(/data-testid="distribute-horizontal-btn"[^>]*disabled/);
    expect(html).toMatch(/data-testid="distribute-vertical-btn"[^>]*disabled/);
  });

  it('reflects the snap-enabled state visually', () => {
    const enabledHtml = renderToString(
      React.createElement(AlignmentToolbar, {
        onAlign: noop,
        onDistribute: noop,
        canDistribute: true,
        snapEnabled: true,
        onToggleSnap: noop,
      }),
    );
    expect(enabledHtml).toContain('SNAP');
  });
});
