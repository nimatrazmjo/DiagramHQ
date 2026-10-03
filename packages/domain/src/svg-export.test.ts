import { describe, it, expect } from 'vitest';
import {
  renderViewToFidelitySvg,
  calculateSvgEdgePath,
  getNodeKindIconPath,
  escapeSvgText,
  type SvgExportOptions,
} from './svg-export';
import { createId } from './ids';
import type {
  ArchitectureModel,
  View,
  ArchitectureId,
  VersionId,
  WorkspaceId,
  ObjectId,
  ConnectionId,
  ViewId,
  ViewObject,
} from './types';

describe('High-Fidelity SVG Export Engine (F100)', () => {
  const archId = createId('arch') as ArchitectureId;
  const verId = createId('ver') as VersionId;
  const wsId = createId('ws') as unknown as WorkspaceId;

  const coreSystemId = createId('sys') as ObjectId;
  const webAppId = createId('app') as ObjectId;
  const apiGwId = createId('cmp') as ObjectId;
  const ledgerDbId = createId('sto') as ObjectId;
  const customerActorId = createId('act') as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniBank Cloud Architecture',
      description: 'Distributed financial platform and transaction ledger.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v2.4.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: customerActorId,
        architectureId: archId,
        versionId: verId,
        kind: 'actor',
        name: 'Retail Customer',
        description: 'End-user banking client on iOS or Web',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: coreSystemId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'Core Banking Platform',
        description: 'Enclosing core banking system boundary',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'application',
        name: 'Customer Web Portal',
        description: 'Next.js 14 responsive banking dashboard',
        metadata: { technology: 'TypeScript, React, Next.js', owner: 'Frontend Guild' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGwId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'component',
        name: 'Transaction Clearing Engine',
        description: 'High-speed payment settlement service',
        metadata: { technology: 'Go, gRPC', owner: 'Core Platform' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ledgerDbId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'store',
        name: 'Account Ledger Database',
        description: 'ACID double-entry ledger datastore',
        metadata: { technology: 'PostgreSQL 16' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: customerActorId,
        targetObjectId: webAppId,
        kind: 'sync',
        label: 'HTTPS / TLS 1.3',
        description: 'User login and money transfers',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: webAppId,
        targetObjectId: apiGwId,
        kind: 'sync',
        label: 'mTLS gRPC',
        description: 'Dispatches clearing orders',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGwId,
        targetObjectId: ledgerDbId,
        kind: 'async',
        label: 'Event Journal',
        description: 'Persists ledger balance rows',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: createId('viw') as ViewId,
    architectureId: archId,
    name: 'Container Overview View',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewObjects: ViewObject[] = [
    {
      viewId: currentView.id,
      objectId: customerActorId,
      position: { x: 50, y: 150 },
    },
    {
      viewId: currentView.id,
      objectId: webAppId,
      position: { x: 340, y: 150 },
    },
    {
      viewId: currentView.id,
      objectId: apiGwId,
      position: { x: 620, y: 150 },
    },
    {
      viewId: currentView.id,
      objectId: ledgerDbId,
      position: { x: 900, y: 150 },
    },
  ];

  describe('Edge Routing Calculations', () => {
    const srcBox = { x: 100, y: 100, w: 200, h: 100 };
    const tgtBox = { x: 500, y: 250, w: 200, h: 100 };

    it('generates smooth cubic Bezier curved paths by default', () => {
      const { pathD, midX, midY } = calculateSvgEdgePath(srcBox, tgtBox, 'curved');
      expect(pathD.startsWith('M 200 150 C')).toBe(true);
      expect(midX).toBe(400);
      expect(midY).toBe(225);
    });

    it('generates orthogonal stepped paths when requested', () => {
      const { pathD, midX } = calculateSvgEdgePath(srcBox, tgtBox, 'orthogonal');
      expect(pathD).toBe('M 200 150 L 400 150 L 400 300 L 600 300');
      expect(midX).toBe(400);
    });

    it('generates straight linear paths when requested', () => {
      const { pathD } = calculateSvgEdgePath(srcBox, tgtBox, 'straight');
      expect(pathD).toBe('M 200 150 L 600 300');
    });
  });

  describe('Node Kind Icons and Text Escaping', () => {
    it('returns distinctive SVG path coordinates for each architectural kind', () => {
      expect(getNodeKindIconPath('actor')).toContain('M12 12c2.21');
      expect(getNodeKindIconPath('store')).toContain('M12 3c-4.42');
      expect(getNodeKindIconPath('application')).toContain('M20 4H4c-1.1');
      expect(getNodeKindIconPath('component')).toContain('M19 13h-2v-2h2');
      expect(getNodeKindIconPath('system')).toContain('M19.35 10.04C18.67');
    });

    it('escapes XML special characters safely', () => {
      expect(escapeSvgText('Tom & Jerry <cartoon> "quote" \'single\'')).toBe(
        'Tom &amp; Jerry &lt;cartoon&gt; &quot;quote&quot; &apos;single&apos;',
      );
      expect(escapeSvgText(null)).toBe('');
    });
  });

  describe('renderViewToFidelitySvg', () => {
    it('generates valid standalone SVG XML with high-fidelity canvas elements', () => {
      const result = renderViewToFidelitySvg(currentView, mockModel, {
        theme: 'dark',
        edgeRouting: 'curved',
        includeGrid: true,
        includeBadges: true,
        includeMetadata: true,
        includeLegend: true,
        includeTooltips: true,
        viewObjects: mockViewObjects,
      });

      // XML & Root SVG
      expect(result.content.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(result.content).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(result.content.trim().endsWith('</svg>')).toBe(true);

      // Metadata & Headers
      expect(result.content).toContain('Container Overview View');
      expect(result.content).toContain('OmniBank Cloud Architecture');
      expect(result.content).toContain('CONTAINER View');

      // Definitions, Grid, and Markers
      expect(result.content).toContain('filter id="dhq-shadow"');
      expect(result.content).toContain('pattern id="dhq-grid"');
      expect(result.content).toContain('marker id="arrow-sync"');
      expect(result.content).toContain('marker id="arrow-async"');

      // Elements
      expect(result.content).toContain('Customer Web Portal');
      expect(result.content).toContain('Transaction Clearing');
      expect(result.content).toContain('Account Ledger Database');

      // Technology & Metadata Badges
      expect(result.content).toContain('TypeScript, React');
      expect(result.content).toContain('Go, gRPC');
      expect(result.content).toContain('PostgreSQL 16');

      // Boundaries for parent systems
      expect(result.content).toContain('Core Banking Platform');
      expect(result.boundaryCount).toBeGreaterThanOrEqual(1);

      // Relationship Edges
      expect(result.content).toContain('HTTPS / TLS 1.3');
      expect(result.content).toContain('mTLS gRPC');
      expect(result.content).toContain('Event Journal');
      expect(result.content).toContain('stroke-dasharray="6,4"'); // async marker

      // Tooltips for interactive inspection
      expect(result.content).toContain('<title>Customer Web Portal');
      expect(result.content).toContain('<title>HTTPS / TLS 1.3');

      // Legend
      expect(result.content).toContain('id="dhq-legend"');
      expect(result.content).toContain('APPLICATION');
      expect(result.content).toContain('STORE');

      // Stats
      expect(result.nodeCount).toBeGreaterThanOrEqual(3);
      expect(result.edgeCount).toBeGreaterThanOrEqual(2);
      expect(result.checksum).toMatch(/^[a-f0-9]{8}$/);
      expect(result.dataUri.startsWith('data:image/svg+xml;base64,')).toBe(true);
      expect(result.filename).toMatch(/^container-overview-view.*\.svg$/i);
    });

    it('renders with orthogonal edge routing', () => {
      const result = renderViewToFidelitySvg(currentView, mockModel, {
        edgeRouting: 'orthogonal',
        viewObjects: mockViewObjects,
      });

      // Contains orthogonal polyline instructions
      expect(result.content).toContain('L ');
    });

    it('renders light theme and transparent theme correctly', () => {
      const lightResult = renderViewToFidelitySvg(currentView, mockModel, {
        theme: 'light',
      });
      expect(lightResult.content).toContain('fill="#f8fafc"'); // light canvas bg

      const transparentResult = renderViewToFidelitySvg(currentView, mockModel, {
        theme: 'transparent',
      });
      // Should not contain background canvas rect
      expect(transparentResult.content).not.toContain('<!-- Background Canvas -->');
    });

    it('respects optional display toggles (disabling grid, metadata, badges, and legend)', () => {
      const options: SvgExportOptions = {
        includeGrid: false,
        includeMetadata: false,
        includeBadges: false,
        includeLegend: false,
        includeTooltips: false,
      };

      const result = renderViewToFidelitySvg(currentView, mockModel, options);

      expect(result.content).not.toContain('pattern id="dhq-grid"');
      expect(result.content).not.toContain('id="dhq-header"');
      expect(result.content).not.toContain('id="dhq-legend"');
      expect(result.content).not.toContain('<title>');
    });

    it('scales dimensions accurately according to scale factor', () => {
      const baseResult = renderViewToFidelitySvg(currentView, mockModel, { scale: 1 });
      const scaledResult = renderViewToFidelitySvg(currentView, mockModel, { scale: 2 });

      expect(scaledResult.dimensions.width).toBe(baseResult.dimensions.width * 2);
      expect(scaledResult.dimensions.height).toBe(baseResult.dimensions.height * 2);
    });
  });
});
