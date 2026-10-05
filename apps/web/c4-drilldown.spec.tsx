import { describe, it, expect } from 'vitest';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';
import {
  getNodeC4Level,
  filterNodesByC4Level,
  filterEdgesByVisibleNodes,
} from './lib/c4-hierarchy';

describe('F142 — Real C4 Drill-Down and Containment Navigation', () => {
  // Test fixture representing 3-level containment hierarchy
  const testNodes: CanvasNode[] = [
    // Level 1: System Context
    {
      id: 'sys-saas',
      type: 'system',
      position: { x: 420, y: 180 },
      data: { label: 'SaaS Platform', kind: 'system', c4Level: 1, canDrillDown: true },
    },
    {
      id: 'actor-user',
      type: 'person',
      position: { x: 80, y: 180 },
      data: { label: 'End User', kind: 'actor', c4Level: 1 },
    },
    {
      id: 'sys-email',
      type: 'system',
      position: { x: 780, y: 100 },
      data: { label: 'Email Gateway', kind: 'system', c4Level: 1, external: true },
    },

    // Level 2: Containers of sys-saas
    {
      id: 'app-web',
      type: 'app',
      position: { x: 80, y: 140 },
      data: { label: 'Web Application', kind: 'application', c4Level: 2, parentId: 'sys-saas' },
    },
    {
      id: 'app-api',
      type: 'app',
      position: { x: 380, y: 140 },
      data: { label: 'API Gateway', kind: 'application', c4Level: 2, parentId: 'sys-saas' },
    },
    {
      id: 'app-auth',
      type: 'app',
      position: { x: 680, y: 80 },
      data: {
        label: 'Auth Service',
        kind: 'application',
        c4Level: 2,
        parentId: 'sys-saas',
        canDrillToComponents: true,
      },
    },
    {
      id: 'store-db',
      type: 'store',
      position: { x: 680, y: 240 },
      data: { label: 'Primary DB', kind: 'store', c4Level: 2, parentId: 'sys-saas' },
    },

    // Level 3: Components of app-auth
    {
      id: 'cmp-jwt',
      type: 'component',
      position: { x: 100, y: 100 },
      data: { label: 'JWT Service', kind: 'component', c4Level: 3, parentId: 'app-auth' },
    },
    {
      id: 'cmp-repo',
      type: 'component',
      position: { x: 350, y: 100 },
      data: { label: 'User Repo', kind: 'component', c4Level: 3, parentId: 'app-auth' },
    },
  ];

  const testEdges: CanvasEdge[] = [
    // L1 edges
    { id: 'e-1', source: 'actor-user', target: 'sys-saas', type: 'icepanel' },
    { id: 'e-2', source: 'sys-saas', target: 'sys-email', type: 'icepanel' },
    // L2 edges
    { id: 'e-3', source: 'app-web', target: 'app-api', type: 'icepanel' },
    { id: 'e-4', source: 'app-api', target: 'app-auth', type: 'icepanel' },
    { id: 'e-5', source: 'app-auth', target: 'store-db', type: 'icepanel' },
    // L3 edges
    { id: 'e-6', source: 'cmp-jwt', target: 'cmp-repo', type: 'icepanel' },
  ];

  describe('1. Level Resolution (getNodeC4Level)', () => {
    it('resolves explicit c4Level data correctly', () => {
      expect(getNodeC4Level(testNodes[0]!)).toBe(1);
      expect(getNodeC4Level(testNodes[3]!)).toBe(2);
      expect(getNodeC4Level(testNodes[7]!)).toBe(3);
    });

    it('infers c4Level from kind when c4Level is omitted', () => {
      const systemNode: CanvasNode = {
        id: 's1',
        type: 'system',
        position: { x: 0, y: 0 },
        data: { label: 'Payment System', kind: 'system' },
      };
      const appNode: CanvasNode = {
        id: 'a1',
        type: 'app',
        position: { x: 0, y: 0 },
        data: { label: 'Payment Service', kind: 'application' },
      };
      const cmpNode: CanvasNode = {
        id: 'c1',
        type: 'component',
        position: { x: 0, y: 0 },
        data: { label: 'Card Validator', kind: 'component' },
      };

      expect(getNodeC4Level(systemNode)).toBe(1);
      expect(getNodeC4Level(appNode)).toBe(2);
      expect(getNodeC4Level(cmpNode)).toBe(3);
    });
  });

  describe('2. Containment Filtering (filterNodesByC4Level)', () => {
    it('at Level 1, only systems and actors show (no containers or components)', () => {
      const l1Nodes = filterNodesByC4Level(testNodes, 1, null);
      expect(l1Nodes).toHaveLength(3);
      expect(l1Nodes.map((n) => n.id)).toEqual(['sys-saas', 'actor-user', 'sys-email']);
      expect(l1Nodes.every((n) => getNodeC4Level(n) === 1)).toBe(true);
    });

    it('at Level 2 with parentId sys-saas, reveals its child containers', () => {
      const l2Nodes = filterNodesByC4Level(testNodes, 2, 'sys-saas');
      expect(l2Nodes).toHaveLength(4);
      expect(l2Nodes.map((n) => n.id)).toEqual(['app-web', 'app-api', 'app-auth', 'store-db']);
      expect(l2Nodes.every((n) => n.data?.parentId === 'sys-saas')).toBe(true);
    });

    it('at Level 3 with parentId app-auth, reveals its internal components', () => {
      const l3Nodes = filterNodesByC4Level(testNodes, 3, 'app-auth');
      expect(l3Nodes).toHaveLength(2);
      expect(l3Nodes.map((n) => n.id)).toEqual(['cmp-jwt', 'cmp-repo']);
      expect(l3Nodes.every((n) => n.data?.parentId === 'app-auth')).toBe(true);
    });

    it('degrades gracefully to empty array when object has no children', () => {
      const emptyChildNodes = filterNodesByC4Level(testNodes, 3, 'store-db');
      expect(emptyChildNodes).toHaveLength(0);
    });
  });

  describe('3. Edge Visibility across Levels (filterEdgesByVisibleNodes)', () => {
    it('at Level 1, returns only L1 edges', () => {
      const l1Nodes = filterNodesByC4Level(testNodes, 1, null);
      const l1Ids = new Set(l1Nodes.map((n) => n.id));
      const l1Edges = filterEdgesByVisibleNodes(testEdges, l1Ids);

      expect(l1Edges.map((e) => e.id)).toEqual(['e-1', 'e-2']);
    });

    it('at Level 2, returns only L2 container edges', () => {
      const l2Nodes = filterNodesByC4Level(testNodes, 2, 'sys-saas');
      const l2Ids = new Set(l2Nodes.map((n) => n.id));
      const l2Edges = filterEdgesByVisibleNodes(testEdges, l2Ids);

      expect(l2Edges.map((e) => e.id)).toEqual(['e-3', 'e-4', 'e-5']);
    });

    it('at Level 3, returns only L3 component edges', () => {
      const l3Nodes = filterNodesByC4Level(testNodes, 3, 'app-auth');
      const l3Ids = new Set(l3Nodes.map((n) => n.id));
      const l3Edges = filterEdgesByVisibleNodes(testEdges, l3Ids);

      expect(l3Edges.map((e) => e.id)).toEqual(['e-6']);
    });
  });

  describe('4. Studio Page Drill-Down Affordances & Graceful Empty State', () => {
    it('contains test IDs for breadcrumbs, c4 tabs, and empty state handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const studioPath = path.resolve(__dirname, 'app/studio/page.tsx');
      const content = fs.readFileSync(studioPath, 'utf8');

      // C4 level navigation tabs
      expect(content).toContain('data-testid="c4-level-1-btn"');
      expect(content).toContain('data-testid="c4-level-2-btn"');
      expect(content).toContain('data-testid="c4-level-3-btn"');

      // Breadcrumb elements
      expect(content).toContain('data-testid="studio-breadcrumb"');
      expect(content).toContain('data-testid="breadcrumb-root"');
      expect(content).toContain('data-testid="breadcrumb-l1"');
      expect(content).toContain('data-testid="studio-breadcrumb-level"');

      // Graceful empty state when no children
      expect(content).toContain('data-testid="drill-empty-notice"');
      expect(content).toContain('data-testid="drill-ascend-btn"');
      expect(content).toContain('onDrillIn={handleDrillIn}');
    });

    it('verifies InfiniteCanvas forwards drill-in on double-click', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const canvasPath = path.resolve(__dirname, 'components/canvas/infinite-canvas.tsx');
      const content = fs.readFileSync(canvasPath, 'utf8');

      expect(content).toContain('onDrillIn?: (nodeId: string) => void');
      expect(content).toContain('onDrillIn && (isSystem || isDrillableContainer)');
      expect(content).toContain('onDrillIn(node.id)');
    });
  });
});
