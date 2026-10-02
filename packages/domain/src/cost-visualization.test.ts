import { describe, expect, it } from 'vitest';
import { createId, type ObjectId } from './ids';
import type { ModelObject } from './types';
import {
  attachCostToObject,
  calculateServiceCostRollup,
  calculateArchitectureCostReport,
  createMockCostDataset,
  type ResourceCost,
} from './cost-visualization';

describe('Cost Visualization (F128)', () => {
  const architectureId = createId('arch');
  const versionId = createId('ver');

  const sampleObjects: ModelObject[] = [
    {
      id: createId('app') as unknown as ObjectId,
      architectureId,
      versionId,
      parentId: null,
      name: 'Order API Service',
      kind: 'application',
      description: 'Main checkout and orders service',
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('sto') as unknown as ObjectId,
      architectureId,
      versionId,
      parentId: null,
      name: 'Orders Aurora PostgreSQL',
      kind: 'store',
      description: 'Relational database store',
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('sto') as unknown as ObjectId,
      architectureId,
      versionId,
      parentId: null,
      name: 'Customer S3 Bucket Storage',
      kind: 'store',
      description: 'Document archive bucket',
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('grp') as unknown as ObjectId,
      architectureId,
      versionId,
      parentId: null,
      name: 'Production VPC Network',
      kind: 'group',
      description: 'VPC network boundary and NAT gateways',
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('Cost Attachment & Metadata Immutability', () => {
    it('attaches cost and traceable evidence to a ModelObject without mutating original', () => {
      const obj = sampleObjects[0];
      const cost: ResourceCost = {
        objectId: obj.id,
        name: obj.name,
        category: 'compute',
        monthlyCost: 150.0,
        hourlyRate: 0.205,
        currency: 'USD',
        billingPeriod: '2026-10',
        provider: 'aws',
        breakdown: { baseCompute: 120, storage: 15, dataTransfer: 15 },
        evidence: {
          sourceType: 'cloud_billing',
          provider: 'aws',
          billingAccountId: 'ba-123456',
          meterId: 'meter-compute-01',
          currency: 'USD',
          recordedAt: new Date().toISOString(),
        },
      };

      const withCost = attachCostToObject(obj, cost);

      expect(withCost).not.toBe(obj);
      expect(withCost.metadata?.['cost']).toBeDefined();
      const meta = withCost.metadata?.['cost'] as ResourceCost;
      expect(meta.monthlyCost).toBe(150.0);
      expect(meta.evidence.meterId).toBe('meter-compute-01');
      expect(meta.evidence.sourceType).toBe('cloud_billing');
      // Original object unchanged
      expect(obj.metadata?.['cost']).toBeUndefined();
    });
  });

  describe('Service Cost Rollup & Category Breakdown (Acceptance Test)', () => {
    it('attaches mocked cost data to infra objects and rolls up per service across compute/db/storage/networking', () => {
      // 1. Generate mocked cost dataset across sample infra objects
      const costs = createMockCostDataset(architectureId, sampleObjects);

      expect(costs).toHaveLength(4);
      for (const cost of costs) {
        expect(cost.monthlyCost).toBeGreaterThan(0);
        expect(cost.hourlyRate).toBeGreaterThan(0);
        expect(cost.evidence.sourceType).toBe('cloud_billing');
        expect(cost.evidence.billingAccountId).toBeDefined();
      }

      // 2. Calculate per-service rollup
      const rollups = calculateServiceCostRollup(costs, 'USD');

      expect(rollups).toHaveLength(4);

      // Verify each service has rolled up totals and category allocations
      const orderApi = rollups.find((r) => r.serviceName === 'Order API Service')!;
      expect(orderApi).toBeDefined();
      expect(orderApi.totalMonthly).toBeGreaterThan(0);
      expect(orderApi.byCategory.compute).toBeGreaterThan(0);

      const dbService = rollups.find((r) => r.serviceName === 'Orders Aurora PostgreSQL')!;
      expect(dbService).toBeDefined();
      expect(dbService.byCategory.database).toBeGreaterThan(0);

      const s3Storage = rollups.find((r) => r.serviceName === 'Customer S3 Bucket Storage')!;
      expect(s3Storage).toBeDefined();
      expect(s3Storage.byCategory.storage).toBeGreaterThan(0);

      const vpcNetwork = rollups.find((r) => r.serviceName === 'Production VPC Network')!;
      expect(vpcNetwork).toBeDefined();
      expect(vpcNetwork.byCategory.networking).toBeGreaterThan(0);
    });

    it('aggregates multiple resource items under the same service name', () => {
      const costs: ResourceCost[] = [
        {
          objectId: createId('app') as unknown as ObjectId,
          name: 'Search Cluster',
          category: 'compute',
          monthlyCost: 200.0,
          hourlyRate: 0.274,
          currency: 'USD',
          billingPeriod: '2026-10',
          provider: 'aws',
          evidence: {
            sourceType: 'cloud_billing',
            provider: 'aws',
            billingAccountId: 'ba-01',
            meterId: 'meter-node-1',
            currency: 'USD',
            recordedAt: new Date().toISOString(),
          },
        },
        {
          objectId: createId('sto') as unknown as ObjectId,
          name: 'Search Cluster',
          category: 'storage',
          monthlyCost: 80.0,
          hourlyRate: 0.11,
          currency: 'USD',
          billingPeriod: '2026-10',
          provider: 'aws',
          evidence: {
            sourceType: 'cloud_billing',
            provider: 'aws',
            billingAccountId: 'ba-01',
            meterId: 'meter-ebs-1',
            currency: 'USD',
            recordedAt: new Date().toISOString(),
          },
        },
      ];

      const rollups = calculateServiceCostRollup(costs);
      expect(rollups).toHaveLength(1);
      const search = rollups[0];
      expect(search.serviceName).toBe('Search Cluster');
      expect(search.totalMonthly).toBe(280.0);
      expect(search.byCategory.compute).toBe(200.0);
      expect(search.byCategory.storage).toBe(80.0);
      expect(search.itemCount).toBe(2);
    });
  });

  describe('Architecture Cost Report Generation', () => {
    it('produces architecture-wide summary with provider and category totals', () => {
      const costs = createMockCostDataset(architectureId, sampleObjects);
      const report = calculateArchitectureCostReport({
        architectureId,
        versionId,
        objects: sampleObjects,
        costs,
        currency: 'USD',
      });

      expect(report.architectureId).toBe(architectureId);
      expect(report.versionId).toBe(versionId);
      expect(report.currency).toBe('USD');
      expect(report.totalMonthlyCost).toBeGreaterThan(0);
      expect(report.totalHourlyCost).toBeGreaterThan(0);

      // Verify category rollups
      expect(report.byCategory.compute).toBeGreaterThan(0);
      expect(report.byCategory.database).toBeGreaterThan(0);
      expect(report.byCategory.storage).toBeGreaterThan(0);
      expect(report.byCategory.networking).toBeGreaterThan(0);

      // Verify service rollups
      expect(report.byService).toHaveLength(4);
      expect(report.byProvider['aws']).toBe(report.totalMonthlyCost);
    });
  });
});
