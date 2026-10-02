/**
 * DiagramHQ - GCP Infrastructure Integration (F080)
 *
 * Imports real Google Cloud Platform (GCP) cloud infrastructure into the DiagramHQ architecture model:
 * - Supports 17 canonical GCP resource types:
 *   - Compute: GCE (Compute Engine), GKE (Kubernetes Engine), Cloud Run, Cloud Functions, App Engine
 *   - Storage & Databases: Cloud SQL, Cloud Spanner, Cloud Bigtable, Cloud Firestore, Cloud Storage (GCS)
 *   - Networking & Edge: VPC, Cloud Load Balancing, Cloud CDN, API Gateway
 *   - Messaging & Integration: Cloud Pub/Sub, Eventarc, Cloud Tasks
 * - Maps GCP resources to typed ModelObjects with metadata, labels, and Resource URIs
 * - Maps inter-resource dependencies to typed ModelConnections (sync, async, data, dependency)
 * - Retains grounded cloud evidence and regional topologies
 *
 * Strict Acceptance Criteria:
 * - Equivalent GCP resource import
 * - Test: import mocked GCP resources.
 */

import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';
import type { ConnectionKind, ModelConnection, ModelObject, ObjectKind } from './types';

// ============================================================================
// GCP Types
// ============================================================================

export type GcpResourceType =
  | 'gce'
  | 'gke'
  | 'cloud_run'
  | 'cloud_functions'
  | 'app_engine'
  | 'cloud_sql'
  | 'spanner'
  | 'bigtable'
  | 'firestore'
  | 'gcs'
  | 'vpc'
  | 'cloud_lb'
  | 'cloud_cdn'
  | 'api_gateway'
  | 'pubsub'
  | 'eventarc'
  | 'cloud_tasks';

export const ALL_GCP_RESOURCE_TYPES: readonly GcpResourceType[] = [
  'gce',
  'gke',
  'cloud_run',
  'cloud_functions',
  'app_engine',
  'cloud_sql',
  'spanner',
  'bigtable',
  'firestore',
  'gcs',
  'vpc',
  'cloud_lb',
  'cloud_cdn',
  'api_gateway',
  'pubsub',
  'eventarc',
  'cloud_tasks',
] as const;

export interface GcpResource {
  id: string; // Standard GCP Resource URI (e.g. //compute.googleapis.com/projects/my-proj/zones/us-central1-a/instances/vm-worker)
  resourceType: GcpResourceType;
  name: string;
  projectId: string;
  region: string;
  networkId?: string;
  subnetworkId?: string;
  labels?: Record<string, string>;
  dependencies?: string[]; // Target resource URIs or names
  metadata?: Record<string, unknown>;
}

export interface GcpProjectScanInput {
  projectId: string;
  projectName?: string;
  organizationId?: string;
  defaultRegion?: string;
  resources: GcpResource[];
}

export interface GcpMappingOptions {
  architectureId: ArchitectureId;
  versionId: VersionId;
  includeVpcContainment?: boolean;
  mapConnections?: boolean;
  regionFilter?: string[];
  resourceTypeFilter?: GcpResourceType[];
  labelFilter?: Record<string, string>;
}

export interface GcpCloudEvidence {
  id: string;
  sourceType: 'cloud_resource';
  externalId: string;
  confidence: number;
  description: string;
  metadata: {
    resourceUri: string;
    region: string;
    projectId: string;
  };
  createdAt: Date;
}

export interface GcpImportResult {
  architectureId: ArchitectureId;
  versionId: VersionId;
  scannedCount: number;
  mappedObjectCount: number;
  mappedConnectionCount: number;
  objects: ModelObject[];
  connections: ModelConnection[];
  evidence: GcpCloudEvidence[];
  resourcesByType: Record<GcpResourceType, number>;
  unmappedResources: Array<{ id: string; reason: string }>;
}

// ============================================================================
// URI Parsing & Helpers
// ============================================================================

export interface ParsedGcpResourceUri {
  service: string;
  projectId: string;
  location?: string;
  resourceType: string;
  resourceName: string;
}

export function parseGcpResourceUri(uri: string): ParsedGcpResourceUri | null {
  const cleanUri = uri.replace(/^\/\//, '');
  const slashIdx = cleanUri.indexOf('/');
  if (slashIdx === -1) return null;

  const service = cleanUri.slice(0, slashIdx);
  const path = cleanUri.slice(slashIdx + 1);
  const segments = path.split('/');

  // Expected segments: ['projects', proj, ...]
  if (segments[0] !== 'projects' || segments.length < 3) return null;

  const projectId = segments[1] || '';
  let location: string | undefined;
  let resourceType = '';
  let resourceName = '';

  if (segments[2] === 'locations' || segments[2] === 'regions' || segments[2] === 'zones') {
    location = segments[3];
    resourceType = segments[4] || '';
    resourceName = segments[5] || '';
  } else if (segments[2] === 'global') {
    location = 'global';
    resourceType = segments[3] || '';
    resourceName = segments[4] || '';
  } else {
    resourceType = segments[2] || '';
    resourceName = segments[3] || '';
  }

  return {
    service,
    projectId,
    location,
    resourceType,
    resourceName,
  };
}

export function determineObjectKindForGcp(resourceType: GcpResourceType): ObjectKind {
  switch (resourceType) {
    case 'vpc':
      return 'group';
    case 'cloud_sql':
    case 'spanner':
    case 'bigtable':
    case 'firestore':
    case 'gcs':
      return 'store';
    case 'gce':
    case 'gke':
    case 'cloud_run':
    case 'cloud_functions':
    case 'app_engine':
    case 'cloud_lb':
    case 'cloud_cdn':
    case 'api_gateway':
      return 'application';
    case 'pubsub':
    case 'eventarc':
    case 'cloud_tasks':
      return 'component';
  }
}

export function determineConnectionKindForGcp(
  sourceType: GcpResourceType,
  targetType: GcpResourceType
): { kind: ConnectionKind; label: string; protocol: string } {
  // Ingress & Load Balancing
  if (sourceType === 'cloud_cdn' || sourceType === 'cloud_lb') {
    return { kind: 'sync', label: 'HTTP(S) Ingress routing', protocol: 'HTTP/2' };
  }
  if (sourceType === 'api_gateway' && (targetType === 'cloud_run' || targetType === 'cloud_functions' || targetType === 'gke')) {
    return { kind: 'sync', label: 'API Gateway proxy call', protocol: 'gRPC / HTTPS' };
  }

  // Database & Storage Operations
  if (targetType === 'cloud_sql') {
    return { kind: 'data', label: 'SQL queries via Cloud SQL Proxy', protocol: 'PostgreSQL/MySQL' };
  }
  if (targetType === 'spanner') {
    return { kind: 'data', label: 'Globally distributed transaction', protocol: 'Spanner gRPC' };
  }
  if (targetType === 'bigtable') {
    return { kind: 'data', label: 'Low-latency key-value read/write', protocol: 'Bigtable gRPC' };
  }
  if (targetType === 'firestore') {
    return { kind: 'data', label: 'Document datastore CRUD', protocol: 'Firestore REST/gRPC' };
  }
  if (targetType === 'gcs') {
    return { kind: 'data', label: 'Bucket object read/write', protocol: 'GCS REST' };
  }

  // Messaging & Event Driven
  if (targetType === 'pubsub') {
    return { kind: 'async', label: 'Publishes message to topic', protocol: 'Pub/Sub gRPC' };
  }
  if (sourceType === 'pubsub' || sourceType === 'eventarc') {
    return { kind: 'async', label: 'Event delivery push trigger', protocol: 'CloudEvents' };
  }
  if (targetType === 'cloud_tasks') {
    return { kind: 'async', label: 'Enqueues background task', protocol: 'Cloud Tasks' };
  }

  // Generic Cloud Dependency
  return { kind: 'dependency', label: 'GCP Service Integration', protocol: 'Google Cloud SDK' };
}

// ============================================================================
// Core Mapping Function
// ============================================================================

export function importGcpProject(
  input: GcpProjectScanInput,
  options: GcpMappingOptions
): GcpImportResult {
  const { architectureId, versionId } = options;
  const includeVpc = options.includeVpcContainment ?? true;
  const mapConnections = options.mapConnections ?? true;

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const evidence: GcpCloudEvidence[] = [];
  const unmappedResources: Array<{ id: string; reason: string }> = [];

  const resourcesByType: Record<GcpResourceType, number> = {
    gce: 0,
    gke: 0,
    cloud_run: 0,
    cloud_functions: 0,
    app_engine: 0,
    cloud_sql: 0,
    spanner: 0,
    bigtable: 0,
    firestore: 0,
    gcs: 0,
    vpc: 0,
    cloud_lb: 0,
    cloud_cdn: 0,
    api_gateway: 0,
    pubsub: 0,
    eventarc: 0,
    cloud_tasks: 0,
  };

  const objectById = new Map<string, ObjectId>();
  const objectByName = new Map<string, ObjectId>();
  const vpcObjectById = new Map<string, ObjectId>();
  const resourceById = new Map<string, GcpResource>();

  // Filter input resources
  const validResources = input.resources.filter((res) => {
    if (options.regionFilter && options.regionFilter.length > 0) {
      if (!options.regionFilter.includes(res.region)) return false;
    }
    if (options.resourceTypeFilter && options.resourceTypeFilter.length > 0) {
      if (!options.resourceTypeFilter.includes(res.resourceType)) return false;
    }
    if (options.labelFilter) {
      for (const [k, v] of Object.entries(options.labelFilter)) {
        if (!res.labels || res.labels[k] !== v) return false;
      }
    }
    return true;
  });

  // Step 1: First pass — map VPC networks if VPC containment is enabled
  if (includeVpc) {
    const vpcResources = validResources.filter((r) => r.resourceType === 'vpc');
    for (const vpcRes of vpcResources) {
      const vpcObjId = `obj-gcp-vpc-${vpcRes.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` as ObjectId;
      const vpcObj: ModelObject = {
        id: vpcObjId,
        architectureId,
        versionId,
        parentId: null,
        kind: 'group',
        name: vpcRes.name || `VPC (${vpcRes.region})`,
        description: `Google Cloud VPC Network in ${vpcRes.region} (${vpcRes.projectId})`,
        metadata: {
          cloudProvider: 'gcp',
          gcpResourceType: 'vpc',
          resourceUri: vpcRes.id,
          region: vpcRes.region,
          projectId: vpcRes.projectId,
          routingMode: vpcRes.metadata?.routingMode || 'GLOBAL',
          labels: vpcRes.labels || {},
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      objects.push(vpcObj);
      objectById.set(vpcRes.id, vpcObjId);
      objectByName.set(vpcRes.name, vpcObjId);
      vpcObjectById.set(vpcRes.id, vpcObjId);
      resourceById.set(vpcRes.id, vpcRes);
      resourcesByType['vpc']++;

      evidence.push({
        id: `ev-gcp-${vpcRes.name}`,
        sourceType: 'cloud_resource',
        externalId: vpcRes.id,
        confidence: 1.0,
        description: `Google Cloud VPC network discovery from project ${vpcRes.projectId}`,
        metadata: {
          resourceUri: vpcRes.id,
          region: vpcRes.region,
          projectId: vpcRes.projectId,
        },
        createdAt: new Date(),
      });
    }
  }

  // Step 2: Second pass — map non-VPC resources
  const nonVpcResources = validResources.filter((r) => r.resourceType !== 'vpc');

  for (const res of nonVpcResources) {
    if (!ALL_GCP_RESOURCE_TYPES.includes(res.resourceType)) {
      unmappedResources.push({ id: res.id, reason: `Unsupported resource type: ${res.resourceType}` });
      continue;
    }

    const objId = `obj-gcp-${res.resourceType}-${res.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` as ObjectId;
    const parentId = res.networkId && includeVpc ? vpcObjectById.get(res.networkId) || null : null;
    const kind = determineObjectKindForGcp(res.resourceType);

    const obj: ModelObject = {
      id: objId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: res.name || `${res.resourceType.toUpperCase()}`,
      description: `Google Cloud ${res.resourceType.toUpperCase()} resource in ${res.region}`,
      metadata: {
        cloudProvider: 'gcp',
        gcpResourceType: res.resourceType,
        resourceUri: res.id,
        region: res.region,
        projectId: res.projectId,
        networkId: res.networkId || null,
        subnetworkId: res.subnetworkId || null,
        labels: res.labels || {},
        ...(res.metadata || {}),
      },
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    objects.push(obj);
    objectById.set(res.id, objId);
    objectByName.set(res.name, objId);
    resourceById.set(res.id, res);
    resourcesByType[res.resourceType]++;

    evidence.push({
      id: `ev-gcp-${res.name}`,
      sourceType: 'cloud_resource',
      externalId: res.id,
      confidence: 0.95,
      description: `Discovered Google Cloud ${res.resourceType.toUpperCase()} resource ${res.name}`,
      metadata: {
        resourceUri: res.id,
        region: res.region,
        projectId: res.projectId,
      },
      createdAt: new Date(),
    });
  }

  // Step 3: Third pass — derive inter-resource connections
  if (mapConnections) {
    let connIdx = 1;
    for (const res of validResources) {
      const sourceObjId = objectById.get(res.id);
      if (!sourceObjId) continue;

      if (res.dependencies && res.dependencies.length > 0) {
        for (const targetRef of res.dependencies) {
          const targetObjId = objectById.get(targetRef) || objectByName.get(targetRef);
          if (!targetObjId || targetObjId === sourceObjId) continue;

          const targetResource = resourceById.get(targetRef) ||
            Array.from(resourceById.values()).find((r) => r.name === targetRef);

          const targetType: GcpResourceType = targetResource ? targetResource.resourceType : 'cloud_run';
          const { kind, label, protocol } = determineConnectionKindForGcp(res.resourceType, targetType);

          const connId = `conn-gcp-${connIdx++}` as ConnectionId;
          const conn: ModelConnection = {
            id: connId,
            architectureId,
            versionId,
            sourceObjectId: sourceObjId,
            targetObjectId: targetObjId,
            kind,
            label,
            description: `GCP interaction between ${res.name} and ${targetResource ? targetResource.name : targetRef}`,
            metadata: {
              cloudProvider: 'gcp',
              protocol,
              sourceResourceUri: res.id,
              targetRef,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          connections.push(conn);
        }
      }
    }
  }

  return {
    architectureId,
    versionId,
    scannedCount: input.resources.length,
    mappedObjectCount: objects.length,
    mappedConnectionCount: connections.length,
    objects,
    connections,
    evidence,
    resourcesByType,
    unmappedResources,
  };
}

// ============================================================================
// Mock GCP Project Generator for Testing and Demo
// ============================================================================

export function createMockGcpProject(
  projectId = 'gcp-production-corp',
  region = 'us-central1'
): GcpProjectScanInput {
  const vpcUri = `//compute.googleapis.com/projects/${projectId}/global/networks/vpc-production-mesh`;

  const resources: GcpResource[] = [
    // 1. VPC Network
    {
      id: vpcUri,
      resourceType: 'vpc',
      name: 'vpc-production-mesh',
      projectId,
      region: 'global',
      labels: { environment: 'production', tier: 'network' },
      metadata: { routingMode: 'GLOBAL', autoCreateSubnetworks: false },
    },
    // 2. Cloud CDN
    {
      id: `//compute.googleapis.com/projects/${projectId}/global/backendServices/cdn-edge-origin`,
      resourceType: 'cloud_cdn',
      name: 'cdn-edge-origin',
      projectId,
      region: 'global',
      dependencies: [`//storage.googleapis.com/projects/${projectId}/buckets/gcs-web-frontend-bucket`],
      labels: { environment: 'production' },
      metadata: { cachePolicy: 'CACHE_ALL_STATIC' },
    },
    // 3. Cloud Load Balancing
    {
      id: `//compute.googleapis.com/projects/${projectId}/global/urlMaps/lb-global-ingress`,
      resourceType: 'cloud_lb',
      name: 'lb-global-ingress',
      projectId,
      region: 'global',
      dependencies: [`//apigateway.googleapis.com/projects/${projectId}/locations/global/gateways/api-gateway-core`],
      labels: { environment: 'production' },
      metadata: { loadBalancingScheme: 'EXTERNAL_MANAGED' },
    },
    // 4. API Gateway
    {
      id: `//apigateway.googleapis.com/projects/${projectId}/locations/global/gateways/api-gateway-core`,
      resourceType: 'api_gateway',
      name: 'api-gateway-core',
      projectId,
      region: 'global',
      dependencies: [
        `//run.googleapis.com/projects/${projectId}/locations/${region}/services/run-orders-service`,
        `//cloudfunctions.googleapis.com/projects/${projectId}/locations/${region}/functions/func-auth-verifier`,
      ],
      labels: { environment: 'production' },
      metadata: { apiConfig: 'api-v1-prod' },
    },
    // 5. Cloud Run (Serverless container)
    {
      id: `//run.googleapis.com/projects/${projectId}/locations/${region}/services/run-orders-service`,
      resourceType: 'cloud_run',
      name: 'run-orders-service',
      projectId,
      region,
      networkId: vpcUri,
      dependencies: [
        `//sqladmin.googleapis.com/projects/${projectId}/instances/cloudsql-orders-pg`,
        `//pubsub.googleapis.com/projects/${projectId}/topics/topic-order-events`,
      ],
      labels: { environment: 'production', framework: 'go' },
      metadata: { minInstances: 2, maxInstances: 50, cpu: '2', memory: '4Gi' },
    },
    // 6. Cloud Functions
    {
      id: `//cloudfunctions.googleapis.com/projects/${projectId}/locations/${region}/functions/func-auth-verifier`,
      resourceType: 'cloud_functions',
      name: 'func-auth-verifier',
      projectId,
      region,
      networkId: vpcUri,
      dependencies: [`//firestore.googleapis.com/projects/${projectId}/databases/(default)`],
      labels: { environment: 'production', runtime: 'nodejs20' },
      metadata: { entryPoint: 'verifyToken', availableMemoryMb: 512 },
    },
    // 7. GKE (Google Kubernetes Engine)
    {
      id: `//container.googleapis.com/projects/${projectId}/locations/${region}/clusters/gke-analytics-cluster`,
      resourceType: 'gke',
      name: 'gke-analytics-cluster',
      projectId,
      region,
      networkId: vpcUri,
      dependencies: [`//bigtable.googleapis.com/projects/${projectId}/instances/bigtable-telemetry`],
      labels: { environment: 'production', workload: 'data' },
      metadata: { currentMasterVersion: '1.29.3-gke.1093000', autopilot: true },
    },
    // 8. GCE (Compute Engine VM)
    {
      id: `//compute.googleapis.com/projects/${projectId}/zones/${region}-a/instances/gce-bastion-host`,
      resourceType: 'gce',
      name: 'gce-bastion-host',
      projectId,
      region,
      networkId: vpcUri,
      labels: { environment: 'production', role: 'bastion' },
      metadata: { machineType: 'e2-micro', status: 'RUNNING' },
    },
    // 9. App Engine
    {
      id: `//appengine.googleapis.com/apps/${projectId}/services/default`,
      resourceType: 'app_engine',
      name: 'appengine-legacy-portal',
      projectId,
      region,
      labels: { environment: 'production', runtime: 'python310' },
      metadata: { servingStatus: 'SERVING' },
    },
    // 10. Cloud SQL
    {
      id: `//sqladmin.googleapis.com/projects/${projectId}/instances/cloudsql-orders-pg`,
      resourceType: 'cloud_sql',
      name: 'cloudsql-orders-pg',
      projectId,
      region,
      networkId: vpcUri,
      labels: { environment: 'production', engine: 'postgres-16' },
      metadata: { databaseVersion: 'POSTGRES_16', tier: 'db-custom-4-16384', availabilityType: 'REGIONAL' },
    },
    // 11. Cloud Spanner
    {
      id: `//spanner.googleapis.com/projects/${projectId}/instances/spanner-global-ledger`,
      resourceType: 'spanner',
      name: 'spanner-global-ledger',
      projectId,
      region: 'global',
      labels: { environment: 'production' },
      metadata: { config: 'nam-eur-asia1', nodeCount: 3 },
    },
    // 12. Cloud Bigtable
    {
      id: `//bigtable.googleapis.com/projects/${projectId}/instances/bigtable-telemetry`,
      resourceType: 'bigtable',
      name: 'bigtable-telemetry',
      projectId,
      region,
      labels: { environment: 'production' },
      metadata: { clusterNodes: 6, storageType: 'SSD' },
    },
    // 13. Cloud Firestore
    {
      id: `//firestore.googleapis.com/projects/${projectId}/databases/(default)`,
      resourceType: 'firestore',
      name: 'firestore-default',
      projectId,
      region,
      labels: { environment: 'production' },
      metadata: { type: 'FIRESTORE_NATIVE', concurrencyMode: 'OPTIMISTIC' },
    },
    // 14. Cloud Storage (GCS)
    {
      id: `//storage.googleapis.com/projects/${projectId}/buckets/gcs-web-frontend-bucket`,
      resourceType: 'gcs',
      name: 'gcs-web-frontend-bucket',
      projectId,
      region: 'us',
      labels: { environment: 'production' },
      metadata: { storageClass: 'STANDARD', uniformBucketLevelAccess: true },
    },
    // 15. Cloud Pub/Sub
    {
      id: `//pubsub.googleapis.com/projects/${projectId}/topics/topic-order-events`,
      resourceType: 'pubsub',
      name: 'topic-order-events',
      projectId,
      region: 'global',
      dependencies: [`//cloudfunctions.googleapis.com/projects/${projectId}/locations/${region}/functions/func-auth-verifier`],
      labels: { environment: 'production' },
      metadata: { messageRetentionDuration: '604800s' },
    },
    // 16. Eventarc
    {
      id: `//eventarc.googleapis.com/projects/${projectId}/locations/${region}/triggers/eventarc-storage-trigger`,
      resourceType: 'eventarc',
      name: 'eventarc-storage-trigger',
      projectId,
      region,
      dependencies: [`//run.googleapis.com/projects/${projectId}/locations/${region}/services/run-orders-service`],
      labels: { environment: 'production' },
      metadata: { destinationRunService: 'run-orders-service' },
    },
    // 17. Cloud Tasks
    {
      id: `//cloudtasks.googleapis.com/projects/${projectId}/locations/${region}/queues/tasks-notification-queue`,
      resourceType: 'cloud_tasks',
      name: 'tasks-notification-queue',
      projectId,
      region,
      labels: { environment: 'production' },
      metadata: { maxDispatchesPerSecond: 100 },
    },
  ];

  return {
    projectId,
    projectName: 'Production Google Cloud Organization',
    organizationId: 'organizations/1234567890',
    defaultRegion: region,
    resources,
  };
}
