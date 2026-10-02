import { describe, expect, it } from 'vitest';
import { createId, type ObjectId } from './ids';
import type { ModelObject } from './types';
import {
  determineObjectKindForDiscoveredResource,
  inferCloudCategory,
  reconcileCloudResources,
  applyDiscoveryProposals,
  createMockCloudAccounts,
  createMockMultiCloudResources,
} from './cloud-discovery';

describe('Cloud Resource Discovery (F083)', () => {
  describe('Classification & Kind Mapping', () => {
    it('infers cloud resource categories correctly', () => {
      expect(inferCloudCategory('aws_rds_cluster')).toBe('database');
      expect(inferCloudCategory('azure_cosmos_db')).toBe('database');
      expect(inferCloudCategory('aws_s3_bucket')).toBe('storage');
      expect(inferCloudCategory('gcp_gcs_bucket')).toBe('storage');
      expect(inferCloudCategory('aws_vpc')).toBe('networking');
      expect(inferCloudCategory('azure_vnet')).toBe('networking');
      expect(inferCloudCategory('aws_sqs_queue')).toBe('messaging');
      expect(inferCloudCategory('gcp_pubsub_topic')).toBe('messaging');
      expect(inferCloudCategory('aws_kms_key')).toBe('security');
      expect(inferCloudCategory('aws_ecs_service')).toBe('compute');
    });

    it('maps cloud resources to correct C4 ModelObjectKind', () => {
      expect(determineObjectKindForDiscoveredResource('aws', 'aws_vpc', 'networking')).toBe('group');
      expect(determineObjectKindForDiscoveredResource('azure', 'azure_vnet', 'networking')).toBe('group');
      expect(determineObjectKindForDiscoveredResource('kubernetes', 'k8s_namespace', 'networking')).toBe('group');

      expect(determineObjectKindForDiscoveredResource('aws', 'aws_rds_cluster', 'database')).toBe('store');
      expect(determineObjectKindForDiscoveredResource('aws', 'aws_s3_bucket', 'storage')).toBe('store');

      expect(determineObjectKindForDiscoveredResource('aws', 'aws_lambda_function', 'compute')).toBe('component');
      expect(determineObjectKindForDiscoveredResource('gcp', 'gcp_cloud_function', 'compute')).toBe('component');

      expect(determineObjectKindForDiscoveredResource('aws', 'aws_ecs_service', 'compute')).toBe('application');
      expect(determineObjectKindForDiscoveredResource('azure', 'azure_app_service', 'compute')).toBe('application');
      expect(determineObjectKindForDiscoveredResource('gcp', 'gcp_cloud_run', 'compute')).toBe('application');
      expect(determineObjectKindForDiscoveredResource('kubernetes', 'k8s_deployment', 'compute')).toBe('application');
    });
  });

  describe('Multi-Account Live Resource Discovery & Proposal Generation', () => {
    const architectureId = createId('arch');
    const versionId = createId('ver');
    const accounts = createMockCloudAccounts();
    const liveResources = createMockMultiCloudResources();

    it('discovers live resources across accounts and proposes objects with grounded evidence (Acceptance Test)', () => {
      // Clean slate architecture (empty current model)
      const currentObjects: ModelObject[] = [];

      const report = reconcileCloudResources({
        architectureId,
        accounts,
        discoveredResources: liveResources,
        currentObjects,
      });

      expect(report.summary.totalDiscovered).toBe(liveResources.length);
      expect(report.summary.unmappedCount).toBe(liveResources.length);
      expect(report.proposals.length).toBe(liveResources.length);

      // Verify each proposal has valid action and concrete CloudDiscoveryEvidence
      for (const proposal of report.proposals) {
        expect(proposal.action).toBe('create');
        expect(proposal.status).toBe('pending');
        expect(proposal.evidence.sourceType).toBe('cloud_discovery');
        expect(proposal.evidence.confidence).toBeGreaterThanOrEqual(0.9);
        expect(proposal.evidence.resourceId).toBe(proposal.resource.id);
        expect(proposal.evidence.provider).toBe(proposal.resource.provider);
        expect(proposal.evidence.accountId).toBe(proposal.resource.accountId);
        expect(proposal.evidence.region).toBe(proposal.resource.region);
        expect(proposal.evidence.matchReason).toBeDefined();

        expect(proposal.proposedObject.name).toBe(proposal.resource.name);
        expect(proposal.proposedObject.kind).toBeDefined();
        expect(proposal.proposedObject.metadata['cloudProvider']).toBe(proposal.resource.provider);
        expect(proposal.proposedObject.metadata['accountId']).toBe(proposal.resource.accountId);
      }

      // Check providers represented
      expect(report.summary.byProvider.aws).toBeGreaterThan(0);
      expect(report.summary.byProvider.azure).toBeGreaterThan(0);
      expect(report.summary.byProvider.gcp).toBeGreaterThan(0);
      expect(report.summary.byProvider.kubernetes).toBeGreaterThan(0);
    });

    it('matches existing model objects and avoids duplicate creation proposals', () => {
      const vpcResource = liveResources.find((r) => r.resourceType === 'aws_vpc')!;
      const existingVpc: ModelObject = {
        id: createId('grp') as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: vpcResource.name,
        kind: 'group',
        description: 'Existing VPC',
        metadata: {
          cloudProvider: vpcResource.provider,
          accountId: vpcResource.accountId,
          resourceId: vpcResource.id,
          region: vpcResource.region,
          status: vpcResource.status,
          tags: ['provider:aws'],
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const report = reconcileCloudResources({
        architectureId,
        accounts,
        discoveredResources: liveResources,
        currentObjects: [existingVpc],
      });

      // VPC is matched and not proposed for re-creation
      expect(report.summary.matchedCount).toBe(1);
      expect(report.summary.unmappedCount).toBe(liveResources.length - 1);
      const vpcProposal = report.proposals.find((p) => p.resource.id === vpcResource.id);
      expect(vpcProposal).toBeUndefined(); // Exact match, no proposal needed
    });

    it('proposes updates when resource attributes change (e.g. region or status)', () => {
      const ecsResource = liveResources.find((r) => r.resourceType === 'aws_ecs_service')!;
      const existingEcs: ModelObject = {
        id: createId('app') as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: ecsResource.name,
        kind: 'application',
        description: 'Orders microservice',
        metadata: {
          cloudProvider: ecsResource.provider,
          accountId: ecsResource.accountId,
          resourceId: ecsResource.id,
          region: ecsResource.region,
          status: 'stopped', // Different status than live 'running'
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const report = reconcileCloudResources({
        architectureId,
        accounts,
        discoveredResources: liveResources,
        currentObjects: [existingEcs],
      });

      const updateProposal = report.proposals.find(
        (p) => p.action === 'update' && p.resource.id === ecsResource.id,
      );
      expect(updateProposal).toBeDefined();
      expect(updateProposal?.matchedObjectId).toBe(existingEcs.id);
      expect(updateProposal?.evidence.confidence).toBeGreaterThan(0.95);
      expect(updateProposal?.proposedObject.metadata['status']).toBe('running');
    });

    it('detects drifted/stale model objects whose backing resources are missing in cloud accounts', () => {
      // Existing model object pointing to an AWS resource that is no longer in liveResources
      const staleResourceId = 'arn:aws:ecs:us-east-1:123456789012:service/prod-cluster/legacy-auth-service';
      const staleObj: ModelObject = {
        id: createId('app') as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'legacy-auth-service',
        kind: 'application',
        description: 'Old decommissioned auth service',
        metadata: {
          cloudProvider: 'aws',
          accountId: '123456789012',
          resourceId: staleResourceId,
          region: 'us-east-1',
          resourceType: 'aws_ecs_service',
          category: 'compute',
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const report = reconcileCloudResources({
        architectureId,
        accounts,
        discoveredResources: liveResources,
        currentObjects: [staleObj],
      });

      expect(report.summary.staleCount).toBe(1);
      const staleProposal = report.proposals.find((p) => p.action === 'remove_stale');
      expect(staleProposal).toBeDefined();
      expect(staleProposal?.matchedObjectId).toBe(staleObj.id);
      expect(staleProposal?.evidence.resourceId).toBe(staleResourceId);
    });

    it('applies accepted proposals to generate new and updated ModelObjects', () => {
      const report = reconcileCloudResources({
        architectureId,
        accounts,
        discoveredResources: liveResources.slice(0, 3),
        currentObjects: [],
      });

      const acceptedIds = report.proposals.map((p) => p.id);
      const applied = applyDiscoveryProposals(report, acceptedIds, versionId);

      expect(applied.newObjects.length).toBe(3);
      for (const obj of applied.newObjects) {
        expect(obj.id).toMatch(/^(sys|app|sto|cmp|act|grp)_/);
        expect(obj.architectureId).toBe(architectureId);
        expect(obj.versionId).toBe(versionId);
        expect(obj.name).toBeDefined();
        expect(obj.kind).toBeDefined();
        expect(obj.metadata).toBeDefined();
      }
    });
  });
});
