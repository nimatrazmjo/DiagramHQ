import { describe, it, expect } from 'vitest';
import {
  getPdfPageDimensions,
  exportArchitecturePdfBook,
  exportDocumentToPdf,
  type PdfExportOptions,
} from './pdf-export';
import { createId } from './ids';
import type {
  ArchitectureModel,
  View,
  FlowWithSteps,
  ArchitectureId,
  VersionId,
  WorkspaceId,
  ObjectId,
  ConnectionId,
  ViewId,
  FlowId,
  ViewObject,
} from './types';

describe('PDF Export Engine (F099)', () => {
  const archId = createId('arch') as ArchitectureId;
  const verId = createId('ver') as VersionId;
  const wsId = createId('ws') as unknown as WorkspaceId;

  const userActorId = createId('act') as ObjectId;
  const webAppId = createId('app') as ObjectId;
  const apiServiceId = createId('cmp') as ObjectId;
  const mainDbId = createId('sto') as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniCloud Core System',
      description: 'Enterprise financial and payment processing architecture.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.4.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: userActorId,
        architectureId: archId,
        versionId: verId,
        kind: 'actor',
        name: 'Enterprise Client',
        description: 'B2B API consumer.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'Merchant Web Portal',
        description: 'Next.js dashboard for merchant management.',
        technology: 'Next.js, TypeScript',
        tags: ['frontend', 'pci'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiServiceId,
        architectureId: archId,
        versionId: verId,
        kind: 'component',
        name: 'Payment Processing Engine',
        description: 'High-throughput clearing service.',
        technology: 'Go, gRPC',
        tags: ['core', 'financial'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: mainDbId,
        architectureId: archId,
        versionId: verId,
        kind: 'store',
        name: 'Ledger Database',
        description: 'ACID transactional ledger.',
        technology: 'PostgreSQL 16',
        tags: ['db', 'ledger'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceId: userActorId,
        targetId: webAppId,
        label: 'HTTPS / OAuth2',
        description: 'Authenticates and initiates payment batch',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceId: webAppId,
        targetId: apiServiceId,
        label: 'mTLS gRPC',
        description: 'Transfers payment payload',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceId: apiServiceId,
        targetId: mainDbId,
        label: 'SQL Write',
        description: 'Records ledger journal entries',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const contextViewId = createId('viw') as ViewId;
  const mockView: View = {
    id: contextViewId,
    architectureId: archId,
    name: 'Context & Container View',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewObjects: ViewObject[] = [
    {
      viewId: contextViewId,
      objectId: userActorId,
      position: { x: 100, y: 100 },
      style: { width: 140, height: 70, color: '#3B82F6' },
    },
    {
      viewId: contextViewId,
      objectId: webAppId,
      position: { x: 320, y: 100 },
      style: { width: 160, height: 80, color: '#10B981' },
    },
    {
      viewId: contextViewId,
      objectId: apiServiceId,
      position: { x: 560, y: 100 },
      style: { width: 160, height: 80, color: '#8B5CF6' },
    },
    {
      viewId: contextViewId,
      objectId: mainDbId,
      position: { x: 800, y: 100 },
      style: { width: 140, height: 70, color: '#F59E0B' },
    },
  ];

  const mockFlowId = createId('flw') as FlowId;
  const mockFlow: FlowWithSteps = {
    id: mockFlowId,
    architectureId: archId,
    name: 'Instant Payment Settlement',
    description: 'End-to-end clearing and ledger settlement sequence.',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'step-1',
        flowId: mockFlowId,
        stepIndex: 0,
        connectionId: mockModel.connections[0]!.id,
        note: 'Client issues idempotency token and payload',
      },
      {
        id: 'step-2',
        flowId: mockFlowId,
        stepIndex: 1,
        connectionId: mockModel.connections[1]!.id,
        note: 'Validates cryptographic signature and limits',
      },
      {
        id: 'step-3',
        flowId: mockFlowId,
        stepIndex: 2,
        connectionId: mockModel.connections[2]!.id,
        note: 'Atomically updates account balances in DB',
      },
    ],
  };

  const mockAdrs = [
    {
      id: 'ADR-001',
      title: 'Adopt PostgreSQL for Immutable Double-Entry Ledger',
      status: 'accepted' as const,
      date: '2026-03-01',
      context: 'Need strict ACID compliance and row-level locks for transaction ledgering.',
      decision: 'We will utilize PostgreSQL with partitioned tables and serializable isolation.',
      consequences: 'Guarantees balance accuracy but requires careful connection pooling.',
    },
    {
      id: 'ADR-002',
      title: 'Use gRPC with Protobuf for Internal Inter-Service RPC',
      status: 'accepted' as const,
      date: '2026-03-10',
      context: 'HTTP/JSON serialization latency overhead is too high for clearing volume.',
      decision: 'All internal components communicate via gRPC over HTTP/2.',
      consequences: 'Sub-millisecond latency achieved; requires Protobuf schema governance.',
    },
  ];

  describe('Page Dimensions Calculation', () => {
    it('returns standard A4 dimensions in landscape and portrait', () => {
      const a4Landscape = getPdfPageDimensions('a4', 'landscape');
      expect(a4Landscape.width).toBe(842);
      expect(a4Landscape.height).toBe(595);

      const a4Portrait = getPdfPageDimensions('a4', 'portrait');
      expect(a4Portrait.width).toBe(595);
      expect(a4Portrait.height).toBe(842);
    });

    it('returns US Letter dimensions in landscape and portrait', () => {
      const letterLandscape = getPdfPageDimensions('letter', 'landscape');
      expect(letterLandscape.width).toBe(792);
      expect(letterLandscape.height).toBe(612);

      const letterPortrait = getPdfPageDimensions('letter', 'portrait');
      expect(letterPortrait.width).toBe(612);
      expect(letterPortrait.height).toBe(792);
    });
  });

  describe('exportArchitecturePdfBook', () => {
    it('generates a valid multi-page PDF document with all default sections', () => {
      const viewMap = new Map<string, ViewObject[]>();
      viewMap.set(contextViewId, mockViewObjects);

      const result = exportArchitecturePdfBook(
        mockModel,
        {
          format: 'a4',
          orientation: 'landscape',
          author: 'Lead Architect',
          organization: 'Omni Financial',
          watermark: 'CONFIDENTIAL',
          includePageNumbers: true,
          viewObjectsMap: viewMap,
          flows: [mockFlow],
          adrs: mockAdrs,
        },
        [mockView],
      );

      // PDF 1.4 header
      expect(result.content.startsWith('%PDF-1.4\n')).toBe(true);
      // PDF trailer & EOF
      expect(result.content.includes('startxref')).toBe(true);
      expect(result.content.trim().endsWith('%%EOF')).toBe(true);

      // Check essential PDF structural objects
      expect(result.content).toContain('/Type /Catalog');
      expect(result.content).toContain('/Type /Pages');
      expect(result.content).toContain('/Type /Page');
      expect(result.content).toContain('/Type /Font');
      expect(result.content).toContain('/Subtype /Type1 /BaseFont /Helvetica');
      expect(result.content).toContain('/Subtype /Type1 /BaseFont /Helvetica-Bold');
      expect(result.content).toContain('/Creator (DiagramHQ Architecture OS)');

      // Multi-page verification
      expect(result.pageCount).toBeGreaterThanOrEqual(4);
      expect(result.sectionsIncluded).toEqual(
        expect.arrayContaining(['cover', 'overview', 'views', 'catalog', 'adrs', 'flows']),
      );

      // Metadata and URI
      expect(result.dataUri.startsWith('data:application/pdf;base64,')).toBe(true);
      expect(result.filename).toMatch(/^omnicloud-core-system.*\.pdf$/i);
      expect(result.byteSize).toBe(result.content.length);
      expect(result.checksum).toMatch(/^[a-f0-9]{8}$/);

      // Dimensions
      expect(result.dimensions.width).toBe(842);
      expect(result.dimensions.height).toBe(595);
      expect(result.dimensions.format).toBe('a4');
      expect(result.dimensions.orientation).toBe('landscape');

      // Content verification
      expect(result.content).toContain('OmniCloud Core System');
      expect(result.content).toContain('CONFIDENTIAL');
      expect(result.content).toContain('Merchant Web Portal');
      expect(result.content).toContain('Payment Processing Engine');
      expect(result.content).toContain('ADR-001');
      expect(result.content).toContain('Instant Payment Settlement');
    });

    it('generates a lightweight PDF with only selected sections (cover & overview)', () => {
      const options: PdfExportOptions = {
        sections: ['cover', 'overview'],
        customTitle: 'Executive Summary Brief',
        watermark: 'DRAFT',
      };

      const result = exportArchitecturePdfBook(mockModel, options, []);

      expect(result.pageCount).toBe(2);
      expect(result.sectionsIncluded).toEqual(['cover', 'overview']);
      expect(result.content).toContain('Executive Summary Brief');
      expect(result.content).toContain('DRAFT');
      expect(result.filename).toMatch(/^executive-summary-brief.*\.pdf$/i);
    });

    it('renders vector shapes and object boxes for architecture views', () => {
      const viewMap = new Map<string, ViewObject[]>();
      viewMap.set(contextViewId, mockViewObjects);

      const result = exportArchitecturePdfBook(
        mockModel,
        {
          sections: ['views'],
          viewObjectsMap: viewMap,
        },
        [mockView],
      );

      expect(result.pageCount).toBe(1);
      expect(result.sectionsIncluded).toEqual(['views']);
      // View name rendered
      expect(result.content).toContain('Context & Container View');
      // Box drawing commands in PDF stream
      expect(result.content).toContain('re'); // rectangle operator
      expect(result.content).toContain('f'); // fill operator
    });

    it('handles model catalog with multi-page table wrapping correctly', () => {
      // Create a model with 30 objects to test catalog table chunking across multiple pages
      const manyObjects = Array.from({ length: 30 }, (_, i) => ({
        id: createId('cmp') as ObjectId,
        architectureId: archId,
        versionId: verId,
        kind: 'component' as const,
        name: `Microservice Module ${i + 1}`,
        description: `Backend component handling domain partition ${i + 1}`,
        technology: 'Node.js / TypeScript',
        tags: [`module-${i + 1}`, 'api'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const largeModel: ArchitectureModel = {
        ...mockModel,
        objects: manyObjects,
      };

      const result = exportArchitecturePdfBook(
        largeModel,
        {
          sections: ['catalog'],
        },
        [],
      );

      // 30 objects at 12 items/page should create at least 3 catalog pages
      expect(result.pageCount).toBeGreaterThanOrEqual(3);
      expect(result.content).toContain('Microservice Module 1');
      expect(result.content).toContain('Microservice Module 30');
      expect(result.content.trim().endsWith('%%EOF')).toBe(true);
    });

    it('renders ADR decisions and flow sequences into dedicated pages', () => {
      const result = exportArchitecturePdfBook(
        mockModel,
        {
          sections: ['adrs', 'flows'],
          adrs: mockAdrs,
          flows: [mockFlow],
        },
        [],
      );

      expect(result.sectionsIncluded).toEqual(['adrs', 'flows']);
      expect(result.pageCount).toBe(2);
      expect(result.content).toContain('Architecture Decision Records');
      expect(result.content).toContain('ADR-001');
      expect(result.content).toContain('Execution Flow: Instant Payment Settlement');
      expect(result.content).toContain('Instant Payment Settlement');
    });

    it('escapes special characters in text without corrupting PDF stream syntax', () => {
      const modelWithSpecialChars: ArchitectureModel = {
        ...mockModel,
        architecture: {
          ...mockModel.architecture,
          name: 'Special (Escape) & \\Test/ [Model]',
          description: 'Line 1\nLine 2 with (parentheses) and \\backslashes\\',
        },
      };

      const result = exportArchitecturePdfBook(
        modelWithSpecialChars,
        {
          sections: ['cover'],
          author: 'QA (Engineer) \\ Test',
        },
        [],
      );

      expect(result.content.startsWith('%PDF-1.4')).toBe(true);
      expect(result.content.trim().endsWith('%%EOF')).toBe(true);
      // Literal parentheses are escaped in PDF strings
      expect(result.content).toContain('\\(Escape\\)');
      expect(result.content).toContain('\\(parentheses\\)');
    });
  });

  describe('exportDocumentToPdf', () => {
    it('exports a single view or documentation view to PDF document', () => {
      const result = exportDocumentToPdf(
        'OmniCloud Architecture Specification',
        mockModel,
        {
          format: 'letter',
          orientation: 'portrait',
          sections: ['cover', 'views'],
        },
        mockView,
      );

      expect(result.dimensions.format).toBe('letter');
      expect(result.dimensions.orientation).toBe('portrait');
      expect(result.content).toContain('OmniCloud Architecture Specification');
      expect(result.content.startsWith('%PDF-1.4')).toBe(true);
      expect(result.content.trim().endsWith('%%EOF')).toBe(true);
    });
  });
});
