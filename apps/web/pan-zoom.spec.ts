import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  useCanvasStore,
  clampZoom,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './lib/canvas-store';
import { ReactFlowCanvasRenderer } from './components/canvas/canvas-renderer';
import { InfiniteCanvas } from './components/canvas/infinite-canvas';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

describe('F010 — Pan and Zoom', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      viewport: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
      selectedNodeIds: [],
      selectedEdgeIds: [],
      hoveredNodeId: null,
      isSpacePanning: false,
    });
    vi.clearAllMocks();
  });

  describe('1. Canvas Store Pan & Zoom State', () => {
    it('clampZoom restricts zoom between MIN_ZOOM (0.1) and MAX_ZOOM (4.0)', () => {
      expect(clampZoom(0.01)).toBe(MIN_ZOOM);
      expect(clampZoom(10)).toBe(MAX_ZOOM);
      expect(clampZoom(1.5)).toBe(1.5);
    });

    it('setViewport clamps the zoom level within min and max boundaries', () => {
      useCanvasStore.getState().setViewport({ x: 100, y: 200, zoom: 0.05 });
      expect(useCanvasStore.getState().viewport.zoom).toBe(MIN_ZOOM);

      useCanvasStore.getState().setViewport({ x: 100, y: 200, zoom: 5.5 });
      expect(useCanvasStore.getState().viewport.zoom).toBe(MAX_ZOOM);
    });

    it('zoomIn increments zoom by step and clamps at MAX_ZOOM', () => {
      useCanvasStore.getState().zoomIn(0.5);
      expect(useCanvasStore.getState().viewport.zoom).toBe(1.5);

      useCanvasStore.getState().zoomIn(5.0);
      expect(useCanvasStore.getState().viewport.zoom).toBe(MAX_ZOOM);
    });

    it('zoomOut decrements zoom by step and clamps at MIN_ZOOM', () => {
      useCanvasStore.getState().zoomOut(0.4);
      expect(useCanvasStore.getState().viewport.zoom).toBe(0.6);

      useCanvasStore.getState().zoomOut(2.0);
      expect(useCanvasStore.getState().viewport.zoom).toBe(MIN_ZOOM);
    });

    it('resetZoom resets zoom to DEFAULT_ZOOM (1.0)', () => {
      useCanvasStore.getState().setViewport({ x: 50, y: 50, zoom: 2.8 });
      useCanvasStore.getState().resetZoom();
      expect(useCanvasStore.getState().viewport.zoom).toBe(DEFAULT_ZOOM);
    });

    it('setIsSpacePanning updates space pan status without touching domain data', () => {
      expect(useCanvasStore.getState().isSpacePanning).toBe(false);
      useCanvasStore.getState().setIsSpacePanning(true);
      expect(useCanvasStore.getState().isSpacePanning).toBe(true);
      useCanvasStore.getState().setIsSpacePanning(false);
      expect(useCanvasStore.getState().isSpacePanning).toBe(false);
    });
  });

  describe('2. CanvasRenderer Viewport & Pan/Zoom Contract', () => {
    it('sets and retrieves viewport accurately', () => {
      const renderer = new ReactFlowCanvasRenderer();
      const div = {} as HTMLElement;
      renderer.mount(div);

      const targetViewport = { x: 300, y: -150, zoom: 1.75 };
      renderer.setViewport(targetViewport);

      expect(renderer.getViewport()).toEqual(targetViewport);
      renderer.unmount();
    });

    it('delegates fitView to bridge when attached', () => {
      const renderer = new ReactFlowCanvasRenderer();
      const mockBridgeFitView = vi.fn();
      renderer.attachBridge({ fitView: mockBridgeFitView });

      renderer.fitView();
      expect(mockBridgeFitView).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. InfiniteCanvas Pan & Zoom Component Rendering', () => {
    const sampleNodes: CanvasNode[] = [
      {
        id: 'sys_1',
        type: 'system',
        position: { x: 100, y: 100 },
        data: { label: 'Core System' },
      },
    ];
    const sampleEdges: CanvasEdge[] = [];

    it('renders pan-zoom toolbar with zoom controls and fit button', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
        })
      );

      expect(html).toContain('data-testid="pan-zoom-toolbar"');
      expect(html).toContain('data-testid="zoom-in-btn"');
      expect(html).toContain('data-testid="zoom-out-btn"');
      expect(html).toContain('data-testid="reset-zoom-btn"');
      expect(html).toContain('data-testid="fit-view-btn"');
      expect(html).toContain('Fit (F)');
    });

    it('renders pan mode indicator when space-panning is active', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: sampleNodes,
          initialEdges: sampleEdges,
          isSpacePanning: true,
        })
      );

      expect(html).toContain('data-testid="pan-mode-indicator"');
      expect(html).toContain('PAN MODE (SPACE)');
    });
  });
});
