/**
 * DiagramHQ - Cloud Resource Discovery (F083)
 *
 * Live multi-cloud resource discovery and architecture proposal engine:
 * - Discovers live infrastructure resources across accounts and subscriptions
 *   (AWS, Azure, GCP, Kubernetes)
 * - Classifies resources into categories (compute, database, storage, networking, messaging, security)
 * - Reconciles live resources against existing architecture model objects:
 *   - Proposes new ModelObjects with concrete CloudDiscoveryEvidence for unmapped resources
 *   - Proposes updates for modified or reconfigured resources
 *   - Identifies drifted/stale model objects whose backing resources no longer exist
 * - Preserves rigorous, grounded evidence with confidence ratings and audit timestamps
 *
 * Strict Acceptance Criteria:
 * - Discover live resources across accounts; propose objects with evidence
 * - Test: discovery proposes resources with evidence.
 */

import { createId, type ArchitectureId, type ObjectId, type VersionId } from './ids';
import type { ModelObject, ObjectKind } from './types';

// ============================================================================
// Types
// ============================================================================

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'kubernetes';

export const ALL_CLOUD_PROVIDERS: readonly CloudProvider[] = [
  'aws',
  'azure',
  'gcp',
  'kubernetes',
] as const;

export type CloudResourceCategory =
  | 'compute'
  | 'database'
  | 'storage'
  | 'networking'
  | 'messaging'
  | 'security';

export const ALL_CLOUD_CATEGORIES: readonly CloudResourceCategory[] = [
  'compute',
  'database',
  'storage',
  'networking',
  'messaging',
  'security',
] as const;

export type CloudAccountStatus = 'active' | 'scanning' | 'error' | 'disconnected';

export interface CloudAccountSpec {
  id: string;
  name: string;
  provider: CloudProvider;
  accountIdentifier: string; // e.g., AWS 12-digit account, Azure Subscription GUID, GCP Project ID, K8s cluster
  regions: string[];
  tags?: Record<string, string>;
  status: CloudAccountStatus;
  lastScannedAt?: string | null;
}

export type ResourceRuntimeStatus =
  | 'running'
  | 'stopped'
  | 'provisioning'
  | 'terminating'
  | 'healthy'
  | 'unknown';

export interface DiscoveredCloudResource {
  id: string; // Globally unique ID, ARN, Azure Resource ID, GCP selfLink, or K8s UID
  name: string;
  provider: CloudProvider;
  accountId: string;
  accountName: string;
  resourceType: string; // e.g. 'aws_ecs_service', 'azure_sql_server', 'gcp_cloud_run', 'k8s_deployment'
  category: CloudResourceCategory;
  suggestedKind: ObjectKind;
  region: string;
  networkScope?: string; // e.g. VPC ID, VNet name, K8s namespace
  tags: Record<string, string>;
  status: ResourceRuntimeStatus;
  rawProperties?: Record<string, unknown>;
  discoveredAt: string;
}

export interface CloudDiscoveryEvidence {
  sourceType: 'cloud_discovery';
  provider: CloudProvider;
  accountId: string;
  accountName: string;
  resourceId: string;
  resourceType: string;
  region: string;
  category: CloudResourceCategory;
  confidence: number; // 0.0 to 1.0
  discoveredAt: string;
  matchReason: string;
}

export type ProposalAction = 'create' | 'update' | 'remove_stale';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export interface ProposedModelObjectData {
  name: string;
  kind: ObjectKind;
  description: string;
  parentId?: ObjectId | null;
  tags?: string[];
  metadata: Record<string, unknown>;
}

export interface CloudDiscoveryProposal {
  id: string;
  action: ProposalAction;
  status: ProposalStatus;
  resource: DiscoveredCloudResource;
  matchedObjectId?: ObjectId | null;
  proposedObject: ProposedModelObjectData;
  evidence: CloudDiscoveryEvidence;
  explanation: string;
}

export interface DiscoveryReconciliationSummary {
  totalDiscovered: number;
  unmappedCount: number; // Creates
  updatedCount: number; // Updates
  staleCount: number; // Drifts/stale
  matchedCount: number; // Unchanged existing
  byProvider: Record<CloudProvider, number>;
  byCategory: Record<CloudResourceCategory, number>;
}

export interface DiscoveryRunReport {
  runId: string;
  architectureId: ArchitectureId;
  accounts: CloudAccountSpec[];
  proposals: CloudDiscoveryProposal[];
  summary: DiscoveryReconciliationSummary;
  executedAt: string;
}

// ============================================================================
// Classification & Mapping
// ============================================================================

/**
 * Determines the target ModelObjectKind for a cloud resource type.
 */
export function determineObjectKindForDiscoveredResource(
  provider: CloudProvider,
  resourceType: string,
  category: CloudResourceCategory,
): ObjectKind {
  const normType = resourceType.toLowerCase();

  // Datastores and storage map to store
  if (
    category === 'database' ||
    category === 'storage' ||
    normType.includes('db') ||
    normType.includes('sql') ||
    normType.includes('bucket') ||
    normType.includes('redis') ||
    normType.includes('cache') ||
    normType.includes('table')
  ) {
    return 'store';
  }

  // Networks, VPCs, Container Clusters, Resource Groups map to group
  if (
    normType.includes('vpc') ||
    normType.includes('vnet') ||
    normType.includes('network') ||
    normType.includes('cluster') ||
    normType.includes('namespace') ||
    normType.includes('resource_group')
  ) {
    return 'group';
  }

  // Components (lambdas, functions, handlers)
  if (
    normType.includes('function') ||
    normType.includes('lambda') ||
    normType.includes('cloud_function')
  ) {
    return 'component';
  }

  // Workloads, VMs, Containers, Services, Ingress, Gateways map to application
  return 'application';
}

/**
 * Categorizes a cloud resource based on its type name.
 */
export function inferCloudCategory(resourceType: string): CloudResourceCategory {
  const norm = resourceType.toLowerCase();

  if (
    norm.includes('db') ||
    norm.includes('sql') ||
    norm.includes('rds') ||
    norm.includes('dynamo') ||
    norm.includes('cosmos') ||
    norm.includes('spanner') ||
    norm.includes('bigtable') ||
    norm.includes('firestore') ||
    norm.includes('redis') ||
    norm.includes('cache')
  ) {
    return 'database';
  }

  if (
    norm.includes('s3') ||
    norm.includes('bucket') ||
    norm.includes('storage') ||
    norm.includes('blob') ||
    norm.includes('gcs') ||
    norm.includes('pv')
  ) {
    return 'storage';
  }

  if (
    norm.includes('vpc') ||
    norm.includes('vnet') ||
    norm.includes('subnet') ||
    norm.includes('load_balancer') ||
    norm.includes('alb') ||
    norm.includes('nlb') ||
    norm.includes('gateway') ||
    norm.includes('cloudfront') ||
    norm.includes('front_door') ||
    norm.includes('ingress') ||
    norm.includes('route') ||
    norm.includes('cdn')
  ) {
    return 'networking';
  }

  if (
    norm.includes('sqs') ||
    norm.includes('sns') ||
    norm.includes('eventbridge') ||
    norm.includes('event') ||
    norm.includes('topic') ||
    norm.includes('queue') ||
    norm.includes('service_bus') ||
    norm.includes('pubsub') ||
    norm.includes('tasks')
  ) {
    return 'messaging';
  }

  if (
    norm.includes('vault') ||
    norm.includes('kms') ||
    norm.includes('iam') ||
    norm.includes('secret') ||
    norm.includes('shield') ||
    norm.includes('waf')
  ) {
    return 'security';
  }

  return 'compute';
}

// ============================================================================
// Discovery & Reconciliation Engine
// ============================================================================

export interface ReconcileOptions {
  architectureId: ArchitectureId;
  accounts: CloudAccountSpec[];
  discoveredResources: DiscoveredCloudResource[];
  currentObjects: ModelObject[];
  groupNetworksIntoParentGroups?: boolean;
}

/**
 * Reconciles discovered live cloud resources against the active architecture model.
 * Matches resources, detects additions, changes, and drifts, and generates proposals with concrete evidence.
 */
export function reconcileCloudResources(options: ReconcileOptions): DiscoveryRunReport {
  const {
    architectureId,
    accounts,
    discoveredResources,
    currentObjects,
    groupNetworksIntoParentGroups = true,
  } = options;

  const runId = `cld_run_${Date.now().toString(36)}`;
  const proposals: CloudDiscoveryProposal[] = [];

  // Track matched object IDs to identify stale/drifted model objects
  const matchedModelObjectIds = new Set<ObjectId>();

  // Map network scopes to group objects if available
  const networkGroupMap = new Map<string, ObjectId>();
  if (groupNetworksIntoParentGroups) {
    for (const obj of currentObjects) {
      if (obj.kind === 'group' && obj.metadata) {
        const netId =
          (obj.metadata['networkScope'] as string) ||
          (obj.metadata['vpcId'] as string) ||
          (obj.metadata['vnetName'] as string) ||
          (obj.metadata['namespace'] as string);
        if (netId) {
          networkGroupMap.set(netId, obj.id);
        }
      }
    }
  }

  const byProvider: Record<CloudProvider, number> = {
    aws: 0,
    azure: 0,
    gcp: 0,
    kubernetes: 0,
  };

  const byCategory: Record<CloudResourceCategory, number> = {
    compute: 0,
    database: 0,
    storage: 0,
    networking: 0,
    messaging: 0,
    security: 0,
  };

  let unmappedCount = 0;
  let updatedCount = 0;
  let matchedCount = 0;

  for (const resource of discoveredResources) {
    byProvider[resource.provider] = (byProvider[resource.provider] || 0) + 1;
    byCategory[resource.category] = (byCategory[resource.category] || 0) + 1;

    // Check if an existing ModelObject matches this discovered resource
    const matchedObj = findMatchingModelObject(resource, currentObjects);

    if (matchedObj) {
      matchedModelObjectIds.add(matchedObj.id);

      // Check if metadata, status, or tags have changed
      const hasChanged = checkResourceMetadataChanged(resource, matchedObj);

      if (hasChanged) {
        updatedCount++;
        const evidence: CloudDiscoveryEvidence = {
          sourceType: 'cloud_discovery',
          provider: resource.provider,
          accountId: resource.accountId,
          accountName: resource.accountName,
          resourceId: resource.id,
          resourceType: resource.resourceType,
          region: resource.region,
          category: resource.category,
          confidence: 0.98,
          discoveredAt: resource.discoveredAt,
          matchReason: `Exact match found on existing object ${matchedObj.name} (${matchedObj.id}) with updated cloud properties.`,
        };

        proposals.push({
          id: `prop_upd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
          action: 'update',
          status: 'pending',
          resource,
          matchedObjectId: matchedObj.id,
          proposedObject: {
            name: matchedObj.name,
            kind: matchedObj.kind,
            description: matchedObj.description || `${resource.provider.toUpperCase()} ${resource.resourceType} in ${resource.region}`,
            parentId: matchedObj.parentId,
            tags: Array.from(new Set([...((matchedObj.metadata?.['tags'] as string[]) || []), ...Object.keys(resource.tags)])),
            metadata: {
              ...(matchedObj.metadata || {}),
              cloudProvider: resource.provider,
              accountId: resource.accountId,
              resourceId: resource.id,
              region: resource.region,
              status: resource.status,
              lastDiscoveredAt: resource.discoveredAt,
              ...resource.tags,
            },
          },
          evidence,
          explanation: `Live discovery detected updated attributes for ${matchedObj.name} in ${resource.provider.toUpperCase()} (${resource.region}).`,
        });
      } else {
        matchedCount++;
      }
    } else {
      // Unmapped resource -> propose new ModelObject
      unmappedCount++;

      const suggestedKind = determineObjectKindForDiscoveredResource(
        resource.provider,
        resource.resourceType,
        resource.category,
      );

      // Find enclosing network parent if applicable
      let parentId: ObjectId | null = null;
      if (resource.networkScope && networkGroupMap.has(resource.networkScope)) {
        parentId = networkGroupMap.get(resource.networkScope) || null;
      }

      const evidence: CloudDiscoveryEvidence = {
        sourceType: 'cloud_discovery',
        provider: resource.provider,
        accountId: resource.accountId,
        accountName: resource.accountName,
        resourceId: resource.id,
        resourceType: resource.resourceType,
        region: resource.region,
        category: resource.category,
        confidence: 0.95,
        discoveredAt: resource.discoveredAt,
        matchReason: `Live resource discovered in account ${resource.accountName} (${resource.accountId}) with no corresponding model object.`,
      };

      const tagKeys = Object.entries(resource.tags).map(([k, v]) => `${k}:${v}`);

      proposals.push({
        id: `prop_new_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'create',
        status: 'pending',
        resource,
        matchedObjectId: null,
        proposedObject: {
          name: resource.name,
          kind: suggestedKind,
          description: `Discovered ${resource.provider.toUpperCase()} ${resource.resourceType} in ${resource.region} (${resource.accountName})`,
          parentId,
          tags: [`provider:${resource.provider}`, `category:${resource.category}`, ...tagKeys],
          metadata: {
            cloudProvider: resource.provider,
            accountId: resource.accountId,
            accountName: resource.accountName,
            resourceId: resource.id,
            resourceType: resource.resourceType,
            category: resource.category,
            region: resource.region,
            networkScope: resource.networkScope,
            status: resource.status,
            discoveredAt: resource.discoveredAt,
            tags: resource.tags,
            ...(resource.rawProperties || {}),
          },
        },
        evidence,
        explanation: `Proposed new ${suggestedKind} object for discovered ${resource.provider.toUpperCase()} ${resource.name} (${resource.resourceType}) in ${resource.region}.`,
      });
    }
  }

  // Detect drifted/stale objects in the model that previously had cloud evidence for scanned accounts
  const scannedAccountIds = new Set(accounts.map((a) => a.accountIdentifier));
  let staleCount = 0;

  for (const obj of currentObjects) {
    if (obj.metadata && obj.metadata['cloudProvider'] && obj.metadata['accountId']) {
      const objAccount = String(obj.metadata['accountId']);
      if (scannedAccountIds.has(objAccount) && !matchedModelObjectIds.has(obj.id)) {
        staleCount++;
        const provider = (obj.metadata['cloudProvider'] as CloudProvider) || 'aws';
        const resourceId = (obj.metadata['resourceId'] as string) || obj.id;

        const evidence: CloudDiscoveryEvidence = {
          sourceType: 'cloud_discovery',
          provider,
          accountId: objAccount,
          accountName: (obj.metadata['accountName'] as string) || objAccount,
          resourceId,
          resourceType: (obj.metadata['resourceType'] as string) || 'unknown',
          region: (obj.metadata['region'] as string) || 'unknown',
          category: (obj.metadata['category'] as CloudResourceCategory) || 'compute',
          confidence: 0.9,
          discoveredAt: new Date().toISOString(),
          matchReason: `Model object ${obj.name} was previously mapped to cloud resource ${resourceId} in account ${objAccount}, but was not detected during the latest live scan.`,
        };

        proposals.push({
          id: `prop_stl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
          action: 'remove_stale',
          status: 'pending',
          resource: {
            id: resourceId,
            name: obj.name,
            provider,
            accountId: objAccount,
            accountName: (obj.metadata['accountName'] as string) || objAccount,
            resourceType: (obj.metadata['resourceType'] as string) || 'unknown',
            category: (obj.metadata['category'] as CloudResourceCategory) || 'compute',
            suggestedKind: obj.kind,
            region: (obj.metadata['region'] as string) || 'unknown',
            tags: {},
            status: 'terminating',
            discoveredAt: new Date().toISOString(),
          },
          matchedObjectId: obj.id,
          proposedObject: {
            name: obj.name,
            kind: obj.kind,
            description: obj.description || '',
            parentId: obj.parentId,
            tags: (obj.metadata?.['tags'] as string[]) || [],
            metadata: obj.metadata,
          },
          evidence,
          explanation: `Cloud resource for model object ${obj.name} (${obj.id}) was not found in account ${objAccount}. May have been terminated or removed.`,
        });
      }
    }
  }

  const summary: DiscoveryReconciliationSummary = {
    totalDiscovered: discoveredResources.length,
    unmappedCount,
    updatedCount,
    staleCount,
    matchedCount,
    byProvider,
    byCategory,
  };

  return {
    runId,
    architectureId,
    accounts,
    proposals,
    summary,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Matches a discovered resource to an existing ModelObject by ARN/ID, cloud coordinates, or name.
 */
function findMatchingModelObject(
  resource: DiscoveredCloudResource,
  currentObjects: ModelObject[],
): ModelObject | null {
  for (const obj of currentObjects) {
    if (!obj.metadata) continue;

    // 1. Direct resource ID / ARN match in metadata
    const metaId = obj.metadata['resourceId'] || obj.metadata['arn'] || obj.metadata['id'];
    if (metaId && metaId === resource.id) {
      return obj;
    }

    // 2. Provider + Account + Name match
    const metaProvider = obj.metadata['cloudProvider'];
    const metaAccount = obj.metadata['accountId'];
    if (
      metaProvider === resource.provider &&
      metaAccount === resource.accountId &&
      obj.name.toLowerCase() === resource.name.toLowerCase()
    ) {
      return obj;
    }

    // 3. Cloud resource tag mapping: tag diagramhq:object-id
    if (resource.tags && resource.tags['diagramhq:object-id'] === obj.id) {
      return obj;
    }
  }

  return null;
}

/**
 * Checks if the discovered resource has meaningful property/tag changes compared to existing object.
 */
function checkResourceMetadataChanged(
  resource: DiscoveredCloudResource,
  obj: ModelObject,
): boolean {
  if (!obj.metadata) return true;

  if (obj.metadata['status'] && obj.metadata['status'] !== resource.status) {
    return true;
  }

  if (obj.metadata['region'] && obj.metadata['region'] !== resource.region) {
    return true;
  }

  return false;
}

export function createObjectIdForKind(kind: ObjectKind): ObjectId {
  switch (kind) {
    case 'system':
      return createId('sys') as ObjectId;
    case 'application':
      return createId('app') as ObjectId;
    case 'store':
      return createId('sto') as ObjectId;
    case 'component':
      return createId('cmp') as ObjectId;
    case 'actor':
      return createId('act') as ObjectId;
    case 'group':
    default:
      return createId('grp') as ObjectId;
  }
}

/**
 * Applies accepted discovery proposals to produce new and updated ModelObjects.
 */
export function applyDiscoveryProposals(
  report: DiscoveryRunReport,
  acceptedProposalIds: string[],
  currentVersionId: VersionId,
): {
  newObjects: ModelObject[];
  updatedObjects: ModelObject[];
  removedObjectIds: ObjectId[];
} {
  const acceptedSet = new Set(acceptedProposalIds);
  const newObjects: ModelObject[] = [];
  const updatedObjects: ModelObject[] = [];
  const removedObjectIds: ObjectId[] = [];

  for (const proposal of report.proposals) {
    if (!acceptedSet.has(proposal.id)) continue;

    proposal.status = 'accepted';

    if (proposal.action === 'create') {
      const newObj: ModelObject = {
        id: createObjectIdForKind(proposal.proposedObject.kind),
        architectureId: report.architectureId,
        versionId: currentVersionId,
        parentId: proposal.proposedObject.parentId || null,
        name: proposal.proposedObject.name,
        kind: proposal.proposedObject.kind,
        description: proposal.proposedObject.description,
        metadata: {
          ...proposal.proposedObject.metadata,
          tags: proposal.proposedObject.tags || [],
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      newObjects.push(newObj);
    } else if (proposal.action === 'update' && proposal.matchedObjectId) {
      const updatedObj: ModelObject = {
        id: proposal.matchedObjectId,
        architectureId: report.architectureId,
        versionId: currentVersionId,
        parentId: proposal.proposedObject.parentId || null,
        name: proposal.proposedObject.name,
        kind: proposal.proposedObject.kind,
        description: proposal.proposedObject.description,
        metadata: {
          ...proposal.proposedObject.metadata,
          tags: proposal.proposedObject.tags || [],
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      updatedObjects.push(updatedObj);
    } else if (proposal.action === 'remove_stale' && proposal.matchedObjectId) {
      removedObjectIds.push(proposal.matchedObjectId);
    }
  }

  return { newObjects, updatedObjects, removedObjectIds };
}

// ============================================================================
// Mock Data Generation for Tests & Interactive Discovery
// ============================================================================

export function createMockCloudAccounts(): CloudAccountSpec[] {
  return [
    {
      id: 'acc_aws_prod',
      name: 'AWS Production (123456789012)',
      provider: 'aws',
      accountIdentifier: '123456789012',
      regions: ['us-east-1', 'us-west-2'],
      tags: { Environment: 'production', CostCenter: 'Engineering' },
      status: 'active',
      lastScannedAt: new Date().toISOString(),
    },
    {
      id: 'acc_azure_corp',
      name: 'Azure Enterprise Subscription',
      provider: 'azure',
      accountIdentifier: 'sub-4a88-921c-99a2bf18012a',
      regions: ['eastus', 'westeurope'],
      tags: { Environment: 'production' },
      status: 'active',
      lastScannedAt: new Date().toISOString(),
    },
    {
      id: 'acc_gcp_analytics',
      name: 'GCP Analytics Platform',
      provider: 'gcp',
      accountIdentifier: 'diagramhq-analytics-prod',
      regions: ['us-central1'],
      tags: { Environment: 'production', Project: 'Analytics' },
      status: 'active',
      lastScannedAt: new Date().toISOString(),
    },
    {
      id: 'acc_k8s_cluster',
      name: 'K8s EKS Cluster (prod-us-east-1)',
      provider: 'kubernetes',
      accountIdentifier: 'k8s://prod-us-east-1.eks.amazonaws.com',
      regions: ['us-east-1'],
      tags: { Environment: 'production', Cluster: 'prod-main' },
      status: 'active',
      lastScannedAt: new Date().toISOString(),
    },
  ];
}

export function createMockMultiCloudResources(): DiscoveredCloudResource[] {
  const now = new Date().toISOString();

  return [
    // AWS Resources
    {
      id: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0a1b2c3d4e5f',
      name: 'prod-vpc-main',
      provider: 'aws',
      accountId: '123456789012',
      accountName: 'AWS Production',
      resourceType: 'aws_vpc',
      category: 'networking',
      suggestedKind: 'group',
      region: 'us-east-1',
      tags: { Name: 'prod-vpc-main', Environment: 'production' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: 'arn:aws:ecs:us-east-1:123456789012:service/prod-cluster/order-service',
      name: 'order-service',
      provider: 'aws',
      accountId: '123456789012',
      accountName: 'AWS Production',
      resourceType: 'aws_ecs_service',
      category: 'compute',
      suggestedKind: 'application',
      region: 'us-east-1',
      networkScope: 'vpc-0a1b2c3d4e5f',
      tags: { Service: 'Orders', Team: 'Checkout' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: 'arn:aws:rds:us-east-1:123456789012:db:orders-pg-cluster',
      name: 'orders-postgres-db',
      provider: 'aws',
      accountId: '123456789012',
      accountName: 'AWS Production',
      resourceType: 'aws_rds_cluster',
      category: 'database',
      suggestedKind: 'store',
      region: 'us-east-1',
      networkScope: 'vpc-0a1b2c3d4e5f',
      tags: { Engine: 'aurora-postgresql', Backup: 'true' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: 'arn:aws:sqs:us-east-1:123456789012:order-events.fifo',
      name: 'order-events-queue',
      provider: 'aws',
      accountId: '123456789012',
      accountName: 'AWS Production',
      resourceType: 'aws_sqs_queue',
      category: 'messaging',
      suggestedKind: 'application',
      region: 'us-east-1',
      tags: { Type: 'EventBroker' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: 'arn:aws:s3:::prod-customer-documents-archive',
      name: 'customer-documents-bucket',
      provider: 'aws',
      accountId: '123456789012',
      accountName: 'AWS Production',
      resourceType: 'aws_s3_bucket',
      category: 'storage',
      suggestedKind: 'store',
      region: 'us-east-1',
      tags: { Classification: 'confidential' },
      status: 'running',
      discoveredAt: now,
    },

    // Azure Resources
    {
      id: '/subscriptions/sub-4a88-921c-99a2bf18012a/resourceGroups/rg-prod/providers/Microsoft.Web/sites/customer-portal-app',
      name: 'customer-portal-web',
      provider: 'azure',
      accountId: 'sub-4a88-921c-99a2bf18012a',
      accountName: 'Azure Enterprise Subscription',
      resourceType: 'azure_app_service',
      category: 'compute',
      suggestedKind: 'application',
      region: 'eastus',
      tags: { Tier: 'frontend', Stack: 'nextjs' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: '/subscriptions/sub-4a88-921c-99a2bf18012a/resourceGroups/rg-prod/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-session-store',
      name: 'cosmos-session-store',
      provider: 'azure',
      accountId: 'sub-4a88-921c-99a2bf18012a',
      accountName: 'Azure Enterprise Subscription',
      resourceType: 'azure_cosmos_db',
      category: 'database',
      suggestedKind: 'store',
      region: 'eastus',
      tags: { Replication: 'multi-region' },
      status: 'running',
      discoveredAt: now,
    },

    // GCP Resources
    {
      id: '//run.googleapis.com/projects/diagramhq-analytics-prod/locations/us-central1/services/bi-reporting-service',
      name: 'bi-reporting-service',
      provider: 'gcp',
      accountId: 'diagramhq-analytics-prod',
      accountName: 'GCP Analytics Platform',
      resourceType: 'gcp_cloud_run',
      category: 'compute',
      suggestedKind: 'application',
      region: 'us-central1',
      tags: { Service: 'BI', Lang: 'python' },
      status: 'running',
      discoveredAt: now,
    },
    {
      id: '//bigquery.googleapis.com/projects/diagramhq-analytics-prod/datasets/analytics_warehouse',
      name: 'analytics-bigquery-warehouse',
      provider: 'gcp',
      accountId: 'diagramhq-analytics-prod',
      accountName: 'GCP Analytics Platform',
      resourceType: 'gcp_bigquery_dataset',
      category: 'database',
      suggestedKind: 'store',
      region: 'us-central1',
      tags: { Pipeline: 'ETL' },
      status: 'running',
      discoveredAt: now,
    },

    // Kubernetes Resources
    {
      id: 'k8s://prod-us-east-1/namespaces/default/deployments/payment-processor',
      name: 'payment-processor',
      provider: 'kubernetes',
      accountId: 'k8s://prod-us-east-1.eks.amazonaws.com',
      accountName: 'K8s EKS Cluster',
      resourceType: 'k8s_deployment',
      category: 'compute',
      suggestedKind: 'application',
      region: 'us-east-1',
      networkScope: 'default',
      tags: { app: 'payment-processor', tier: 'backend' },
      status: 'running',
      discoveredAt: now,
    },
  ];
}
