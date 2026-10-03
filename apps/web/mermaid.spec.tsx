import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MermaidModal } from './components/canvas/mermaid-modal';
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

describe('Mermaid Integration Canvas UI (F097)', () => {
  const archId = 'arch-mermaid-test' as ArchitectureId;
  const verId = 'ver-mermaid-v1' as VersionId;
  const wsId = 'ws-mermaid-main' as unknown as WorkspaceId;

  const webAppId = 'obj-web-app' as unknown as ObjectId;
  const apiGatewayId = 'obj-api-gw' as unknown as ObjectId;
  const authServiceId = 'obj-auth-svc' as unknown as ObjectId;
  const dbId = 'obj-postgres-db' as unknown as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniCloud Microservices',
      description: 'Distributed event-driven architecture.',
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
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'Web Portal',
        description: 'Next.js Frontend',
        metadata: { technology: 'TypeScript' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGatewayId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'API Gateway',
        description: 'Reverse proxy routing requests',
        metadata: { technology: 'Kong' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: authServiceId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'Auth Service',
        description: 'OAuth2 / OIDC authentication service',
        metadata: { technology: 'Go' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: dbId,
        architectureId: archId,
        versionId: verId,
        kind: 'store',
        name: 'User Database',
        description: 'PostgreSQL instance',
        metadata: { technology: 'PostgreSQL 16' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-1' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: webAppId,
        targetObjectId: apiGatewayId,
        kind: 'sync',
        label: 'HTTPS / GraphQL',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'con-2' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGatewayId,
        targetObjectId: authServiceId,
        kind: 'sync',
        label: 'gRPC verifyToken',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'con-3' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: authServiceId,
        targetObjectId: dbId,
        kind: 'sync',
        label: 'SQL query',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: 'view-mermaid' as unknown as ViewId,
    architectureId: archId,
    name: 'Overview Architecture',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFlow: FlowWithSteps = {
    id: 'flow-auth' as unknown as FlowId,
    architectureId: archId,
    name: 'User Login Journey',
    description: 'Authenticates customer and issues session token.',
    type: 'sequence',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'step-1',
        flowId: 'flow-auth' as unknown as FlowId,
        connectionId: 'con-1' as unknown as ConnectionId,
        stepIndex: 0,
        note: 'User submits credentials',
      },
      {
        id: 'step-2',
        flowId: 'flow-auth' as unknown as FlowId,
        connectionId: 'con-2' as unknown as ConnectionId,
        stepIndex: 1,
        note: 'Forward login request',
      },
    ],
  };

  it('renders nothing when closed', () => {
    const html = renderToString(
      <MermaidModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );
    expect(html).toBe('');
  });

  it('renders Mermaid modal dialog with tabs, controls, and script preview', () => {
    const html = renderToString(
      <MermaidModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        flows={[mockFlow]}
      />,
    );

    // Modal title & subheader
    expect(html).toContain('Mermaid.js Integration');
    expect(html).toContain('Bidirectional Mermaid flowchart and sequence diagram');

    // Tabs
    expect(html).toContain('Export Mermaid');
    expect(html).toContain('Import Mermaid');

    // Diagram type buttons
    expect(html).toContain('Flowchart');
    expect(html).toContain('Sequence');

    // Direction buttons
    expect(html).toContain('TB');
    expect(html).toContain('LR');

    // Action buttons
    expect(html).toContain('Copy Script');
    expect(html).toContain('Download .mmd File');

    // Generated Mermaid script output
    expect(html).toContain('data-testid="mermaid-export-output"');
    expect(html).toContain('flowchart TB');
    expect(html).toContain('Web Portal');
    expect(html).toContain('API Gateway');
    expect(html).toContain('HTTPS / GraphQL');
  });

  it('renders node metrics and connection statistics in export summary', () => {
    const html = renderToString(
      <MermaidModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );

    // Should indicate the target view and counts
    expect(html).toContain('Overview Architecture');
    expect(html).toContain('Nodes / Participants:');
    expect(html).toContain('Edges / Steps:');
  });

  it('renders import tab with parser feedback, syntax indicator, and apply button', () => {
    const html = renderToString(
      <MermaidModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        initialTab="import"
      />,
    );

    // Textarea with initial sample script
    expect(html).toContain('data-testid="mermaid-import-textarea"');
    expect(html).toContain('flowchart TB');

    // Parser statistics
    expect(html).toContain('Parser Analysis');
    expect(html).toContain('data-testid="parsed-diagram-type"');
    expect(html).toContain('flowchart');
    expect(html).toContain('data-testid="parsed-objects-count"');
    expect(html).toContain('data-testid="parsed-connections-count"');
    expect(html).toContain('Valid Syntax');

    // Discovered entities
    expect(html).toContain('Discovered Entities');

    // Apply button
    expect(html).toContain('data-testid="apply-import-btn"');
    expect(html).toContain('Apply Import into Model');
  });
});
