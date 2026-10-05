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

  describe('5. F136 — Honest surface: gate simulated features', () => {
    it('studio renders with 0 unlabelled preview controls', () => {
      const html = renderToString(React.createElement(StudioPage));

      // Each simulated feature must be wrapped with data-preview="true"
      // and display the consistent "Preview — not saved" badge
      const simulatedKeys = [
        'branches',
        'presence',
        'versionHistory',
        'visualDiff',
        'pullRequests',
        'comments',
        'aiCopilot',
        'aiGeneration',
        'aiReview',
        'aiAdr',
      ];

      for (const feature of simulatedKeys) {
        expect(html).toContain(`data-preview-feature="${feature}"`);
        expect(html).toContain(`data-feature="${feature}"`);
      }

      // Count the preview badges rendered in default view
      const badgeOccurrences = (html.match(/data-testid="preview-badge"/g) || []).length;
      expect(badgeOccurrences).toBe(simulatedKeys.length);

      // Verify that every data-preview control has a corresponding badge
      const previewContainers = (html.match(/data-preview="true"/g) || []).length;
      expect(previewContainers).toBe(simulatedKeys.length);

      // Unlabelled simulated controls = 0
      const unlabelledSimulatedControls = previewContainers - badgeOccurrences;
      expect(unlabelledSimulatedControls).toBe(0);
    });

    it('a preview control shows the badge', () => {
      const html = renderToString(React.createElement(StudioPage));

      // The badge text must be consistently "Preview — not saved"
      expect(html).toContain('data-testid="preview-badge"');
      expect(html).toContain('Preview — not saved');

      // Specifically check simulated controls carry the badge and tooltip
      expect(html).toContain('title="Toggle AI Architecture Copilot (Preview — not saved)"');
      expect(html).toContain('title="Toggle Version History &amp; Snapshots (Preview — not saved)"');
      expect(html).toContain('title="Toggle Architecture Visual Diff (Preview — not saved)"');
      expect(html).toContain('title="Toggle Architecture Comments (Preview — not saved)"');
    });

    it('a real control (add object) still works', async () => {
      const html = renderToString(React.createElement(StudioPage));

      // Real controls are NOT wrapped with data-preview or preview badges
      expect(html).toContain('data-testid="shape-palette"');
      expect(html).toContain('data-testid="add-system-btn"');
      expect(html).toContain('data-testid="toggle-export-btn"');
      expect(html).toContain('data-testid="toggle-share-link-btn"');
      expect(html).toContain('data-testid="autosave-status"');
      expect(html).toContain('Inspector');

      // Verify real controls do not carry preview attributes
      expect(html).not.toContain('data-preview-feature="add"');
      expect(html).not.toContain('data-preview-feature="export"');
      expect(html).not.toContain('data-preview-feature="inspector"');

      // Verify that creating a node (real control: add object) executes cleanly
      const newNode: CanvasNode = {
        id: 'real-node-1',
        type: 'application',
        position: { x: 300, y: 300 },
        data: { label: 'Real Microservice', kind: 'application' },
      };

      const cmd = new CreateNodeCommand({ node: newNode });
      const created = await defaultCommandDispatcher.dispatch(cmd);
      expect(created).toEqual(newNode);

      // Verify command is in undo stack
      expect(defaultCommandDispatcher.canUndo()).toBe(true);
      await defaultCommandDispatcher.undo();
      expect(defaultCommandDispatcher.canRedo()).toBe(true);
    });
  });
});

