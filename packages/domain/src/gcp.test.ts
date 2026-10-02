import { describe, expect, it } from 'vitest';
import {
  ALL_GCP_RESOURCE_TYPES,
  createMockGcpProject,
  determineConnectionKindForGcp,
  determineObjectKindForGcp,
  importGcpProject,
  parseGcpResourceUri,
} from './gcp';
import type { ArchitectureId, VersionId } from './ids';

describe('F080 — GCP Infrastructure Integration', () => {
  const archId = 'arch-gcp-prod' as ArchitectureId;
  const verId = 'ver-v1-main' as VersionId;

  describe('parseGcpResourceUri', () => {
    it('correctly parses standard GCP Resource URIs', () => {
      const uri =
        '//compute.googleapis.com/projects/my-prod-project/zones/us-central1-a/instances/vm-worker';

      const parsed = parseGcpResourceUri(uri);
      expect(parsed).toEqual({
        service: 'compute.googleapis.com',
        projectId: 'my-prod-project',
        location: 'us-central1-a',
        resourceType: 'instances',
        resourceName: 'vm-worker',
      });
    });

    it('returns null for invalid or malformed resource URIs', () => {
      expect(parseGcpResourceUri('invalid-non-uri')).toBeNull();
      expect(parseGcpResourceUri('//compute.googleapis.com/not-projects')).toBeNull();
    });
  });

  describe('determineObjectKindForGcp & determineConnectionKindForGcp', () => {
    it('maps all canonical GCP resource types to valid ModelObject kinds', () => {
      for (const type of ALL_GCP_RESOURCE_TYPES) {
        const kind = determineObjectKindForGcp(type);
        expect(['group', 'store', 'application', 'component']).toContain(kind);
      }

      expect(determineObjectKindForGcp('vpc')).toBe('group');
      expect(determineObjectKindForGcp('cloud_sql')).toBe('store');
      expect(determineObjectKindForGcp('spanner')).toBe('store');
      expect(determineObjectKindForGcp('bigtable')).toBe('store');
      expect(determineObjectKindForGcp('firestore')).toBe('store');
      expect(determineObjectKindForGcp('gcs')).toBe('store');
      expect(determineObjectKindForGcp('gce')).toBe('application');
      expect(determineObjectKindForGcp('gke')).toBe('application');
      expect(determineObjectKindForGcp('cloud_run')).toBe('application');
      expect(determineObjectKindForGcp('cloud_functions')).toBe('application');
      expect(determineObjectKindForGcp('app_engine')).toBe('application');
      expect(determineObjectKindForGcp('cloud_lb')).toBe('application');
      expect(determineObjectKindForGcp('cloud_cdn')).toBe('application');
      expect(determineObjectKindForGcp('api_gateway')).toBe('application');
      expect(determineObjectKindForGcp('pubsub')).toBe('component');
      expect(determineObjectKindForGcp('eventarc')).toBe('component');
      expect(determineObjectKindForGcp('cloud_tasks')).toBe('component');
    });

    it('determines appropriate connection kinds based on service topology', () => {
      const lbToGateway = determineConnectionKindForGcp('cloud_lb', 'api_gateway');
      expect(lbToGateway.kind).toBe('sync');

      const runToSql = determineConnectionKindForGcp('cloud_run', 'cloud_sql');
      expect(runToSql.kind).toBe('data');

      const runToPubsub = determineConnectionKindForGcp('cloud_run', 'pubsub');
      expect(runToPubsub.kind).toBe('async');
    });
  });

  describe('importGcpProject (Mock Project Acceptance Test)', () => {
    it('imports a mocked project and verifies all canonical GCP resources are mapped', () => {
      const mockProject = createMockGcpProject();
      const result = importGcpProject(mockProject, {
        architectureId: archId,
        versionId: verId,
        includeVpcContainment: true,
        mapConnections: true,
      });

      // Verify all canonical types were mapped
      for (const type of ALL_GCP_RESOURCE_TYPES) {
        expect(result.resourcesByType[type]).toBeGreaterThan(0);
      }

      expect(result.scannedCount).toBe(mockProject.resources.length);
      expect(result.mappedObjectCount).toBe(mockProject.resources.length);
      expect(result.mappedConnectionCount).toBeGreaterThan(0);
      expect(result.unmappedResources).toHaveLength(0);

      // Verify VPC group and containment
      const vpcObj = result.objects.find((o) => o.metadata?.gcpResourceType === 'vpc');
      expect(vpcObj).toBeDefined();
      expect(vpcObj?.kind).toBe('group');

      // Resources in the VPC should have parentId pointing to the VPC
      const sqlObj = result.objects.find((o) => o.metadata?.gcpResourceType === 'cloud_sql');
      expect(sqlObj).toBeDefined();
      expect(sqlObj?.parentId).toBe(vpcObj?.id);

      // Verify inter-resource connections derived
      expect(result.connections.length).toBeGreaterThanOrEqual(5);

      // Verify evidence generated for each object
      expect(result.evidence.length).toBe(result.mappedObjectCount);
      for (const ev of result.evidence) {
        expect(ev.sourceType).toBe('cloud_resource');
        expect(ev.confidence).toBeGreaterThan(0.9);
      }
    });

    it('applies region and resource type filters during import', () => {
      const mockProject = createMockGcpProject();

      const filteredResult = importGcpProject(mockProject, {
        architectureId: archId,
        versionId: verId,
        resourceTypeFilter: ['cloud_run', 'cloud_sql', 'spanner'],
      });

      expect(filteredResult.mappedObjectCount).toBe(3);
      expect(filteredResult.resourcesByType.cloud_run).toBe(1);
      expect(filteredResult.resourcesByType.cloud_sql).toBe(1);
      expect(filteredResult.resourcesByType.spanner).toBe(1);
      expect(filteredResult.resourcesByType.gce).toBe(0);
    });

    it('supports disabling VPC containment and connection mapping', () => {
      const mockProject = createMockGcpProject();

      const flatResult = importGcpProject(mockProject, {
        architectureId: archId,
        versionId: verId,
        includeVpcContainment: false,
        mapConnections: false,
      });

      expect(flatResult.mappedConnectionCount).toBe(0);
      for (const obj of flatResult.objects) {
        expect(obj.parentId).toBeNull();
      }
    });
  });
});
