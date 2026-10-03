import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SvgExportModal } from './components/canvas/svg-export-modal';
import {
  type ArchitectureId,
  type VersionId,
  type ArchitectureModel,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type View,
  type ViewId,
  type ViewObject,
} from '@diagramhq/domain';

describe('High-Fidelity SVG Export Modal UI (F100)', () => {
  const archId = 'arch-svg-test' as ArchitectureId;
  const verId = 'ver-svg-v1' as VersionId;
  const wsId = 'ws-svg-main' as unknown as WorkspaceId;

  const coreSystemId = 'obj-svg-sys' as unknown as ObjectId;
  const webAppId = 'obj-svg-app' as unknown as ObjectId;
  const apiGwId = 'obj-svg-cmp' as unknown as ObjectId;
  const dbId = 'obj-svg-sto' as unknown as ObjectId;

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
        id: coreSystemId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'Core Banking Platform',
        description: 'Core financial boundary',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
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
        parentId: coreSystemId,
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
        parentId: coreSystemId,
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
        id: 'con-svg-1' as ConnectionId,
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
        id: 'con-svg-2' as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGwId,
        targetObjectId: dbId,
        kind: 'async',
        label: 'mTLS Write',
        description: 'Executes transactional writes',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: 'view-svg-container' as ViewId,
    architectureId: archId,
    name: 'Container Overview View',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewObjects: ViewObject[] = [
    {
      viewId: currentView.id,
      objectId: webAppId,
      position: { x: 100, y: 150 },
    },
    {
      viewId: currentView.id,
      objectId: apiGwId,
      position: { x: 400, y: 150 },
    },
    {
      viewId: currentView.id,
      objectId: dbId,
      position: { x: 700, y: 150 },
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <SvgExportModal
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
      <SvgExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        viewObjects={mockViewObjects}
      />,
    );

    // Modal title & subheader
    expect(html).toContain('Export High-Fidelity SVG');
    expect(html).toContain('Pixel-perfect vector graphic export matching the interactive canvas styling');

    // Navigation Tabs
    expect(html).toContain('Interactive Preview');
    expect(html).toContain('Fidelity &amp; Styling Options');
    expect(html).toContain('SVG XML Markup');

    // Quick Metrics Badges
    expect(html).toContain('data-testid="badge-nodes-count"');
    expect(html).toContain('data-testid="badge-edges-count"');
    expect(html).toContain('data-testid="badge-file-size"');

    // Viewport Zoom Controls
    expect(html).toContain('data-testid="btn-zoom-in"');
    expect(html).toContain('data-testid="btn-zoom-out"');
    expect(html).toContain('data-testid="btn-zoom-reset"');

    // Preview Canvas
    expect(html).toContain('data-testid="svg-preview-container"');
    expect(html).toContain('data-testid="svg-preview-element"');

    // Action buttons in footer
    expect(html).toContain('data-testid="btn-download-svg"');
    expect(html).toContain('Download SVG File');
    expect(html).toContain('data-testid="btn-copy-svg-code"');
    expect(html).toContain('Copy SVG Markup');
    expect(html).toContain('data-testid="btn-copy-svg-uri"');
    expect(html).toContain('Copy Data URI');
  });

  it('renders live SVG graphic element matching canvas elements and metadata', () => {
    const html = renderToString(
      <SvgExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        viewObjects={mockViewObjects}
      />,
    );

    // Check SVG content inside the preview element
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(html).toContain('Online Banking Portal');
    expect(html).toContain('API Gateway Service');
    expect(html).toContain('Account Ledger DB');
    expect(html).toContain('TypeScript / React');
    expect(html).toContain('HTTPS / TLS 1.3');
  });
});
