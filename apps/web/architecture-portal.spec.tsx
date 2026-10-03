import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArchitecturePortalModal } from './components/canvas/architecture-portal-panel';
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
  type FlowStep,
} from '@diagramhq/domain';

describe('Architecture Portal Canvas UI (F095)', () => {
  const archId = 'arch-portal-test' as ArchitectureId;
  const verId = 'ver-portal-v1' as VersionId;
  const wsId = 'ws-portal-main' as unknown as WorkspaceId;

  const coreSystemId = 'obj-core-banking-system' as unknown as ObjectId;
  const apiGatewayId = 'obj-api-gateway' as unknown as ObjectId;
  const ledgerDbId = 'obj-ledger-db' as unknown as ObjectId;
  const authComponentId = 'obj-auth-component' as unknown as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Titanium Financial Core',
      description: 'Interactive public exploration portal for enterprise clearing architecture.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0-rc',
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
        name: 'Core Banking System',
        description: 'Primary transaction clearing and account settlement engine.',
        metadata: { technology: 'Rust / Akka', owner: 'Core Platform Team', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGatewayId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'application',
        name: 'Public API Gateway',
        description: 'Edge reverse proxy handling routing and rate limiting.',
        metadata: { technology: 'Envoy / Go', owner: 'Edge Team', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ledgerDbId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'store',
        name: 'Distributed Ledger Database',
        description: 'High-reliability transactional ledger store.',
        metadata: { technology: 'CockroachDB / PostgreSQL', owner: 'Data Team', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: authComponentId,
        architectureId: archId,
        versionId: verId,
        parentId: apiGatewayId,
        kind: 'component',
        name: 'JWT Auth Validator',
        description: 'Validates cryptographic tokens and claims.',
        metadata: { technology: 'TypeScript / Rust FFI', owner: 'Security Team', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-1' as unknown as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGatewayId,
        targetObjectId: ledgerDbId,
        kind: 'sync',
        label: 'Direct ledger sync',
        metadata: { protocol: 'gRPC' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockViews: View[] = [
    {
      id: 'view-overview' as unknown as ViewId,
      architectureId: archId,
      name: 'System Landscape Overview',
      kind: 'context',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFlows: Flow[] = [
    {
      id: 'flow-checkout' as unknown as FlowId,
      architectureId: archId,
      name: 'Instant Payment Settlement Flow',
      description: 'End-to-end payment confirmation between edge gateway and ledger.',
      type: 'api_flow',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFlowSteps: FlowStep[] = [
    {
      id: 'step-1',
      flowId: 'flow-checkout' as unknown as FlowId,
      connectionId: 'con-1' as unknown as ConnectionId,
      stepIndex: 0,
      note: 'Submit Settlement Request: Client forwards signed payment payload through API Gateway.',
    },
    {
      id: 'step-2',
      flowId: 'flow-checkout' as unknown as FlowId,
      connectionId: 'con-1' as unknown as ConnectionId,
      stepIndex: 1,
      note: 'Commit to Distributed Ledger: Ledger cluster verifies consensus and confirms journal commit.',
    },
  ];

  const mockAdrs: ArchitectureDecisionRecord[] = [
    {
      id: 'dec-1' as unknown as DecisionId,
      number: 1,
      title: 'Adopt Multi-Region Distributed Transactions',
      status: 'accepted',
      context: 'Public portal transparency requires documenting database choice.',
      decision: 'Selected CockroachDB for multi-region replication.',
      consequences: 'Zero downtime failover across zones; adds consensus overhead.',
      alternatives: ['Single zone PostgreSQL'],
      attachments: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  it('renders nothing when closed', () => {
    const html = renderToString(
      <ArchitecturePortalModal
        isOpen={false}
        onClose={() => {}}
        model={mockModel}
      />
    );
    expect(html).toBe('');
  });

  it('renders public read-only explorer header and badge when opened', () => {
    const html = renderToString(
      <ArchitecturePortalModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        flows={mockFlows}
        views={mockViews}
        adrs={mockAdrs}
      />
    );

    // Public explorer banner
    expect(html).toContain('PUBLIC EXPLORER • NO ACCOUNT REQUIRED');
    expect(html).toContain('Titanium Financial Core');

    // Controls: Reset, Zoom, Fit View
    expect(html).toContain('Fit View');
    expect(html).toContain('data-testid="zoom-in-btn"');
    expect(html).toContain('data-testid="zoom-out-btn"');

    // C4 Breadcrumbs bar with current level badge
    expect(html).toContain('C4 LEVEL: CONTEXT');
    expect(html).toContain('System Context');
  });

  it('renders C4 system nodes and drill down indicators', () => {
    const html = renderToString(
      <ArchitecturePortalModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        flows={mockFlows}
        flowSteps={mockFlowSteps}
        views={mockViews}
        adrs={mockAdrs}
      />
    );

    // System context node should be rendered
    expect(html).toContain('Core Banking System');
    expect(html).toContain('Primary transaction clearing and account settlement engine.');
    expect(html).toContain('Rust / Akka');

    // Drill down action indicator on node card
    expect(html).toContain('Drill Down (2) →');
  });

  it('renders container level and object inspector when initialized with a target node', () => {
    const html = renderToString(
      <ArchitecturePortalModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        initialObjectId={apiGatewayId}
        flows={mockFlows}
        views={mockViews}
        adrs={mockAdrs}
      />
    );

    // In Container level, visible nodes are containers inside Core Banking System
    expect(html).toContain('C4 LEVEL: CONTAINER');
    expect(html).toContain('Public API Gateway');
    expect(html).toContain('Distributed Ledger Database');
    expect(html).toContain('Envoy / Go');

    // Object Inspector should be open displaying node details and metadata
    expect(html).toContain('data-testid="portal-object-inspector"');
    expect(html).toContain('Edge Team');
    expect(html).toContain('Outbound Dependencies (1)');
    expect(html).toContain('Direct ledger sync');
  });

  it('renders global search input and flow selector', () => {
    const html = renderToString(
      <ArchitecturePortalModal
        isOpen={true}
        onClose={() => {}}
        model={mockModel}
        flows={mockFlows}
        flowSteps={mockFlowSteps}
        views={mockViews}
        adrs={mockAdrs}
      />
    );

    // Global search input
    expect(html).toContain('Search systems, components, flows, ADRs...');
    expect(html).toContain('data-testid="portal-search-input"');

    // Flow selection dropdown
    expect(html).toContain('Explore Execution Flow...');
    expect(html).toContain('Instant Payment Settlement Flow');
  });
});
