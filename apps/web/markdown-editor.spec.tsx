import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MarkdownEditorModal } from './components/canvas/markdown-editor-modal';
import type {
  ArchitectureId,
  VersionId,
  ArchitectureModel,
  WorkspaceId,
  ObjectId,
  ViewId,
  View,
} from '@diagramhq/domain';

describe('Markdown Documentation Editor Canvas UI (F093)', () => {
  const archId = 'arch-editor-test' as ArchitectureId;
  const verId = 'ver-editor-v1' as VersionId;
  const wsId = 'ws-editor-main' as unknown as WorkspaceId;

  const orderSvcId = 'obj-orders' as unknown as ObjectId;
  const apiGwId = 'obj-gateway' as unknown as ObjectId;

  const model: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniFlow Commerce Platform',
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
        id: apiGwId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'API Gateway',
        description: 'Edge API router and ingress proxy.',
        metadata: { technology: 'Kong' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: orderSvcId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'Order Service',
        description: 'Microservice handling order transactions.',
        metadata: { technology: 'Go / gRPC' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  };

  const sampleViews: View[] = [
    {
      id: 'view-container-orders' as ViewId,
      architectureId: archId,
      name: 'Order Service Container Architecture',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'view-context-overview' as ViewId,
      architectureId: archId,
      name: 'System Context Overview',
      kind: 'context',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <MarkdownEditorModal
        isOpen={false}
        onClose={() => {}}
        model={model}
      />,
    );
    expect(html).toBe('');
  });

  it('renders editor modal with title, toolbar, and split panes when open', () => {
    const html = renderToString(
      <MarkdownEditorModal
        isOpen={true}
        onClose={() => {}}
        model={model}
        views={sampleViews}
      />,
    );

    // Modal and header elements
    expect(html).toContain('Document Title');
    expect(html).toContain('Architecture Specification');
    expect(html).toContain('words');
    expect(html).toContain('min read');

    // View mode controls
    expect(html).toContain('split');
    expect(html).toContain('edit');
    expect(html).toContain('preview');

    // Formatting Toolbar controls
    expect(html).toContain('H2');
    expect(html).toContain('H3');
    expect(html).toContain('Table');
    expect(html).toContain('Code');
    expect(html).toContain('Image');
    expect(html).toContain('+ Embed Architecture');

    // Editor & Preview Panes
    expect(html).toContain('data-testid="editor-pane"');
    expect(html).toContain('data-testid="preview-pane"');
    expect(html).toContain('data-testid="rendered-markdown-content"');
  });

  it('renders document with embedded diagram, tables, code, and mentions (Acceptance Criteria)', () => {
    const docWithDiagram = `# Order Microservice Architecture Guide

## Overview
This document guides internal developers on the Order Service topology.
Contact @[API Gateway] team for ingress policy.

\`\`\`diagram
id: view-container-orders
title: Order Service Container Architecture
caption: Live projection of container interactions
\`\`\`

## Data Contracts
| Endpoint | Method | Format |
| :--- | :--- | :--- |
| /orders | POST | JSON / Protobuf |
| /orders/{id} | GET | JSON |

\`\`\`typescript
export interface OrderRequest {
  itemId: string;
  quantity: number;
}
\`\`\`

![Topology Overview](https://example.com/topology.png "Topology Diagram")
`;

    const html = renderToString(
      <MarkdownEditorModal
        isOpen={true}
        onClose={() => {}}
        model={model}
        views={sampleViews}
        initialContent={docWithDiagram}
      />,
    );

    // Headings rendered
    expect(html).toContain('<h1 id="order-microservice-architecture-guide">Order Microservice Architecture Guide</h1>');
    expect(html).toContain('<h2 id="overview">Overview</h2>');

    // Mention rendered
    expect(html).toContain('<span class="doc-mention doc-mention-object">@API Gateway</span>');

    // Embedded diagram card rendered
    expect(html).toContain('doc-embed doc-embed-diagram');
    expect(html).toContain('DIAGRAM VIEW');
    expect(html).toContain('Order Service Container Architecture');
    expect(html).toContain('CONTAINER');
    expect(html).toContain('Live projection of container interactions');
    expect(html).toContain('Open Diagram in Studio →');

    // Table rendered
    expect(html).toContain('<table class="doc-table">');
    expect(html).toContain('<th>Endpoint</th>');
    expect(html).toContain('<td>/orders</td>');

    // Code block rendered
    expect(html).toContain('<pre class="doc-code-block"><code class="language-typescript">');
    expect(html).toContain('export interface OrderRequest');

    // Image rendered
    expect(html).toContain('<figure class="doc-image-figure"><img src="https://example.com/topology.png" alt="Topology Overview" />');
    expect(html).toContain('<figcaption>Topology Diagram</figcaption>');
  });

  it('renders embedded architecture object cards with live metadata', () => {
    const docWithObject = `# Service Catalog Reference

\`\`\`object
id: obj-orders
title: Order Service Microservice
\`\`\`
`;

    const html = renderToString(
      <MarkdownEditorModal
        isOpen={true}
        onClose={() => {}}
        model={model}
        views={sampleViews}
        initialContent={docWithObject}
      />,
    );

    expect(html).toContain('doc-embed doc-embed-object');
    expect(html).toContain('APPLICATION');
    expect(html).toContain('Order Service Microservice');
    expect(html).toContain('Go / gRPC');
    expect(html).toContain('Microservice handling order transactions.');
  });
});
