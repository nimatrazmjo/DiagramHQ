import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PlantUmlModal } from './components/canvas/plantuml-modal';
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

describe('PlantUML Integration Canvas UI (F098)', () => {
  const archId = 'arch-puml-test' as ArchitectureId;
  const verId = 'ver-puml-v1' as VersionId;
  const wsId = 'ws-puml-main' as unknown as WorkspaceId;

  const webAppId = 'obj-puml-web' as unknown as ObjectId;
  const apiGwId = 'obj-puml-api' as unknown as ObjectId;
  const dbId = 'obj-puml-db' as unknown as ObjectId;

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
        metadata: { technology: 'TypeScript / React' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGwId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'API Gateway',
        description: 'Gateway routing requests',
        metadata: { technology: 'Kong' },
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
        targetObjectId: apiGwId,
        kind: 'sync',
        label: 'HTTPS requests',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'con-2' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGwId,
        targetObjectId: dbId,
        kind: 'sync',
        label: 'SQL query',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const currentView: View = {
    id: 'view-puml' as unknown as ViewId,
    architectureId: archId,
    name: 'Container Overview',
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
    ],
  };

  it('renders nothing when closed', () => {
    const html = renderToString(
      <PlantUmlModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );
    expect(html).toBe('');
  });

  it('renders PlantUML modal dialog with tabs, flavor controls, and script preview', () => {
    const html = renderToString(
      <PlantUmlModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        flows={[mockFlow]}
      />,
    );

    // Modal title & subheader
    expect(html).toContain('PlantUML Integration');
    expect(html).toContain('Bidirectional PlantUML architecture diagram and execution flow');

    // Tabs
    expect(html).toContain('Export PlantUML');
    expect(html).toContain('Import PlantUML');

    // Flavor buttons
    expect(html).toContain('C4 Macro');
    expect(html).toContain('Component');
    expect(html).toContain('Sequence');

    // Direction buttons
    expect(html).toContain('Top to Bottom');
    expect(html).toContain('Left to Right');

    // Action buttons
    expect(html).toContain('Copy Script');
    expect(html).toContain('Download .puml File');

    // Generated PlantUML script output
    expect(html).toContain('data-testid="plantuml-export-output"');
    expect(html).toContain('@startuml');
    expect(html).toContain('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml');
    expect(html).toContain('Container(');
    expect(html).toContain('Web Portal');
    expect(html).toContain('API Gateway');
    expect(html).toContain('ContainerDb(');
    expect(html).toContain('User Database');
    expect(html).toContain('Rel(');
    expect(html).toContain('SHOW_LEGEND()');
    expect(html).toContain('@enduml');
  });

  it('renders node metrics and relationship statistics in export summary', () => {
    const html = renderToString(
      <PlantUmlModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
      />,
    );

    // Should indicate the target view and counts
    expect(html).toContain('Container Overview');
    expect(html).toContain('Nodes / Participants:');
    expect(html).toContain('Relationships / Steps:');
  });

  it('renders import tab with parser feedback, syntax indicator, and apply button', () => {
    const html = renderToString(
      <PlantUmlModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        currentView={currentView}
        initialTab="import"
      />,
    );

    // Textarea with initial sample script
    expect(html).toContain('data-testid="plantuml-import-textarea"');
    expect(html).toContain('Global Payments Architecture');

    // Parser statistics
    expect(html).toContain('Parser Analysis');
    expect(html).toContain('data-testid="parsed-diagram-type"');
    expect(html).toContain('c4');
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
