import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { applyLayout, type LayoutEdge, type LayoutEngineName, type LayoutNode } from '@diagramhq/domain';
import { ApplyLayoutCommand } from './lib/commands/apply-layout-command';
import { CommandDispatcher } from './lib/commands/dispatcher';
import { LayoutMenu } from './components/canvas/layout-menu';

// ----------------------------------------------------------------
// ApplyLayoutCommand unit tests
// ----------------------------------------------------------------
describe('ApplyLayoutCommand', () => {
  const nodes: LayoutNode[] = [
    { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
    { id: 'b', position: { x: 500, y: 500 }, width: 100, height: 50 },
  ];
  const edges: LayoutEdge[] = [{ source: 'a', target: 'b' }];
  const gridPositions = applyLayout(nodes, edges, 'grid');

  it('has name "ApplyLayout"', () => {
    const cmd = new ApplyLayoutCommand({ nodes, positions: gridPositions });
    expect(cmd.name).toBe('ApplyLayout');
  });

  it('has a unique id', () => {
    const cmd1 = new ApplyLayoutCommand({ nodes, positions: gridPositions });
    const cmd2 = new ApplyLayoutCommand({ nodes, positions: gridPositions });
    expect(cmd1.id).not.toBe(cmd2.id);
  });

  it('execute applies the precomputed positions and returns objectId/position pairs', async () => {
    const cmd = new ApplyLayoutCommand({ nodes, positions: gridPositions });
    const result = await cmd.execute();
    expect(result.map((r) => r.objectId)).toEqual(['a', 'b']);
    // Grid layout with 2 nodes and default columns = ceil(sqrt(2)) = 2 -> both in row 0.
    expect(result[0]!.position).toEqual({ x: 0, y: 0 });
    expect(result[1]!.position.x).toBeGreaterThan(0);
  });

  it('does not recompute the layout — it only ever returns the positions it was given', async () => {
    const customPositions = [{ x: 111, y: 222 }, { x: 333, y: 444 }];
    const cmd = new ApplyLayoutCommand({ nodes, positions: customPositions });
    const result = await cmd.execute();
    expect(result).toEqual([
      { objectId: 'a', position: { x: 111, y: 222 } },
      { objectId: 'b', position: { x: 333, y: 444 } },
    ]);
  });

  it('undo restores original positions', async () => {
    const cmd = new ApplyLayoutCommand({ nodes, positions: gridPositions });
    await cmd.execute();
    const result = await cmd.undo();
    expect(result).toEqual([
      { objectId: 'a', position: { x: 0, y: 0 } },
      { objectId: 'b', position: { x: 500, y: 500 } },
    ]);
  });

  it('execute calls persistFn with new positions when viewId is set', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new ApplyLayoutCommand({ viewId: 'vw_1', nodes, positions: gridPositions, persistFn });
    const result = await cmd.execute();
    expect(persistFn).toHaveBeenCalledWith(
      'vw_1',
      result.map((r) => ({ objectId: r.objectId, x: r.position.x, y: r.position.y })),
    );
  });

  it('does NOT call persistFn when viewId is absent', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const cmd = new ApplyLayoutCommand({ nodes, positions: gridPositions, persistFn });
    await cmd.execute();
    expect(persistFn).not.toHaveBeenCalled();
  });

  it('supports positions computed by every registered engine without throwing', async () => {
    const engineNames: LayoutEngineName[] = [
      'grid',
      'radial',
      'forceDirected',
      'hierarchical',
      'tree',
      'layered',
      'LR',
      'TB',
    ];
    for (const engine of engineNames) {
      const positions = applyLayout(nodes, edges, engine);
      const cmd = new ApplyLayoutCommand({ nodes, positions });
      await expect(cmd.execute()).resolves.toHaveLength(2);
    }
  });
});

// ----------------------------------------------------------------
// CommandDispatcher undo/redo with ApplyLayoutCommand
// ----------------------------------------------------------------
describe('CommandDispatcher with ApplyLayoutCommand', () => {
  it('records ApplyLayoutCommand in history after dispatch', async () => {
    const dispatcher = new CommandDispatcher();
    const nodes: LayoutNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 40, y: 40 } },
    ];
    const cmd = new ApplyLayoutCommand({ nodes, positions: applyLayout(nodes, [], 'grid') });
    await dispatcher.dispatch(cmd);
    expect(dispatcher.getHistory()).toHaveLength(1);
    expect(dispatcher.getHistory()[0]!.name).toBe('ApplyLayout');
  });

  it('undo via dispatcher restores previous positions and persists them', async () => {
    const persistFn = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new CommandDispatcher();
    const nodes: LayoutNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 40, y: 40 } },
    ];
    const cmd = new ApplyLayoutCommand({
      viewId: 'vw_x',
      nodes,
      positions: applyLayout(nodes, [], 'grid'),
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
// LayoutMenu component
// ----------------------------------------------------------------
describe('LayoutMenu', () => {
  const noop = () => {};
  const engines: LayoutEngineName[] = ['grid', 'radial', 'forceDirected', 'hierarchical', 'tree', 'layered', 'LR', 'TB'];

  it('renders the toggle button collapsed by default', () => {
    const html = renderToString(React.createElement(LayoutMenu, { engines, onApply: noop }));
    expect(html).toContain('data-testid="layout-menu-toggle"');
    expect(html).not.toContain('data-testid="layout-menu-list"');
  });

  it('disables the toggle when `disabled` is set', () => {
    const html = renderToString(React.createElement(LayoutMenu, { engines, onApply: noop, disabled: true }));
    expect(html).toMatch(/data-testid="layout-menu-toggle"[^>]*disabled/);
  });
});
