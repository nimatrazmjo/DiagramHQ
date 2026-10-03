import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PublicDocumentationModal } from './components/canvas/public-documentation-panel';
import {
  type ArchitectureId,
  type VersionId,
  type ArchitectureModel,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type DecisionId,
  type View,
  type ViewId,
  type ArchitectureDecisionRecord,
  type Flow,
  type FlowId,
  createPublicDocPublication,
  publishDocPublication,
} from '@diagramhq/domain';

describe('Public Documentation Canvas UI (F094)', () => {
  const archId = 'arch-public-doc' as ArchitectureId;
  const verId = 'ver-public-v1' as VersionId;
  const wsId = 'ws-public-main' as unknown as WorkspaceId;

  const coreBankingId = 'obj-core-banking' as unknown as ObjectId;
  const paymentDbId = 'obj-payment-db' as unknown as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Titanium Financial Core',
      description: 'Distributed ledger and high-throughput transaction clearing network.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: coreBankingId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'Core Banking Service',
        description: 'Settlement engine processing payments.',
        metadata: { technology: 'Rust / gRPC', owner: 'Payments Team', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: paymentDbId,
        architectureId: archId,
        versionId: verId,
        kind: 'store',
        name: 'Ledger PostgreSQL Store',
        description: 'ACID transactional ledger journal.',
        metadata: { technology: 'PostgreSQL 16', owner: 'Data Ops', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-1' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: coreBankingId,
        targetObjectId: paymentDbId,
        kind: 'sync',
        label: 'Writes ledger journals',
        metadata: { protocol: 'TCP' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockAdrs: ArchitectureDecisionRecord[] = [
    {
      id: 'dec-1' as unknown as DecisionId,
      number: 101,
      title: 'Adopt Multi-Region Distributed Transactions',
      status: 'accepted',
      context: 'Need 99.999% availability for cross-region ledger operations.',
      decision: 'Deploy Raft consensus nodes across three geographic regions.',
      consequences: 'Improves fault-tolerance; adds 15ms consensus roundtrip.',
      alternatives: ['Single region deployment'],
      attachments: [],
      createdAt: '2026-09-15T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z',
    },
  ];

  const mockViews: View[] = [
    {
      id: 'vw-1' as unknown as ViewId,
      architectureId: archId,
      name: 'Core Settlement Topology View',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFlows: Flow[] = [
    {
      id: 'flw-1' as unknown as FlowId,
      architectureId: archId,
      name: 'Instant Wire Transfer Flow',
      type: 'sequence',
      description: 'End-to-end clearing and settlement workflow.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders closed modal as null', () => {
    const html = renderToString(
      <PublicDocumentationModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
      />,
    );
    expect(html).toBe('');
  });

  it('renders publisher portal with public URL viewable without an account', () => {
    const html = renderToString(
      <PublicDocumentationModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        adrs={mockAdrs}
        views={mockViews}
        flows={mockFlows}
      />,
    );

    // Modal container & status badges
    expect(html).toContain('data-testid="public-doc-modal-container"');
    expect(html).toContain('Titanium Financial Core Documentation');
    expect(html).toContain('data-testid="publication-status-badge"');
    expect(html).toContain('data-testid="visibility-badge"');
    expect(html).toContain('Public (No Account Required)');

    // Public URL display & Copy button
    expect(html).toContain('data-testid="public-share-url-text"');
    expect(html).toContain('https://diagramhq.com/docs/pub/');
    expect(html).toContain('Copy Public Link');

    // Action buttons
    expect(html).toContain('data-testid="view-reader-mode-btn"');
    expect(html).toContain('View as External Reader');
    expect(html).toContain('data-testid="publish-btn"');
  });

  it('renders settings navigation tabs and content configuration', () => {
    const html = renderToString(
      <PublicDocumentationModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        adrs={mockAdrs}
        views={mockViews}
        flows={mockFlows}
      />,
    );

    expect(html).toContain('data-testid="tab-general"');
    expect(html).toContain('data-testid="tab-access"');
    expect(html).toContain('data-testid="tab-content"');
    expect(html).toContain('data-testid="tab-releases"');
    expect(html).toContain('data-testid="tab-analytics"');
    expect(html).toContain('data-testid="tab-export"');

    // General settings inputs
    expect(html).toContain('data-testid="input-title"');
    expect(html).toContain('data-testid="input-description"');
    expect(html).toContain('data-testid="input-slug"');
    expect(html).toContain('data-testid="input-org-name"');
  });

  it('renders published documentation state with unpublish option when published', () => {
    const initialPub = createPublicDocPublication({
      architectureId: mockModel.architecture.id,
      title: 'Titanium Financial Core Public Docs',
      visibility: 'public',
    });
    const published = publishDocPublication(initialPub, {
      version: '1.2.0',
      changelog: 'Added multi-region consensus ADR',
    });

    const html = renderToString(
      <PublicDocumentationModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        initialPublication={published}
        adrs={mockAdrs}
        views={mockViews}
        flows={mockFlows}
      />,
    );

    expect(html).toContain('published');
    expect(html).toContain('v1.2.0');
    expect(html).toContain('data-testid="unpublish-btn"');
    expect(html).toContain('Unpublish');
  });
});
