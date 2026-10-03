import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ExportModal } from './components/canvas/export-modal';
import {
  type ArchitectureId,
  type VersionId,
  type ArchitectureModel,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type View,
  type ViewId,
} from '@diagramhq/domain';

describe('Architecture Export Canvas UI (F096)', () => {
  const archId = 'arch-export-test' as ArchitectureId;
  const verId = 'ver-export-v1' as VersionId;
  const wsId = 'ws-export-main' as unknown as WorkspaceId;

  const coreSystemId = 'obj-core-system' as unknown as ObjectId;
  const clearingSystemId = 'obj-clearing-system' as unknown as ObjectId;

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
        id: coreSystemId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'Transaction Engine',
        description: 'Settlement engine processing payments.',
        metadata: { technology: 'Rust / gRPC', owner: 'Core Platform Team' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: clearingSystemId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'Global Clearing Gateway',
        description: 'External clearing house settlement network.',
        metadata: { technology: 'Java / ISO20022', owner: 'Network Team' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-1' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: coreSystemId,
        targetObjectId: clearingSystemId,
        kind: 'sync',
        label: 'Dispatches clearing batches',
        metadata: { protocol: 'mTLS / HTTP2' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: 'view-context' as unknown as ViewId,
    architectureId: archId,
    name: 'System Context Diagram',
    kind: 'context',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const containerView: View = {
    id: 'view-containers' as unknown as ViewId,
    architectureId: archId,
    name: 'Container Architecture Diagram',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders nothing when closed', () => {
    const html = renderToString(
      <ExportModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />
    );
    expect(html).toBe('');
  });

  it('renders export modal with header, format tabs, scale controls, and action buttons', () => {
    const html = renderToString(
      <ExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        views={[currentView, containerView]}
      />
    );

    // Modal title & description
    expect(html).toContain('Export Architecture Diagram');
    expect(html).toContain('Export high-resolution vector and raster assets');

    // Format tabs
    expect(html).toContain('PNG (Raster Image)');
    expect(html).toContain('SVG (Vector)');
    expect(html).toContain('PDF (Print Document)');
    expect(html).toContain('JSON (Model Data)');

    // Scale controls
    expect(html).toContain('data-testid="export-scale-1x"');
    expect(html).toContain('data-testid="export-scale-2x"');
    expect(html).toContain('data-testid="export-scale-3x"');
    expect(html).toContain('data-testid="export-scale-4x"');

    // Themes
    expect(html).toContain('data-testid="export-theme-dark"');
    expect(html).toContain('data-testid="export-theme-light"');
    expect(html).toContain('data-testid="export-theme-transparent"');

    // Toggles
    expect(html).toContain('Include Title &amp; Metadata Banner');
    expect(html).toContain('Include Component Kind Legend');

    // View selector dropdown
    expect(html).toContain('System Context Diagram (CONTEXT)');
    expect(html).toContain('Container Architecture Diagram (CONTAINER)');

    // Filename & Download action
    expect(html).toContain('data-testid="export-filename"');
    expect(html).toContain('Download PNG');
    expect(html).toContain('Copy to Clipboard');
  });

  it('renders live diagram preview pane containing nodes and connections', () => {
    const html = renderToString(
      <ExportModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />
    );

    // Node titles should be present inside rendered SVG in preview
    expect(html).toContain('Transaction Engine');
    expect(html).toContain('Global Clearing Gateway');

    // Edge label should be present
    expect(html).toContain('Dispatches clearing batches');
  });
});
