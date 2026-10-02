import { describe, expect, it } from 'vitest';
import { createId, type ObjectId, type ConnectionId } from './ids';
import type { ArchitectureModel } from './types';
import {
  detectArchitectureDrift,
  reconcileDriftDirectly,
  ignoreDriftItem,
  createChangeRequestFromDrift,
} from './drift';

describe('Architecture Drift Engine (F084)', () => {
  const architectureId = createId('arch');
  const versionId = createId('ver');

  // Seeded documented model
  const documentedModel: ArchitectureModel = {
    architecture: {
      id: architectureId,
      workspaceId: createId('ws'),
      name: 'E-Commerce Platform',
      description: 'Documented architecture model',
      defaultVersionId: versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: versionId,
      architectureId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: 'obj_app_gateway' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Edge reverse proxy',
        metadata: { technology: 'Kong', status: 'running' },
        position: { x: 100, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_app_orders' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Service',
        kind: 'application',
        description: 'Orders microservice',
        metadata: { technology: 'Node.js', status: 'running' },
        position: { x: 300, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_sto_legacy_db' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Legacy MySQL DB',
        kind: 'store',
        description: 'Decommissioned database',
        metadata: { technology: 'MySQL 5.7', status: 'running' },
        position: { x: 500, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con_gw_orders' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_app_gateway' as unknown as ObjectId,
        targetObjectId: 'obj_app_orders' as unknown as ObjectId,
        kind: 'sync',
        label: 'HTTP Proxy',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'con_orders_legacy' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_app_orders' as unknown as ObjectId,
        targetObjectId: 'obj_sto_legacy_db' as unknown as ObjectId,
        kind: 'sync',
        label: 'Legacy SQL Query',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  // Seeded actual infrastructure / code discovery state
  const actualModel: ArchitectureModel = {
    architecture: documentedModel.architecture,
    version: documentedModel.version,
    objects: [
      // 1. API Gateway with attribute mismatch (technology changed from Kong to Envoy)
      {
        id: 'obj_app_gateway' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Edge reverse proxy (Envoy)',
        metadata: { technology: 'Envoy Proxy', status: 'running', arn: 'arn:aws:ecs:gw' },
        position: { x: 100, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2. Orders Service identical
      {
        id: 'obj_app_orders' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Service',
        kind: 'application',
        description: 'Orders microservice',
        metadata: { technology: 'Node.js', status: 'running', arn: 'arn:aws:ecs:orders' },
        position: { x: 300, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Note: Legacy MySQL DB is MISSING from actual (decommissioned)
      // 3. New Unmanaged Service: Payment Service
      {
        id: 'obj_app_payments' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Payment Service',
        kind: 'application',
        description: 'Discovered payment microservice',
        metadata: { technology: 'Go', cloudProvider: 'aws', arn: 'arn:aws:ecs:payments' },
        position: { x: 300, y: 300 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      // 1. Existing connection
      {
        id: 'con_gw_orders' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_app_gateway' as unknown as ObjectId,
        targetObjectId: 'obj_app_orders' as unknown as ObjectId,
        kind: 'sync',
        label: 'HTTP Proxy',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2. Undocumented connection from Orders Service to Payment Service
      {
        id: 'con_orders_payments' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_app_orders' as unknown as ObjectId,
        targetObjectId: 'obj_app_payments' as unknown as ObjectId,
        kind: 'sync',
        label: 'Process Charge',
        metadata: { sourceRef: 'orders/client.ts:42' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Note: con_orders_legacy is MISSING from actual
    ],
  };

  describe('Drift Detection & Delta Surfacing (Acceptance Criteria 1)', () => {
    it('compares documented vs actual state and surfaces all categories of drift', () => {
      const report = detectArchitectureDrift({
        architectureId,
        documentedModel,
        actualModel,
      });

      expect(report.architectureId).toBe(architectureId);
      expect(report.summary.totalDriftItems).toBeGreaterThanOrEqual(4);

      // 1. Unmanaged resource
      const unmanaged = report.driftItems.find((d) => d.type === 'unmanaged_resource')!;
      expect(unmanaged).toBeDefined();
      expect(unmanaged.actualEntity?.name).toBe('Payment Service');
      expect(unmanaged.evidence.sourceType).toBe('cloud_discovery');
      expect(unmanaged.status).toBe('detected');

      // 2. Missing resource
      const missing = report.driftItems.find((d) => d.type === 'missing_resource')!;
      expect(missing).toBeDefined();
      expect(missing.documentedEntity?.name).toBe('Legacy MySQL DB');
      expect(missing.severity).toBe('critical'); // Datastore deletion is critical

      // 3. Attribute mismatch
      const mismatch = report.driftItems.find((d) => d.type === 'attribute_mismatch')!;
      expect(mismatch).toBeDefined();
      expect(mismatch.documentedEntity?.name).toBe('API Gateway');
      expect(mismatch.attributeDiffs).toContainEqual({
        attribute: 'technology',
        documentedValue: 'Kong',
        actualValue: 'Envoy Proxy',
      });

      // 4. Undocumented connection
      const undocConn = report.driftItems.find((d) => d.type === 'undocumented_connection')!;
      expect(undocConn).toBeDefined();
      expect(undocConn.actualEntity?.name).toBe('Process Charge');

      // 5. Missing connection
      const misConn = report.driftItems.find((d) => d.type === 'missing_connection')!;
      expect(misConn).toBeDefined();
      expect(misConn.documentedEntity?.name).toBe('Legacy SQL Query');
    });
  });

  describe('Action 1: Update Model (reconcileDriftDirectly)', () => {
    it('directly updates the documented model with selected drift items', () => {
      const report = detectArchitectureDrift({
        architectureId,
        documentedModel,
        actualModel,
      });

      const allDriftIds = report.driftItems.map((d) => d.id);
      const reconciledModel = reconcileDriftDirectly({
        documentedModel,
        actualModel,
        driftItemIdsToReconcile: allDriftIds,
        report,
      });

      // Payment Service is added
      expect(reconciledModel.objects.some((o) => o.name === 'Payment Service')).toBe(true);
      // Legacy MySQL DB is removed
      expect(reconciledModel.objects.some((o) => o.name === 'Legacy MySQL DB')).toBe(false);
      // API Gateway technology is updated
      const gw = reconciledModel.objects.find((o) => o.name === 'API Gateway')!;
      expect(gw.metadata?.['technology']).toBe('Envoy Proxy');
      // Undocumented connection is added
      expect(reconciledModel.connections.some((c) => c.label === 'Process Charge')).toBe(true);
      // Missing connection is removed
      expect(reconciledModel.connections.some((c) => c.label === 'Legacy SQL Query')).toBe(false);

      // Verify status of drift items updated to reconciled
      for (const item of report.driftItems) {
        expect(item.status).toBe('reconciled');
      }
    });
  });

  describe('Action 2: Ignore (ignoreDriftItem)', () => {
    it('suppresses a drift item with reason and timestamp', () => {
      const report = detectArchitectureDrift({
        architectureId,
        documentedModel,
        actualModel,
      });

      const mismatch = report.driftItems.find((d) => d.type === 'attribute_mismatch')!;
      const ignored = ignoreDriftItem(report, mismatch.id, 'Temporary migration in progress');

      expect(ignored).toBeDefined();
      expect(ignored?.status).toBe('ignored');
      expect(ignored?.ignoreReason).toBe('Temporary migration in progress');
    });
  });

  describe('Action 3: Create Change Request (Acceptance Test)', () => {
    it('seeded drift detected; create-change-request produces a PR', () => {
      // 1. Detect seeded drift
      const report = detectArchitectureDrift({
        architectureId,
        documentedModel,
        actualModel,
      });

      expect(report.driftItems.length).toBeGreaterThan(0);

      // 2. Execute create-change-request
      const author = { id: 'usr_architect', name: 'Lead Architect', email: 'architect@diagramhq.com' };
      const pr = createChangeRequestFromDrift({
        report,
        documentedModel,
        actualModel,
        author,
        title: 'Reconcile Live Infrastructure Drift',
        description: 'Synchronize architecture model with discovered AWS ECS & Envoy proxies.',
      });

      // 3. Verify PR properties and artifacts
      expect(pr).toBeDefined();
      expect(pr.id).toMatch(/^pr_/);
      expect(pr.status).toBe('open');
      expect(pr.title).toBe('Reconcile Live Infrastructure Drift');
      expect(pr.author.name).toBe('Lead Architect');

      // Verify visual diff and change set generated
      expect(pr.diff.counts.added).toBeGreaterThan(0);
      expect(pr.diff.counts.removed).toBeGreaterThan(0);
      expect(pr.diff.counts.modified).toBeGreaterThan(0);

      // Verify risk score computed
      expect(pr.risk).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(pr.risk.level);

      // Verify drift items marked as pr_created and linked to PR
      for (const item of report.driftItems) {
        expect(item.status).toBe('pr_created');
        expect(item.pullRequestId).toBe(pr.id);
      }
    });
  });
});
