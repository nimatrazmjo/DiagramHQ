import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ShapePalette } from './components/canvas/shape-palette';
import { InfiniteCanvas } from './components/canvas/infinite-canvas';
import { defaultCommandDispatcher, ConnectNodesCommand, CreateNodeCommand, DeleteNodeCommand } from './lib/commands';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';
import StudioPage from './app/studio/page';

describe('Studio & Interactive Canvas Drawing (Phase 0 / Guest Mode)', () => {
  describe('1. ShapePalette Component', () => {
    it('renders all shape creation buttons and template trigger', () => {
      const onAddShape = vi.fn();
      const onOpenTemplates = vi.fn();
      const onDeleteSelected = vi.fn();

      const html = renderToString(
        React.createElement(ShapePalette, {
          onAddShape,
          onOpenTemplates,
          onDeleteSelected,
          hasSelection: true,
        }),
      );

      expect(html).toContain('data-testid="shape-palette"');
      expect(html).toContain('data-testid="add-system-btn"');
      expect(html).toContain('data-testid="add-application-btn"');
      expect(html).toContain('data-testid="add-database-btn"');
      expect(html).toContain('data-testid="add-queue-btn"');
      expect(html).toContain('data-testid="add-person-btn"');
      expect(html).toContain('data-testid="add-component-btn"');
      expect(html).toContain('data-testid="add-group-btn"');
      expect(html).toContain('data-testid="open-templates-btn"');
      expect(html).toContain('data-testid="delete-selected-btn"');
    });

    it('hides delete button when there is no selection', () => {
      const html = renderToString(
        React.createElement(ShapePalette, {
          onAddShape: vi.fn(),
          hasSelection: false,
        }),
      );

      expect(html).toContain('data-testid="shape-palette"');
      expect(html).not.toContain('data-testid="delete-selected-btn"');
    });
  });

  describe('2. Interactive Commands (Create, Connect, Delete)', () => {
    it('executes and dispatches CreateNodeCommand cleanly', async () => {
      const testNode: CanvasNode = {
        id: 'sys-test-1',
        type: 'system',
        position: { x: 100, y: 150 },
        data: { label: 'New Test System', kind: 'system' },
      };

      const cmd = new CreateNodeCommand({
        node: testNode,
      });

      const result = await defaultCommandDispatcher.dispatch(cmd);
      expect(result).toEqual(testNode);
      expect(defaultCommandDispatcher.canUndo()).toBe(true);

      const undoResult = await defaultCommandDispatcher.undo();
      expect(undoResult).toBe(cmd);
      expect(defaultCommandDispatcher.canRedo()).toBe(true);
    });

    it('executes and dispatches ConnectNodesCommand cleanly', async () => {
      const testEdge: CanvasEdge = {
        id: 'conn-test-1',
        source: 'app-1',
        target: 'db-1',
        type: 'smoothstep',
        label: 'reads/writes',
      };

      const cmd = new ConnectNodesCommand({
        edge: testEdge,
      });

      const result = await defaultCommandDispatcher.dispatch(cmd);
      expect(result).toEqual(testEdge);

      const undoResult = await defaultCommandDispatcher.undo();
      expect(undoResult).toBe(cmd);
      expect(defaultCommandDispatcher.canRedo()).toBe(true);
    });

    it('executes DeleteNodeCommand and handles undo/redo', async () => {
      const testNode: CanvasNode = {
        id: 'node-to-delete',
        type: 'application',
        position: { x: 50, y: 50 },
        data: { label: 'Service To Delete' },
      };
      const connectedEdge: CanvasEdge = {
        id: 'edge-to-delete',
        source: 'node-to-delete',
        target: 'target-node',
        type: 'smoothstep',
      };

      const cmd = new DeleteNodeCommand({
        node: testNode,
        connectedEdges: [connectedEdge],
      });

      const result = await defaultCommandDispatcher.dispatch(cmd);
      expect(result).toEqual({ nodeId: 'node-to-delete' });

      const undoResult = await defaultCommandDispatcher.undo();
      expect(undoResult).toBe(cmd);
      expect(defaultCommandDispatcher.canRedo()).toBe(true);
    });
  });

  describe('3. InfiniteCanvas with ShapePalette integration', () => {
    it('renders InfiniteCanvas with shape palette in top-center panel', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [],
          initialEdges: [],
          showPalette: true,
        }),
      );

      expect(html).toContain('data-testid="infinite-canvas-container"');
      expect(html).toContain('data-testid="shape-palette"');
      expect(html).toContain('data-testid="add-system-btn"');
    });
  });

  describe('4. Studio Page (app/studio/page.tsx)', () => {
    it('renders studio layout with header, filters, and inspector', () => {
      const html = renderToString(React.createElement(StudioPage));

      expect(html).toContain('DiagramHQ');
      expect(html).toContain('Phase 0 Studio (Guest Mode)');
      expect(html).toContain('View:');
      expect(html).toContain('Persona:');
      expect(html).toContain('Export JSON');
      expect(html).toContain('Import JSON');
      expect(html).toContain('data-testid="infinite-canvas-container"');
      expect(html).toContain('data-testid="inspector-panel"');
    });
  });
});
