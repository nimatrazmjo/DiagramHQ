import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import nextConfig from './next.config.mjs';
import WorkspaceOverviewPage from './app/workspace/[workspaceId]/page';
import SystemsPage from './app/workspace/[workspaceId]/systems/page';
import DataPage from './app/workspace/[workspaceId]/data/page';
import AppsPage from './app/workspace/[workspaceId]/apps/page';
import ViewsPage from './app/workspace/[workspaceId]/views/page';
import { InfiniteCanvas } from './components/canvas/infinite-canvas';

describe('F141 — Unify to One Canvas Architecture', () => {
  describe('1. Single Canvas Editor Invariant (Grep & Route Invariants)', () => {
    it('confirms the hand-rolled SVG canvas has been deleted', () => {
      const oldCanvasPagePath = path.resolve(__dirname, 'app/canvas/[workspaceId]/[diagramId]/page.tsx');
      expect(fs.existsSync(oldCanvasPagePath)).toBe(false);

      const oldCanvasDirPath = path.resolve(__dirname, 'app/canvas');
      expect(fs.existsSync(oldCanvasDirPath)).toBe(false);
    });

    it('verifies next.config.mjs redirects old /canvas/* paths to /studio', async () => {
      expect(nextConfig.redirects).toBeDefined();
      if (nextConfig.redirects) {
        const redirects = await nextConfig.redirects();
        const canvasRedirect = redirects.find((r: { source: string }) => r.source === '/canvas/:path*');
        expect(canvasRedirect).toBeDefined();
        expect(canvasRedirect?.destination).toBe('/studio');
      }
    });

    it('verifies all workspace sub-pages route canvas links to /studio', () => {
      const workspaceId = 'ws-test-456';

      const systemsHtml = renderToString(React.createElement(SystemsPage, { params: { workspaceId } }));
      expect(systemsHtml).not.toContain(`/canvas/${workspaceId}`);
      expect(systemsHtml).toContain('href="/studio"');

      const dataHtml = renderToString(React.createElement(DataPage, { params: { workspaceId } }));
      expect(dataHtml).not.toContain(`/canvas/${workspaceId}`);
      expect(dataHtml).toContain('href="/studio"');

      const appsHtml = renderToString(React.createElement(AppsPage, { params: { workspaceId } }));
      expect(appsHtml).not.toContain(`/canvas/${workspaceId}`);
      expect(appsHtml).toContain('href="/studio"');

      const viewsHtml = renderToString(React.createElement(ViewsPage, { params: { workspaceId } }));
      expect(viewsHtml).not.toContain(`/canvas/${workspaceId}`);
      expect(viewsHtml).toContain('/studio?viewId=');
    });
  });

  describe('2. Workspace Route Renders Unified Editor', () => {
    it('renders WorkspaceOverviewPage with the unified InfiniteCanvas and palette', () => {
      const workspaceId = 'ws-test-123';
      const html = renderToString(React.createElement(WorkspaceOverviewPage, { params: { workspaceId } }));

      // Renders workspace header and canvas container
      expect(html).toContain('Workspace Overview');
      expect(html).toContain('Interactive Canvas');
      expect(html).toContain('React Flow Renderer · Pure Model Projection');

      // Contains the unified InfiniteCanvas controls
      expect(html).toContain('data-testid="pan-zoom-toolbar"');
      expect(html).toContain('data-testid="shape-palette"');
    });
  });

  describe('3. Control Clusters & No Panel Overlap at 400px Phone Width', () => {
    it('has dropped React Flow native Controls to prevent bottom-left collision', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [
            { id: 'n1', type: 'system', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
            { id: 'n2', type: 'app', position: { x: 200, y: 0 }, data: { label: 'Node 2' } },
          ],
          initialEdges: [],
        })
      );

      // React Flow native Controls component renders with class 'react-flow__controls'
      expect(html).not.toContain('react-flow__controls');
    });

    it('renders single zoom cluster in bottom-right panel and layout menu in bottom-left panel', () => {
      const html = renderToString(
        React.createElement(InfiniteCanvas, {
          initialNodes: [
            { id: 'n1', type: 'system', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
            { id: 'n2', type: 'app', position: { x: 200, y: 0 }, data: { label: 'Node 2' } },
          ],
          initialEdges: [],
        })
      );

      // Layout menu has dedicated bottom-left corner
      expect(html).toContain('data-testid="layout-menu"');

      // Unified pan-zoom toolbar has dedicated bottom-right corner
      expect(html).toContain('data-testid="pan-zoom-toolbar"');
      expect(html).toContain('data-testid="zoom-in-btn"');
      expect(html).toContain('data-testid="zoom-out-btn"');
      expect(html).toContain('data-testid="fit-view-btn"');

      // Responsive constraints ensuring no panel overlap at 400px width:
      // Toolbar is constrained to max-w-[calc(100vw-110px)] so it never collides with bottom-left
      expect(html).toContain('max-w-[calc(100vw-110px)]');
    });
  });
});
