import { describe, it, expect } from 'vitest';
import {
  calculateExportBoundingBox,
  sanitizeFilename,
  generateExportFilename,
  computeContentChecksum,
  renderViewToSvg,
  renderViewToPdf,
  exportViewAsJson,
  exportArchitectureView,
  exportMultipleViews,
} from './export';
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
} from './types';

describe('Architecture Export Engine (F096)', () => {
  const archId = createId<'arch'>('arch');
  const verId = createId<'ver'>('ver');
  const wsId = createId<'ws'>('ws');

  const sys1Id = createId<'obj'>('obj');
  const sys2Id = createId<'obj'>('obj');
  const app1Id = createId<'obj'>('obj');

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId as ArchitectureId,
      workspaceId: wsId as WorkspaceId,
      name: 'Titanium Financial Core',
      description: 'Distributed transaction clearing engine.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId as VersionId,
      architectureId: archId as ArchitectureId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: sys1Id as ObjectId,
        architectureId: archId as ArchitectureId,
        versionId: verId as VersionId,
        kind: 'system',
        name: 'Order Processing System',
        description: 'Handles order matching and book entries.',
        metadata: { technology: 'Rust / Actix', owner: 'Trading Team' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sys2Id as ObjectId,
        architectureId: archId as ArchitectureId,
        versionId: verId as VersionId,
        kind: 'system',
        name: 'Risk Management Engine',
        description: 'Real-time margin and exposure calculation.',
        metadata: { technology: 'Go / gRPC', owner: 'Risk Team' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: app1Id as ObjectId,
        architectureId: archId as ArchitectureId,
        versionId: verId as VersionId,
        parentId: sys1Id as ObjectId,
        kind: 'application',
        name: 'Matching Service Container',
        description: 'Internal matching algorithm container.',
        metadata: { technology: 'Rust' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: createId<'con'>('con') as ConnectionId,
        architectureId: archId as ArchitectureId,
        versionId: verId as VersionId,
        sourceObjectId: sys1Id as ObjectId,
        targetObjectId: sys2Id as ObjectId,
        kind: 'sync',
        label: 'Margin Pre-Check',
        description: 'Validates margin balance prior to trade execution.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const contextView: View = {
    id: createId<'view'>('view') as ViewId,
    architectureId: archId as ArchitectureId,
    name: 'System Context Overview',
    kind: 'context',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const containerView: View = {
    id: createId<'view'>('view') as ViewId,
    architectureId: archId as ArchitectureId,
    name: 'Order System Containers',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Utilities and Bounding Box', () => {
    it('sanitizes titles for filenames', () => {
      expect(sanitizeFilename('Core Banking & Settlements (L1)')).toBe('core-banking-settlements-l1');
      expect(sanitizeFilename('   Payment Gateway / API  ')).toBe('payment-gateway-api');
    });

    it('generates consistent formatted export filename', () => {
      const fixedDate = new Date('2026-10-03T12:00:00Z');
      const filename = generateExportFilename('System Context Overview', 'svg', {
        architectureName: 'Titanium Financial Core',
        date: fixedDate,
      });
      expect(filename).toBe('titanium-financial-core-system-context-overview-20261003.svg');
    });

    it('computes deterministic checksum for contents', () => {
      const c1 = computeContentChecksum('hello world');
      const c2 = computeContentChecksum('hello world');
      const c3 = computeContentChecksum('hello world!');
      expect(c1).toBe(c2);
      expect(c1).not.toBe(c3);
      expect(typeof c1).toBe('string');
      expect(c1.length).toBe(8);
    });

    it('calculates bounding box with fallback for empty nodes', () => {
      const bbox = calculateExportBoundingBox([]);
      expect(bbox.width).toBe(800);
      expect(bbox.height).toBe(600);
    });

    it('calculates bounding box encompassing nodes and padding', () => {
      const bbox = calculateExportBoundingBox([
        {
          id: 'n1',
          type: 'system',
          position: { x: 100, y: 100 },
          width: 240,
          height: 120,
          data: { label: 'Node 1' },
        },
        {
          id: 'n2',
          type: 'system',
          position: { x: 500, y: 300 },
          width: 240,
          height: 120,
          data: { label: 'Node 2' },
        },
      ], { padding: 50, includeHeader: true, includeLegend: true });

      expect(bbox.minX).toBe(50); // 100 - 50
      expect(bbox.maxX).toBe(790); // 500 + 240 + 50
      expect(bbox.width).toBeGreaterThan(600);
      expect(bbox.height).toBeGreaterThan(300);
    });
  });

  describe('SVG Export Engine', () => {
    it('renders valid SVG with header, nodes, connections, and metadata', () => {
      const svg = renderViewToSvg(contextView, mockModel, {
        format: 'svg',
        theme: 'dark',
        scale: 1,
        includeMetadata: true,
        includeLegend: true,
      });

      // SVG root tag
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');

      // Header and title
      expect(svg).toContain('System Context Overview');
      expect(svg).toContain('Titanium Financial Core');
      expect(svg).toContain('CONTEXT View • Generated by DiagramHQ');

      // Nodes
      expect(svg).toContain('Order Processing System');
      expect(svg).toContain('Risk Management Engine');

      // Connection
      expect(svg).toContain('Margin Pre-Check');
      expect(svg).toContain('marker-end="url(#arrowSync)"');

      // Legend
      expect(svg).toContain('export-legend');
    });

    it('supports light and transparent themes', () => {
      const lightSvg = renderViewToSvg(contextView, mockModel, {
        format: 'svg',
        theme: 'light',
      });
      expect(lightSvg).toContain('fill="#ffffff"');

      const transparentSvg = renderViewToSvg(contextView, mockModel, {
        format: 'svg',
        theme: 'transparent',
      });
      // Should not have a background rect covering the whole canvas
      expect(transparentSvg).not.toContain('id="export-bg"');
    });

    it('scales dimensions according to export scale option', () => {
      const svg1x = renderViewToSvg(contextView, mockModel, { format: 'svg', scale: 1 });
      const svg2x = renderViewToSvg(contextView, mockModel, { format: 'svg', scale: 2 });

      const w1 = svg1x.match(/width="(\d+)"/);
      const w2 = svg2x.match(/width="(\d+)"/);

      expect(w1).toBeTruthy();
      expect(w2).toBeTruthy();
      expect(Number(w2![1])).toBe(Number(w1![1]) * 2);
    });
  });

  describe('PDF Export Engine', () => {
    it('generates valid PDF-1.4 file with vector streams and catalog', () => {
      const pdf = renderViewToPdf(contextView, mockModel, {
        format: 'pdf',
      });

      // PDF 1.4 Header and EOF trailer
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(pdf.trim().endsWith('%%EOF')).toBe(true);

      // PDF Catalog and page hierarchy
      expect(pdf).toContain('/Type /Catalog');
      expect(pdf).toContain('/Type /Pages');
      expect(pdf).toContain('/Type /Page');
      expect(pdf).toContain('/MediaBox [0 0 842 595]');

      // Embedded metadata
      expect(pdf).toContain('System Context Overview');
      expect(pdf).toContain('Titanium Financial Core');
      expect(pdf).toContain('/Creator (DiagramHQ)');
    });
  });

  describe('JSON Export Engine', () => {
    it('exports structured JSON representation of the view', () => {
      const jsonStr = exportViewAsJson(contextView, mockModel);
      const data = JSON.parse(jsonStr);

      expect(data.source).toBe('DiagramHQ');
      expect(data.architecture.name).toBe('Titanium Financial Core');
      expect(data.view.name).toBe('System Context Overview');
      expect(data.objects).toHaveLength(2); // Order Processing & Risk Management
      expect(data.objects[0].name).toBe('Order Processing System');
      expect(data.connections).toHaveLength(1);
      expect(data.connections[0].label).toBe('Margin Pre-Check');
    });
  });

  describe('Unified Architecture Exporter', () => {
    it('exports SVG format with complete metadata', () => {
      const result = exportArchitectureView(contextView, mockModel, {
        format: 'svg',
        theme: 'dark',
        scale: 2,
      });

      expect(result.format).toBe('svg');
      expect(result.mimeType).toBe('image/svg+xml');
      expect(result.filename.endsWith('.svg')).toBe(true);
      expect(result.byteSize).toBeGreaterThan(0);
      expect(result.content).toContain('<svg');
      expect(result.dataUri.startsWith('data:image/svg+xml')).toBe(true);
      expect(result.checksum).toBeTruthy();
    });

    it('exports PNG format as high-resolution data URI', () => {
      const result = exportArchitectureView(contextView, mockModel, {
        format: 'png',
        scale: 2,
      });

      expect(result.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
      expect(result.filename.endsWith('.png')).toBe(true);
      expect(result.dataUri.length).toBeGreaterThan(100);
      expect(result.dimensions.scale).toBe(2);
    });

    it('exports PDF format with PDF headers and data URI', () => {
      const result = exportArchitectureView(contextView, mockModel, {
        format: 'pdf',
      });

      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename.endsWith('.pdf')).toBe(true);
      expect(result.content).toContain('%PDF-1.4');
      expect(result.dataUri.startsWith('data:application/pdf;base64,')).toBe(true);
    });

    it('exports JSON format', () => {
      const result = exportArchitectureView(contextView, mockModel, {
        format: 'json',
      });

      expect(result.format).toBe('json');
      expect(result.mimeType).toBe('application/json');
      expect(result.filename.endsWith('.json')).toBe(true);
      expect(result.content).toContain('"source": "DiagramHQ"');
    });

    it('exports multiple views in batch mode', () => {
      const results = exportMultipleViews([contextView, containerView], mockModel, {
        format: 'svg',
      });

      expect(results).toHaveLength(2);
      expect(results[0].filename).toContain('system-context-overview');
      expect(results[1].filename).toContain('order-system-containers');
      expect(results[0].content).toContain('Order Processing System');
      expect(results[1].content).toContain('Matching Service Container');
    });
  });
});
