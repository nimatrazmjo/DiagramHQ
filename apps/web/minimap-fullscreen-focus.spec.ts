import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { Node } from '@xyflow/react';
import { useCanvasStore } from './lib/canvas-store';
import {
  InfiniteCanvas,
  getMiniMapNodeColor,
} from './components/canvas';

describe('F017 — Minimap, Fullscreen, and Focus Mode', () => {
  beforeEach(() => {
    useCanvasStore.getState().clearSelection();
    useCanvasStore.getState().setMinimapVisible(true);
    useCanvasStore.getState().setIsFullscreen(false);
    useCanvasStore.getState().setIsFocusMode(false);
  });

  describe('1. useCanvasStore UI state (Layer Boundaries Rule 4)', () => {
    it('manages isMinimapVisible state with toggle and setter', () => {
      expect(useCanvasStore.getState().isMinimapVisible).toBe(true);

      useCanvasStore.getState().toggleMinimap();
      expect(useCanvasStore.getState().isMinimapVisible).toBe(false);

      useCanvasStore.getState().setMinimapVisible(true);
      expect(useCanvasStore.getState().isMinimapVisible).toBe(true);
    });

    it('manages isFullscreen state with toggle and setter', () => {
      expect(useCanvasStore.getState().isFullscreen).toBe(false);

      useCanvasStore.getState().toggleFullscreen();
      expect(useCanvasStore.getState().isFullscreen).toBe(true);

      useCanvasStore.getState().setIsFullscreen(false);
      expect(useCanvasStore.getState().isFullscreen).toBe(false);
    });

    it('manages isFocusMode state with toggle and setter', () => {
      expect(useCanvasStore.getState().isFocusMode).toBe(false);

      useCanvasStore.getState().toggleFocusMode();
      expect(useCanvasStore.getState().isFocusMode).toBe(true);

      useCanvasStore.getState().setIsFocusMode(false);
      expect(useCanvasStore.getState().isFocusMode).toBe(false);
    });

    it('conforms strictly to Layer Boundaries Rule 4: zero domain entities', () => {
      const state = useCanvasStore.getState();
      const forbiddenKeys = [
        'objects',
        'connections',
        'views',
        'viewObjects',
        'models',
        'architectures',
        'nodes',
        'edges',
      ];
      for (const key of forbiddenKeys) {
        expect(state).not.toHaveProperty(key);
      }
    });
  });

  describe('2. getMiniMapNodeColor helper', () => {
    it('highlights selected nodes in vibrant blue regardless of type', () => {
      const selectedNode: Node = {
        id: 'node-sys',
        type: 'system',
        selected: true,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(getMiniMapNodeColor(selectedNode)).toBe('#60a5fa');
    });

    it('colors unselected nodes by category', () => {
      const makeNode = (type: string): Node => ({
        id: 'n',
        type,
        position: { x: 0, y: 0 },
        data: {},
      });

      expect(getMiniMapNodeColor(makeNode('system'))).toBe('#818cf8');
      expect(getMiniMapNodeColor(makeNode('app'))).toBe('#38bdf8');
      expect(getMiniMapNodeColor(makeNode('container'))).toBe('#38bdf8');
      expect(getMiniMapNodeColor(makeNode('store'))).toBe('#34d399');
      expect(getMiniMapNodeColor(makeNode('database'))).toBe('#34d399');
      expect(getMiniMapNodeColor(makeNode('component'))).toBe('#fbbf24');
      expect(getMiniMapNodeColor(makeNode('person'))).toBe('#f472b6');
      expect(getMiniMapNodeColor(makeNode('custom-unknown'))).toBe('#64748b');
    });
  });

  describe('3. InfiniteCanvas toolbar & Minimap UI rendering', () => {
    it('renders toggle-minimap-btn, fullscreen-btn, and focus-mode-btn in toolbar', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [] }),
      );

      expect(html).toContain('data-testid="toggle-minimap-btn"');
      expect(html).toContain('data-testid="fullscreen-btn"');
      expect(html).toContain('data-testid="focus-mode-btn"');
    });

    it('renders minimap container when isMinimapVisible is true', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [], isMinimapVisible: true }),
      );

      expect(html).toContain('data-testid="minimap"');
    });

    it('does not render minimap container when isMinimapVisible is false', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [], isMinimapVisible: false }),
      );

      expect(html).not.toContain('data-testid="minimap"');
    });

    it('renders focus-mode-badge when isFocusMode is true', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [], isFocusMode: true }),
      );

      expect(html).toContain('data-testid="focus-mode-badge"');
      expect(html).toContain('FOCUS MODE');
    });

    it('does not render focus-mode-badge when isFocusMode is false', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, { initialNodes: [], initialEdges: [], isFocusMode: false }),
      );

      expect(html).not.toContain('data-testid="focus-mode-badge"');
    });

    it('displays isolated count in badge when nodes are selected in focus mode', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [
            { id: 'a', type: 'system', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
            { id: 'b', type: 'system', position: { x: 100, y: 0 }, data: { label: 'Node B' } },
          ],
          initialEdges: [],
          isFocusMode: true,
          selectedNodeIds: ['a'],
        }),
      );

      expect(html).toContain('data-testid="focus-mode-badge"');
      expect(html).toContain('1 ISOLATED');
    });
  });
});
