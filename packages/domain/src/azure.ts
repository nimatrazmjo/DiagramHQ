/**
 * DiagramHQ - Azure Infrastructure Integration (F079)
 *
 * Imports real Microsoft Azure cloud infrastructure into the DiagramHQ architecture model:
 * - Supports 14 canonical Azure resource types:
 *   - Compute: VM (Virtual Machines), App Service, Function App, AKS (Kubernetes), Container App
 *   - Storage & Databases: Azure SQL, Cosmos DB, Blob Storage Account
 *   - Networking & Edge: VNet, Application Gateway, Front Door, API Management (APIM)
 *   - Messaging & Integration: Service Bus, Event Hubs, Event Grid
 * - Maps Azure resources to typed ModelObjects with metadata, tags, and Azure Resource IDs
 * - Maps inter-resource dependencies to typed ModelConnections (sync, async, data, dependency)
 * - Retains grounded cloud evidence and regional topologies
 *
 * Strict Acceptance Criteria:
 * - Equivalent Azure resource import
 * - Test: import mocked Azure resources.
 */

import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';
import type { ConnectionKind, ModelConnection, ModelObject, ObjectKind } from './types';

// ============================================================================
// Azure Types
// ============================================================================

export type AzureResourceType =
  | 'vm'
  | 'app_service'
  | 'function_app'
  | 'aks'
  | 'container_app'
  | 'sql_database'
  | 'cosmos_db'
  | 'storage_account'
  | 'vnet'
  | 'app_gateway'
  | 'front_door'
  | 'api_management'
  | 'service_bus'
  | 'event_hubs'
  | 'event_grid';

export const ALL_AZURE_RESOURCE_TYPES: readonly AzureResourceType[] = [
  'vm',
  'app_service',
  'function_app',
  'aks',
  'container_app',
  'sql_database',
  'cosmos_db',
  'storage_account',
  'vnet',
  'app_gateway',
  'front_door',
  'api_management',
  'service_bus',
  'event_hubs',
  'event_grid',
] as const;

export interface AzureResource {
  id: string; // Azure Resource ID: /subscriptions/{sub}/resourceGroups/{rg}/providers/{provider}/{type}/{name}
  resourceType: AzureResourceType;
  name: string;
  resourceGroup: string;
  subscriptionId: string;
  location: string;
  vnetId?: string;
  subnetId?: string;
  tags?: Record<string, string>;
  dependencies?: string[]; // Target resource IDs or names
  metadata?: Record<string, unknown>;
}

export interface AzureSubscriptionScanInput {
  subscriptionId: string;
  subscriptionName?: string;
  tenantId?: string;
  defaultLocation?: string;
  resources: AzureResource[];
}

export interface AzureMappingOptions {
  architectureId: ArchitectureId;
  versionId: VersionId;
  includeVnetContainment?: boolean;
  mapConnections?: boolean;
  locationFilter?: string[];
  resourceTypeFilter?: AzureResourceType[];
  tagFilter?: Record<string, string>;
}

export interface AzureCloudEvidence {
  id: string;
  sourceType: 'cloud_resource';
  externalId: string;
  confidence: number;
  description: string;
  metadata: {
    resourceId: string;
    location: string;
    subscriptionId: string;
    resourceGroup: string;
  };
  createdAt: Date;
}

export interface AzureImportResult {
  architectureId: ArchitectureId;
  versionId: VersionId;
  scannedCount: number;
  mappedObjectCount: number;
  mappedConnectionCount: number;
  objects: ModelObject[];
  connections: ModelConnection[];
  evidence: AzureCloudEvidence[];
  resourcesByType: Record<AzureResourceType, number>;
  unmappedResources: Array<{ id: string; reason: string }>;
}

// ============================================================================
// Resource ID Parsing & Helpers
// ============================================================================

export interface ParsedAzureResourceId {
  subscriptionId: string;
  resourceGroup: string;
  provider: string;
  resourceType: string;
  resourceName: string;
}

export function parseAzureResourceId(id: string): ParsedAzureResourceId | null {
  if (!id.startsWith('/subscriptions/')) return null;

  const parts = id.split('/');
  // Expected structure:
  // ['', 'subscriptions', subId, 'resourceGroups', rg, 'providers', provider, type, name, ...]
  if (parts.length < 9) return null;

  const subscriptionId = parts[2] || '';
  const resourceGroup = parts[4] || '';
  const provider = parts[6] || '';
  const resourceType = parts[7] || '';
  const resourceName = parts[8] || '';

  return {
    subscriptionId,
    resourceGroup,
    provider,
    resourceType,
    resourceName,
  };
}

export function determineObjectKindForAzure(resourceType: AzureResourceType): ObjectKind {
  switch (resourceType) {
    case 'vnet':
      return 'group';
    case 'sql_database':
    case 'cosmos_db':
    case 'storage_account':
      return 'store';
    case 'vm':
    case 'app_service':
    case 'function_app':
    case 'aks':
    case 'container_app':
    case 'app_gateway':
    case 'front_door':
    case 'api_management':
      return 'application';
    case 'service_bus':
    case 'event_hubs':
    case 'event_grid':
      return 'component';
  }
}

export function determineConnectionKindForAzure(
  sourceType: AzureResourceType,
  targetType: AzureResourceType
): { kind: ConnectionKind; label: string; protocol: string } {
  // Front Door & Edge Ingress
  if (sourceType === 'front_door' && (targetType === 'app_service' || targetType === 'api_management' || targetType === 'app_gateway')) {
    return { kind: 'sync', label: 'Global Ingress routing', protocol: 'HTTPS' };
  }
  if (sourceType === 'api_management' && (targetType === 'function_app' || targetType === 'app_service' || targetType === 'aks' || targetType === 'container_app')) {
    return { kind: 'sync', label: 'Backend API call', protocol: 'REST / HTTPS' };
  }
  if (sourceType === 'app_gateway' && (targetType === 'aks' || targetType === 'vm' || targetType === 'app_service')) {
    return { kind: 'sync', label: 'Load balanced traffic', protocol: 'HTTP/HTTPS' };
  }

  // Storage & Database Operations
  if (targetType === 'sql_database') {
    return { kind: 'data', label: 'T-SQL queries', protocol: 'TDS : 1433' };
  }
  if (targetType === 'cosmos_db') {
    return { kind: 'data', label: 'NoSQL document store read/write', protocol: 'Cosmos DB REST' };
  }
  if (targetType === 'storage_account') {
    return { kind: 'data', label: 'Blob / Object storage operation', protocol: 'Azure Blob REST' };
  }

  // Messaging & Event Bus Interactions
  if (targetType === 'service_bus') {
    return { kind: 'async', label: 'Sends message / topic event', protocol: 'AMQP' };
  }
  if (targetType === 'event_hubs') {
    return { kind: 'async', label: 'Streams telemetry batch', protocol: 'Kafka / AMQP' };
  }
  if (sourceType === 'event_grid' || targetType === 'event_grid') {
    return { kind: 'async', label: 'Event Grid subscription trigger', protocol: 'CloudEvents' };
  }

  // Generic cloud dependency
  return { kind: 'dependency', label: 'Azure Service Integration', protocol: 'Azure SDK' };
}

// ============================================================================
// Core Mapping Function
// ============================================================================

export function importAzureSubscription(
  input: AzureSubscriptionScanInput,
  options: AzureMappingOptions
): AzureImportResult {
  const { architectureId, versionId } = options;
  const includeVnet = options.includeVnetContainment ?? true;
  const mapConnections = options.mapConnections ?? true;

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const evidence: AzureCloudEvidence[] = [];
  const unmappedResources: Array<{ id: string; reason: string }> = [];

  const resourcesByType: Record<AzureResourceType, number> = {
    vm: 0,
    app_service: 0,
    function_app: 0,
    aks: 0,
    container_app: 0,
    sql_database: 0,
    cosmos_db: 0,
    storage_account: 0,
    vnet: 0,
    app_gateway: 0,
    front_door: 0,
    api_management: 0,
    service_bus: 0,
    event_hubs: 0,
    event_grid: 0,
  };

  const objectById = new Map<string, ObjectId>();
  const objectByName = new Map<string, ObjectId>();
  const vnetObjectById = new Map<string, ObjectId>();
  const resourceById = new Map<string, AzureResource>();

  // Filter input resources
  const validResources = input.resources.filter((res) => {
    if (options.locationFilter && options.locationFilter.length > 0) {
      if (!options.locationFilter.includes(res.location)) return false;
    }
    if (options.resourceTypeFilter && options.resourceTypeFilter.length > 0) {
      if (!options.resourceTypeFilter.includes(res.resourceType)) return false;
    }
    if (options.tagFilter) {
      for (const [k, v] of Object.entries(options.tagFilter)) {
        if (!res.tags || res.tags[k] !== v) return false;
      }
    }
    return true;
  });

  // Step 1: First pass — map VNet boundaries if VNet containment is enabled
  if (includeVnet) {
    const vnetResources = validResources.filter((r) => r.resourceType === 'vnet');
    for (const vnetRes of vnetResources) {
      const vnetObjId = `obj-azure-vnet-${vnetRes.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` as ObjectId;
      const vnetObj: ModelObject = {
        id: vnetObjId,
        architectureId,
        versionId,
        parentId: null,
        kind: 'group',
        name: vnetRes.name || `Virtual Network (${vnetRes.location})`,
        description: `Azure Virtual Network in ${vnetRes.location} (${vnetRes.resourceGroup})`,
        metadata: {
          cloudProvider: 'azure',
          azureResourceType: 'vnet',
          resourceId: vnetRes.id,
          location: vnetRes.location,
          subscriptionId: vnetRes.subscriptionId,
          resourceGroup: vnetRes.resourceGroup,
          addressSpace: vnetRes.metadata?.addressSpace || '10.0.0.0/16',
          tags: vnetRes.tags || {},
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      objects.push(vnetObj);
      objectById.set(vnetRes.id, vnetObjId);
      objectByName.set(vnetRes.name, vnetObjId);
      vnetObjectById.set(vnetRes.id, vnetObjId);
      resourceById.set(vnetRes.id, vnetRes);
      resourcesByType['vnet']++;

      evidence.push({
        id: `ev-azure-${vnetRes.name}`,
        sourceType: 'cloud_resource',
        externalId: vnetRes.id,
        confidence: 1.0,
        description: `Azure VNet discovery from subscription ${vnetRes.subscriptionId}`,
        metadata: {
          resourceId: vnetRes.id,
          location: vnetRes.location,
          subscriptionId: vnetRes.subscriptionId,
          resourceGroup: vnetRes.resourceGroup,
        },
        createdAt: new Date(),
      });
    }
  }

  // Step 2: Second pass — map non-VNet resources
  const nonVnetResources = validResources.filter((r) => r.resourceType !== 'vnet');

  for (const res of nonVnetResources) {
    if (!ALL_AZURE_RESOURCE_TYPES.includes(res.resourceType)) {
      unmappedResources.push({ id: res.id, reason: `Unsupported resource type: ${res.resourceType}` });
      continue;
    }

    const objId = `obj-azure-${res.resourceType}-${res.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` as ObjectId;
    const parentId = res.vnetId && includeVnet ? vnetObjectById.get(res.vnetId) || null : null;
    const kind = determineObjectKindForAzure(res.resourceType);

    const obj: ModelObject = {
      id: objId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: res.name || `${res.resourceType.toUpperCase()}`,
      description: `Azure ${res.resourceType.toUpperCase()} resource in ${res.location}`,
      metadata: {
        cloudProvider: 'azure',
        azureResourceType: res.resourceType,
        resourceId: res.id,
        location: res.location,
        subscriptionId: res.subscriptionId,
        resourceGroup: res.resourceGroup,
        vnetId: res.vnetId || null,
        subnetId: res.subnetId || null,
        tags: res.tags || {},
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
      id: `ev-azure-${res.name}`,
      sourceType: 'cloud_resource',
      externalId: res.id,
      confidence: 0.95,
      description: `Discovered Azure ${res.resourceType.toUpperCase()} resource ${res.name}`,
      metadata: {
        resourceId: res.id,
        location: res.location,
        subscriptionId: res.subscriptionId,
        resourceGroup: res.resourceGroup,
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

          const targetType: AzureResourceType = targetResource ? targetResource.resourceType : 'app_service';
          const { kind, label, protocol } = determineConnectionKindForAzure(res.resourceType, targetType);

          const connId = `conn-azure-${connIdx++}` as ConnectionId;
          const conn: ModelConnection = {
            id: connId,
            architectureId,
            versionId,
            sourceObjectId: sourceObjId,
            targetObjectId: targetObjId,
            kind,
            label,
            description: `Azure interaction between ${res.name} and ${targetResource ? targetResource.name : targetRef}`,
            metadata: {
              cloudProvider: 'azure',
              protocol,
              sourceResourceId: res.id,
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
// Mock Azure Subscription Generator for Testing and Demo
// ============================================================================

export function createMockAzureSubscription(
  subscriptionId = 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  resourceGroup = 'rg-production-core',
  location = 'eastus'
): AzureSubscriptionScanInput {
  const vnetId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/virtualNetworks/vnet-prod-eastus`;

  const resources: AzureResource[] = [
    // 1. Virtual Network (VNet)
    {
      id: vnetId,
      resourceType: 'vnet',
      name: 'vnet-prod-eastus',
      resourceGroup,
      subscriptionId,
      location,
      tags: { Environment: 'production', CostCenter: 'infra' },
      metadata: { addressSpace: '10.100.0.0/16' },
    },
    // 2. Azure Front Door
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Cdn/profiles/afd-global-ingress`,
      resourceType: 'front_door',
      name: 'afd-global-ingress',
      resourceGroup,
      subscriptionId,
      location: 'global',
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/apim-core-gateway`],
      tags: { Environment: 'production' },
      metadata: { endpoint: 'afd-global-ingress.azurefd.net' },
    },
    // 3. API Management (APIM)
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/apim-core-gateway`,
      resourceType: 'api_management',
      name: 'apim-core-gateway',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [
        `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/app-orders-api`,
        `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/func-auth-token`,
      ],
      tags: { Environment: 'production', Tier: 'Premium' },
      metadata: { sku: 'Premium_1' },
    },
    // 4. App Gateway
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/applicationGateways/appgw-internal`,
      resourceType: 'app_gateway',
      name: 'appgw-internal',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ContainerService/managedClusters/aks-backend-cluster`],
      tags: { Environment: 'production' },
      metadata: { sku: 'WAF_v2' },
    },
    // 5. Azure App Service
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/app-orders-api`,
      resourceType: 'app_service',
      name: 'app-orders-api',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [
        `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Sql/servers/sql-prod-server/databases/sqldb-orders`,
        `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ServiceBus/namespaces/sb-orders-bus`,
      ],
      tags: { Environment: 'production', Runtime: 'dotnet8' },
      metadata: { sku: 'P2v3', alwaysOn: true },
    },
    // 6. Azure Function App
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/func-auth-token`,
      resourceType: 'function_app',
      name: 'func-auth-token',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-user-sessions`],
      tags: { Environment: 'production', Runtime: 'nodejs20' },
      metadata: { planType: 'FlexConsumption' },
    },
    // 7. Azure Kubernetes Service (AKS)
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ContainerService/managedClusters/aks-backend-cluster`,
      resourceType: 'aks',
      name: 'aks-backend-cluster',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Storage/storageAccounts/stgdatarepo`],
      tags: { Environment: 'production', KubernetesVersion: '1.29.2' },
      metadata: { nodePoolCount: 3, networkPlugin: 'azure' },
    },
    // 8. Azure Container App
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/aca-notification-worker`,
      resourceType: 'container_app',
      name: 'aca-notification-worker',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ServiceBus/namespaces/sb-orders-bus`],
      tags: { Environment: 'production' },
      metadata: { minReplicas: 1, maxReplicas: 10 },
    },
    // 9. Azure VM
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/vm-ops-bastion`,
      resourceType: 'vm',
      name: 'vm-ops-bastion',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      tags: { Environment: 'production', Role: 'Bastion' },
      metadata: { vmSize: 'Standard_B2s', osType: 'Linux' },
    },
    // 10. Azure SQL Database
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Sql/servers/sql-prod-server/databases/sqldb-orders`,
      resourceType: 'sql_database',
      name: 'sqldb-orders',
      resourceGroup,
      subscriptionId,
      location,
      vnetId,
      tags: { Environment: 'production', Engine: 'SQLServer' },
      metadata: { sku: 'GP_Gen5_4', autoPauseDelay: null },
    },
    // 11. Azure Cosmos DB
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-user-sessions`,
      resourceType: 'cosmos_db',
      name: 'cosmos-user-sessions',
      resourceGroup,
      subscriptionId,
      location,
      tags: { Environment: 'production', DefaultConsistencyLevel: 'Session' },
      metadata: { databaseAccountOfferType: 'Standard' },
    },
    // 12. Azure Storage Account
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Storage/storageAccounts/stgdatarepo`,
      resourceType: 'storage_account',
      name: 'stgdatarepo',
      resourceGroup,
      subscriptionId,
      location,
      tags: { Environment: 'production' },
      metadata: { accessTier: 'Hot', sku: 'Standard_GRS' },
    },
    // 13. Azure Service Bus
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ServiceBus/namespaces/sb-orders-bus`,
      resourceType: 'service_bus',
      name: 'sb-orders-bus',
      resourceGroup,
      subscriptionId,
      location,
      tags: { Environment: 'production' },
      metadata: { sku: 'Premium', capacity: 1 },
    },
    // 14. Azure Event Hubs
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.EventHub/namespaces/eh-telemetry-hub`,
      resourceType: 'event_hubs',
      name: 'eh-telemetry-hub',
      resourceGroup,
      subscriptionId,
      location,
      tags: { Environment: 'production' },
      metadata: { sku: 'Standard', maximumThroughputUnits: 20 },
    },
    // 15. Azure Event Grid
    {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.EventGrid/topics/eg-domain-events`,
      resourceType: 'event_grid',
      name: 'eg-domain-events',
      resourceGroup,
      subscriptionId,
      location,
      dependencies: [`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/func-auth-token`],
      tags: { Environment: 'production' },
      metadata: { inputSchema: 'CloudEventSchemaV1_0' },
    },
  ];

  return {
    subscriptionId,
    subscriptionName: 'Enterprise Production Azure Subscription',
    tenantId: '11223344-5566-7788-99aa-bbccddeeff00',
    defaultLocation: location,
    resources,
  };
}
