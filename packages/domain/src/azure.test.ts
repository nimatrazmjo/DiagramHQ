import { describe, expect, it } from 'vitest';
import {
  ALL_AZURE_RESOURCE_TYPES,
  createMockAzureSubscription,
  determineConnectionKindForAzure,
  determineObjectKindForAzure,
  importAzureSubscription,
  parseAzureResourceId,
} from './azure';
import type { ArchitectureId, VersionId } from './ids';

describe('F079 — Azure Infrastructure Integration', () => {
  const archId = 'arch-azure-prod' as ArchitectureId;
  const verId = 'ver-v1-main' as VersionId;

  describe('parseAzureResourceId', () => {
    it('correctly parses standard Azure Resource IDs', () => {
      const resId =
        '/subscriptions/a1b2c3d4-e5f6-7890-abcd-1234567890ab/resourceGroups/rg-prod/providers/Microsoft.Web/sites/app-orders-api';

      const parsed = parseAzureResourceId(resId);
      expect(parsed).toEqual({
        subscriptionId: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
        resourceGroup: 'rg-prod',
        provider: 'Microsoft.Web',
        resourceType: 'sites',
        resourceName: 'app-orders-api',
      });
    });

    it('returns null for invalid or non-Azure resource ID strings', () => {
      expect(parseAzureResourceId('not-an-azure-id')).toBeNull();
      expect(parseAzureResourceId('/subscriptions/too-short')).toBeNull();
    });
  });

  describe('determineObjectKindForAzure & determineConnectionKindForAzure', () => {
    it('maps all canonical Azure resource types to valid ModelObject kinds', () => {
      for (const type of ALL_AZURE_RESOURCE_TYPES) {
        const kind = determineObjectKindForAzure(type);
        expect(['group', 'store', 'application', 'component']).toContain(kind);
      }

      expect(determineObjectKindForAzure('vnet')).toBe('group');
      expect(determineObjectKindForAzure('sql_database')).toBe('store');
      expect(determineObjectKindForAzure('cosmos_db')).toBe('store');
      expect(determineObjectKindForAzure('storage_account')).toBe('store');
      expect(determineObjectKindForAzure('vm')).toBe('application');
      expect(determineObjectKindForAzure('app_service')).toBe('application');
      expect(determineObjectKindForAzure('function_app')).toBe('application');
      expect(determineObjectKindForAzure('aks')).toBe('application');
      expect(determineObjectKindForAzure('container_app')).toBe('application');
      expect(determineObjectKindForAzure('front_door')).toBe('application');
      expect(determineObjectKindForAzure('api_management')).toBe('application');
      expect(determineObjectKindForAzure('service_bus')).toBe('component');
      expect(determineObjectKindForAzure('event_hubs')).toBe('component');
      expect(determineObjectKindForAzure('event_grid')).toBe('component');
    });

    it('determines appropriate connection kinds based on service topology', () => {
      const fdToApim = determineConnectionKindForAzure('front_door', 'api_management');
      expect(fdToApim.kind).toBe('sync');

      const appToSql = determineConnectionKindForAzure('app_service', 'sql_database');
      expect(appToSql.kind).toBe('data');

      const appToSb = determineConnectionKindForAzure('app_service', 'service_bus');
      expect(appToSb.kind).toBe('async');
    });
  });

  describe('importAzureSubscription (Mock Subscription Acceptance Test)', () => {
    it('imports a mocked subscription and verifies all canonical Azure resources are mapped', () => {
      const mockSub = createMockAzureSubscription();
      const result = importAzureSubscription(mockSub, {
        architectureId: archId,
        versionId: verId,
        includeVnetContainment: true,
        mapConnections: true,
      });

      // Verify all canonical types were mapped
      for (const type of ALL_AZURE_RESOURCE_TYPES) {
        expect(result.resourcesByType[type]).toBeGreaterThan(0);
      }

      expect(result.scannedCount).toBe(mockSub.resources.length);
      expect(result.mappedObjectCount).toBe(mockSub.resources.length);
      expect(result.mappedConnectionCount).toBeGreaterThan(0);
      expect(result.unmappedResources).toHaveLength(0);

      // Verify VNet group and containment
      const vnetObj = result.objects.find((o) => o.metadata?.azureResourceType === 'vnet');
      expect(vnetObj).toBeDefined();
      expect(vnetObj?.kind).toBe('group');

      // Resources in the VNet should have parentId pointing to the VNet
      const sqlObj = result.objects.find((o) => o.metadata?.azureResourceType === 'sql_database');
      expect(sqlObj).toBeDefined();
      expect(sqlObj?.parentId).toBe(vnetObj?.id);

      // Verify inter-resource connections derived
      expect(result.connections.length).toBeGreaterThanOrEqual(5);

      // Verify evidence generated for each object
      expect(result.evidence.length).toBe(result.mappedObjectCount);
      for (const ev of result.evidence) {
        expect(ev.sourceType).toBe('cloud_resource');
        expect(ev.confidence).toBeGreaterThan(0.9);
      }
    });

    it('applies location and resource type filters during import', () => {
      const mockSub = createMockAzureSubscription();

      const filteredResult = importAzureSubscription(mockSub, {
        architectureId: archId,
        versionId: verId,
        resourceTypeFilter: ['app_service', 'sql_database', 'cosmos_db'],
      });

      expect(filteredResult.mappedObjectCount).toBe(3);
      expect(filteredResult.resourcesByType.app_service).toBe(1);
      expect(filteredResult.resourcesByType.sql_database).toBe(1);
      expect(filteredResult.resourcesByType.cosmos_db).toBe(1);
      expect(filteredResult.resourcesByType.vm).toBe(0);
    });

    it('supports disabling VNet containment and connection mapping', () => {
      const mockSub = createMockAzureSubscription();

      const flatResult = importAzureSubscription(mockSub, {
        architectureId: archId,
        versionId: verId,
        includeVnetContainment: false,
        mapConnections: false,
      });

      expect(flatResult.mappedConnectionCount).toBe(0);
      for (const obj of flatResult.objects) {
        expect(obj.parentId).toBeNull();
      }
    });
  });
});
