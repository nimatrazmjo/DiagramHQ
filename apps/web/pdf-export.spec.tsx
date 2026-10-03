import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PdfExportModal } from './components/canvas/pdf-export-modal';
import {
  type ArchitectureId,
  type VersionId,
  type ArchitectureModel,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type View,
  type ViewId,
  type FlowWithSteps,
  type FlowId,
} from '@diagramhq/domain';

describe('PDF Export Modal UI (F099)', () => {
  const archId = 'arch-pdf-test' as ArchitectureId;
  const verId = 'ver-pdf-v1' as VersionId;
  const wsId = 'ws-pdf-main' as unknown as WorkspaceId;

  const webAppId = 'obj-pdf-web' as unknown as ObjectId;
  const apiGwId = 'obj-pdf-api' as unknown as ObjectId;
  const dbId = 'obj-pdf-db' as unknown as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniBank Core System',
      description: 'Distributed retail and commercial banking platform.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v2.1.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'Online Banking Portal',
        description: 'Next.js merchant and consumer dashboard',
        metadata: { technology: 'TypeScript / React', owner: 'Digital Channels' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGwId,
        architectureId: archId,
        versionId: verId,
        kind: 'component',
        name: 'API Gateway Service',
        description: 'Reverse proxy and rate limiting gateway',
        metadata: { technology: 'Envoy / Go', owner: 'Core Platform' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: dbId,
        architectureId: archId,
        versionId: verId,
        kind: 'store',
        name: 'Account Ledger DB',
        description: 'Transactional account balance store',
        metadata: { technology: 'PostgreSQL 16', owner: 'Data Team' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-pdf-1' as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: webAppId,
        targetObjectId: apiGwId,
        kind: 'sync',
        label: 'HTTPS / TLS 1.3',
        description: 'Dispatches API queries',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'con-pdf-2' as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGwId,
        targetObjectId: dbId,
        kind: 'sync',
        label: 'mTLS SQL',
        description: 'Executes transactional writes',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: 'view-pdf-core' as ViewId,
    architectureId: archId,
    name: 'Primary System Overview',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFlow: FlowWithSteps = {
    id: 'flw-pdf-pay' as FlowId,
    architectureId: archId,
    name: 'Instant Payment Settlement',
    description: 'Real-time clearing and ledger update sequence',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'step-1',
        flowId: 'flw-pdf-pay' as FlowId,
        stepIndex: 0,
        connectionId: 'con-pdf-1' as ConnectionId,
        note: 'Customer initiates payment',
      },
      {
        id: 'step-2',
        flowId: 'flw-pdf-pay' as FlowId,
        stepIndex: 1,
        connectionId: 'con-pdf-2' as ConnectionId,
        note: 'Commits journal ledger row',
      },
    ],
  };

  const mockAdrs = [
    {
      id: 'ADR-001',
      title: 'Adopt Multi-Region Active-Active PostgreSQL',
      status: 'accepted' as const,
      date: '2026-02-15',
      context: 'High availability across primary cloud zones',
      decision: 'Bi-directional replication with quorum write validation',
      consequences: 'Zero data loss during zone failover',
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <PdfExportModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with header, tabs, and action buttons when open', () => {
    const html = renderToString(
      <PdfExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        views={[currentView]}
        currentView={currentView}
        flows={[mockFlow]}
        adrs={mockAdrs}
      />,
    );

    // Modal title & subheader
    expect(html).toContain('Export Architecture PDF Book');
    expect(html).toContain('Generate high-resolution, multi-page vector architecture documentation (PDF 1.4)');

    // Tab buttons
    expect(html).toContain('Live Preview');
    expect(html).toContain('Document Sections &amp; Options');
    expect(html).toContain('PDF Syntax Inspector');

    // Metrics badges
    expect(html).toContain('data-testid="badge-page-count"');
    expect(html).toContain('data-testid="badge-file-size"');

    // Action buttons
    expect(html).toContain('data-testid="btn-download-pdf"');
    expect(html).toContain('Download PDF Book');
    expect(html).toContain('data-testid="btn-copy-uri"');
    expect(html).toContain('Copy Data URI');

    // Preview sheet
    expect(html).toContain('data-testid="pdf-preview-sheet"');
    expect(html).toContain('data-testid="btn-page-1"');
    expect(html).toContain('OmniBank Core System');
  });

  it('renders multi-page navigation carousel controls', () => {
    const html = renderToString(
      <PdfExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        views={[currentView]}
        currentView={currentView}
        flows={[mockFlow]}
        adrs={mockAdrs}
      />,
    );

    // Page carousel buttons
    expect(html).toContain('data-testid="btn-page-1"');
    expect(html).toContain('data-testid="btn-page-2"');
    expect(html).toContain('Page 1 of');
  });

  it('displays document metadata in preview cover page', () => {
    const html = renderToString(
      <PdfExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );

    expect(html).toContain('data-testid="preview-cover-content"');
    expect(html).toContain('Architecture Report &amp; Specification');
    expect(html).toContain('Enterprise Systems Org');
    expect(html).toContain('Platform Architecture Team');
  });
});
