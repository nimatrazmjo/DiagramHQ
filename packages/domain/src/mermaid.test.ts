import { describe, it, expect } from 'vitest';
import {
  toMermaidId,
  sanitizeMermaidLabel,
  formatMermaidNodeShape,
  exportViewToMermaidFlowchart,
  exportFlowToMermaid,
  importMermaidFlowchart,
  importMermaidSequence,
} from './mermaid';
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
} from './types';

describe('Mermaid Export & Import Engine (F097)', () => {
  const archId = createId<'arch'>('arch') as ArchitectureId;
  const verId = createId<'ver'>('ver') as VersionId;
  const wsId = createId<'ws'>('ws') as WorkspaceId;

  const coreSystemId = createId<'obj'>('obj') as ObjectId;
  const apiGatewayId = createId<'obj'>('obj') as ObjectId;
  const ledgerDbId = createId<'obj'>('obj') as ObjectId;
  const customerActorId = createId<'obj'>('obj') as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'Titanium Financial Core',
      description: 'Distributed ledger architecture.',
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
        name: 'Core Banking System',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: apiGatewayId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'application',
        name: 'Edge API Gateway',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ledgerDbId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'store',
        name: 'Ledger Journal Database',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: customerActorId,
        architectureId: archId,
        versionId: verId,
        kind: 'actor',
        name: 'Retail Customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: createId<'con'>('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: apiGatewayId,
        targetObjectId: ledgerDbId,
        kind: 'sync',
        label: 'Direct ledger sync',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId<'con'>('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: customerActorId,
        targetObjectId: apiGatewayId,
        kind: 'sync',
        label: 'Submit transfer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const containerView: View = {
    id: createId<'view'>('view') as ViewId,
    architectureId: archId,
    name: 'Core System Containers',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Mermaid Syntax Helpers', () => {
    it('sanitizes identifiers for safe Mermaid tokens', () => {
      expect(toMermaidId('obj-service-123')).toBe('obj_service_123');
      expect(toMermaidId('_hidden_node')).toBe('id_hidden_node');
    });

    it('sanitizes label strings', () => {
      expect(sanitizeMermaidLabel('Test "with quotes" and\nnewlines')).toBe("Test 'with quotes' and newlines");
    });

    it('formats node shapes according to architectural kind', () => {
      expect(formatMermaidNodeShape('n1', 'Postgres', 'store')).toBe('n1[("Postgres")]');
      expect(formatMermaidNodeShape('n2', 'User', 'actor')).toBe('n2(["User"])');
      expect(formatMermaidNodeShape('n3', 'AuthModule', 'component')).toBe('n3[["AuthModule"]]');
      expect(formatMermaidNodeShape('n4', 'WebGateway', 'application')).toBe('n4["WebGateway"]');
    });
  });

  describe('Flowchart Exporter', () => {
    it('exports container view into Mermaid flowchart with subgraphs and styling', () => {
      const mermaid = exportViewToMermaidFlowchart(containerView, mockModel, {
        direction: 'TB',
        includeStyles: true,
        groupSubgraphs: true,
      });

      expect(mermaid).toContain('flowchart TB');
      expect(mermaid).toContain('Edge API Gateway');
      expect(mermaid).toContain('Ledger Journal Database');
      expect(mermaid).toContain('Direct ledger sync');
      expect(mermaid).toContain('classDef store');
      expect(mermaid).toContain('classDef application');
    });
  });

  describe('Sequence Exporter', () => {
    it('exports flow with steps into Mermaid sequence diagram', () => {
      const flowId = createId<'flow'>('flow') as FlowId;
      const connId = mockModel.connections[0].id;

      const flow: FlowWithSteps = {
        id: flowId,
        architectureId: archId,
        name: 'Instant Payment Settlement Flow',
        type: 'sequence',
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: 'step-1',
            flowId,
            connectionId: connId,
            stepIndex: 0,
            note: 'Verify account balance and write ledger journal',
            statusCode: 200,
          },
        ],
      };

      const mermaid = exportFlowToMermaid(flow, mockModel.objects, mockModel.connections);

      expect(mermaid).toContain('sequenceDiagram');
      expect(mermaid).toContain('autonumber');
      expect(mermaid).toContain('Edge API Gateway');
      expect(mermaid).toContain('Ledger Journal Database');
      expect(mermaid).toContain('Verify account balance and write ledger journal');
      expect(mermaid).toContain('200');
    });
  });

  describe('Flowchart Importer', () => {
    it('imports Mermaid flowchart script into DiagramHQ objects and connections', () => {
      const script = `
        flowchart TB
          subgraph cluster_bank ["Core Banking Platform"]
            app_gw["Edge Gateway"]
            db_ledger[("Ledger CockroachDB")]
          end
          app_gw -->|"Transacts"| db_ledger
      `;

      const result = importMermaidFlowchart(script, archId, verId);

      expect(result.success).toBe(true);
      expect(result.objects.length).toBeGreaterThanOrEqual(3);

      const gateway = result.objects.find((o) => o.name === 'Edge Gateway');
      const db = result.objects.find((o) => o.name === 'Ledger CockroachDB');
      const cluster = result.objects.find((o) => o.name === 'Core Banking Platform');

      expect(gateway).toBeTruthy();
      expect(db).toBeTruthy();
      expect(cluster).toBeTruthy();

      expect(db?.kind).toBe('store');
      expect(gateway?.parentId).toBe(cluster?.id);
      expect(db?.parentId).toBe(cluster?.id);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].sourceObjectId).toBe(gateway?.id);
      expect(result.connections[0].targetObjectId).toBe(db?.id);
      expect(result.connections[0].label).toBe('Transacts');
    });
  });

  describe('Sequence Importer', () => {
    it('imports Mermaid sequence diagram into Flow and FlowSteps', () => {
      const script = `
        sequenceDiagram
          autonumber
          actor Client as Mobile User
          participant Gateway as Edge Gateway
          participant Core as Core Banking Service
          Client->>Gateway: POST /transfers
          Note over Gateway: Validate token
          Gateway->>Core: RPC ExecuteTransfer
          Core-->>Gateway: 201 Created
      `;

      const result = importMermaidSequence(script, archId, verId, 'Mobile Transfer Flow');

      expect(result.success).toBe(true);
      expect(result.diagramType).toBe('sequence');
      expect(result.flow).toBeTruthy();
      expect(result.flow?.name).toBe('Mobile Transfer Flow');
      expect(result.flow?.steps).toHaveLength(3);

      const client = result.objects.find((o) => o.name === 'Mobile User');
      const gateway = result.objects.find((o) => o.name === 'Edge Gateway');

      expect(client?.kind).toBe('actor');
      expect(gateway?.kind).toBe('system');
      expect(result.connections).toHaveLength(3);
    });
  });

  describe('Round-Trip Preservations', () => {
    it('preserves flowchart topology on export and re-import', () => {
      // 1. Export view to Mermaid
      const exported = exportViewToMermaidFlowchart(containerView, mockModel);
      // 2. Import Mermaid script
      const imported = importMermaidFlowchart(exported, archId, verId);

      expect(imported.success).toBe(true);
      // Check that the container entities were re-parsed
      const hasGateway = imported.objects.some((o) => o.name === 'Edge API Gateway');
      const hasDb = imported.objects.some((o) => o.name === 'Ledger Journal Database');
      expect(hasGateway).toBe(true);
      expect(hasDb).toBe(true);
      expect(imported.connections.length).toBeGreaterThanOrEqual(1);
    });
  });
});
