/**
 * DiagramHQ - AWS Infrastructure Integration (F078)
 *
 * Imports real AWS cloud infrastructure into the DiagramHQ architecture model:
 * - Supports all 13 canonical AWS resource types:
 *   - Compute: EC2, ECS, EKS, Lambda
 *   - Storage & Databases: RDS, DynamoDB, S3
 *   - Networking & Edge: CloudFront, API Gateway, VPC
 *   - Messaging & Integration: SQS, SNS, EventBridge
 * - Maps AWS resources to typed ModelObjects with metadata, tags, and ARNs
 * - Maps inter-resource dependencies to typed ModelConnections (sync, async, deploys_to)
 * - Retains grounded cloud evidence and regional topologies
 *
 * Strict Acceptance Criteria:
 * - Import EC2, ECS, EKS, Lambda, RDS, DynamoDB, S3, CloudFront, API Gateway, SQS, SNS, EventBridge, VPC as objects
 * - Test: import a mocked account -> resources mapped.
 */

import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';
import type { ConnectionKind, ModelConnection, ModelObject, ObjectKind } from './types';

// ============================================================================
// AWS Types
// ============================================================================

export type AwsResourceType =
  | 'ec2'
  | 'ecs'
  | 'eks'
  | 'lambda'
  | 'rds'
  | 'dynamodb'
  | 's3'
  | 'cloudfront'
  | 'api_gateway'
  | 'sqs'
  | 'sns'
  | 'eventbridge'
  | 'vpc';

export const ALL_AWS_RESOURCE_TYPES: readonly AwsResourceType[] = [
  'ec2',
  'ecs',
  'eks',
  'lambda',
  'rds',
  'dynamodb',
  's3',
  'cloudfront',
  'api_gateway',
  'sqs',
  'sns',
  'eventbridge',
  'vpc',
] as const;

export interface AwsResource {
  arn: string;
  resourceType: AwsResourceType;
  resourceId: string;
  name: string;
  region: string;
  accountId: string;
  vpcId?: string;
  subnetIds?: string[];
  tags?: Record<string, string>;
  dependencies?: string[]; // Target ARNs or resource IDs
  metadata?: Record<string, unknown>;
}

export interface AwsAccountScanInput {
  accountId: string;
  accountName?: string;
  defaultRegion?: string;
  resources: AwsResource[];
}

export interface AwsMappingOptions {
  architectureId: ArchitectureId;
  versionId: VersionId;
  includeVpcContainment?: boolean;
  mapConnections?: boolean;
  regionFilter?: string[];
  resourceTypeFilter?: AwsResourceType[];
  tagFilter?: Record<string, string>;
}

export interface AwsCloudEvidence {
  id: string;
  sourceType: 'cloud_resource';
  externalId: string;
  confidence: number;
  description: string;
  metadata: {
    arn: string;
    region: string;
    accountId: string;
  };
  createdAt: Date;
}

export interface AwsImportResult {
  architectureId: ArchitectureId;
  versionId: VersionId;
  scannedCount: number;
  mappedObjectCount: number;
  mappedConnectionCount: number;
  objects: ModelObject[];
  connections: ModelConnection[];
  evidence: AwsCloudEvidence[];
  resourcesByType: Record<AwsResourceType, number>;
  unmappedResources: Array<{ arn: string; reason: string }>;
}

// ============================================================================
// ARN Parsing & Helpers
// ============================================================================

export interface ParsedAwsArn {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resourceType?: string;
  resourceId: string;
}

export function parseAwsArn(arn: string): ParsedAwsArn | null {
  if (!arn.startsWith('arn:')) return null;

  const parts = arn.split(':');
  if (parts.length < 6) return null;

  const partition = parts[1] || 'aws';
  const service = parts[2] || '';
  const region = parts[3] || '';
  const accountId = parts[4] || '';
  const remainder = parts.slice(5).join(':');

  let resourceType: string | undefined;
  let resourceId = remainder;

  if (remainder.includes('/')) {
    const slashIdx = remainder.indexOf('/');
    resourceType = remainder.slice(0, slashIdx);
    resourceId = remainder.slice(slashIdx + 1);
  } else if (remainder.includes(':')) {
    const colonIdx = remainder.indexOf(':');
    resourceType = remainder.slice(0, colonIdx);
    resourceId = remainder.slice(colonIdx + 1);
  }

  return {
    partition,
    service,
    region,
    accountId,
    resourceType,
    resourceId,
  };
}

export function determineObjectKindForAws(resourceType: AwsResourceType): ObjectKind {
  switch (resourceType) {
    case 'vpc':
      return 'group';
    case 'rds':
    case 'dynamodb':
    case 's3':
      return 'store';
    case 'ec2':
    case 'ecs':
    case 'eks':
    case 'lambda':
    case 'api_gateway':
    case 'cloudfront':
      return 'application';
    case 'sqs':
    case 'sns':
    case 'eventbridge':
      return 'component';
  }
}

export function determineConnectionKindForAws(
  sourceType: AwsResourceType,
  targetType: AwsResourceType
): { kind: ConnectionKind; label: string; protocol: string } {
  // Event-driven / asynchronous messaging
  if (sourceType === 'sns' && targetType === 'sqs') {
    return { kind: 'async', label: 'Fanout subscription', protocol: 'SQS/SNS' };
  }
  if (sourceType === 'eventbridge') {
    return { kind: 'async', label: 'EventBridge Rule Trigger', protocol: 'EventBridge' };
  }
  if (targetType === 'sqs' || targetType === 'sns' || targetType === 'eventbridge') {
    return { kind: 'async', label: 'Publishes message', protocol: 'AWS SDK Async' };
  }

  // Edge / Gateway Ingress
  if (sourceType === 'cloudfront' && (targetType === 's3' || targetType === 'api_gateway')) {
    return { kind: 'sync', label: 'Origin fetch', protocol: 'HTTPS' };
  }
  if (sourceType === 'api_gateway' && (targetType === 'lambda' || targetType === 'ecs' || targetType === 'ec2')) {
    return { kind: 'sync', label: 'Proxy integration', protocol: 'AWS_PROXY' };
  }

  // Database / Storage queries
  if (targetType === 'rds') {
    return { kind: 'data', label: 'SQL queries', protocol: 'PostgreSQL/MySQL' };
  }
  if (targetType === 'dynamodb') {
    return { kind: 'data', label: 'Document store read/write', protocol: 'DynamoDB API' };
  }
  if (targetType === 's3') {
    return { kind: 'data', label: 'Object storage put/get', protocol: 'S3 REST' };
  }

  // Default dependency
  return { kind: 'dependency', label: 'AWS Service Dependency', protocol: 'AWS SDK' };
}

// ============================================================================
// Core Mapping Function
// ============================================================================

export function importAwsAccount(
  input: AwsAccountScanInput,
  options: AwsMappingOptions
): AwsImportResult {
  const { architectureId, versionId } = options;
  const includeVpc = options.includeVpcContainment ?? true;
  const mapConnections = options.mapConnections ?? true;

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const evidence: AwsCloudEvidence[] = [];
  const unmappedResources: Array<{ arn: string; reason: string }> = [];

  const resourcesByType: Record<AwsResourceType, number> = {
    ec2: 0,
    ecs: 0,
    eks: 0,
    lambda: 0,
    rds: 0,
    dynamodb: 0,
    s3: 0,
    cloudfront: 0,
    api_gateway: 0,
    sqs: 0,
    sns: 0,
    eventbridge: 0,
    vpc: 0,
  };

  // Lookup maps for linking
  const objectByArn = new Map<string, ObjectId>();
  const objectByResourceId = new Map<string, ObjectId>();
  const vpcObjectByVpcId = new Map<string, ObjectId>();
  const resourceByArn = new Map<string, AwsResource>();

  // Filter input resources
  const validResources = input.resources.filter((res) => {
    if (options.regionFilter && options.regionFilter.length > 0) {
      if (!options.regionFilter.includes(res.region)) return false;
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

  // Step 1: First pass — map VPC boundaries if VPC containment is enabled
  if (includeVpc) {
    const vpcResources = validResources.filter((r) => r.resourceType === 'vpc');
    for (const vpcRes of vpcResources) {
      const vpcObjId = `obj-aws-vpc-${vpcRes.resourceId}` as ObjectId;
      const vpcObj: ModelObject = {
        id: vpcObjId,
        architectureId,
        versionId,
        parentId: null,
        kind: 'group',
        name: vpcRes.name || `VPC (${vpcRes.resourceId})`,
        description: `Amazon Virtual Private Cloud in ${vpcRes.region} (${vpcRes.accountId})`,
        metadata: {
          cloudProvider: 'aws',
          awsResourceType: 'vpc',
          arn: vpcRes.arn,
          resourceId: vpcRes.resourceId,
          region: vpcRes.region,
          accountId: vpcRes.accountId,
          cidrBlock: vpcRes.metadata?.cidrBlock || '10.0.0.0/16',
          tags: vpcRes.tags || {},
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      objects.push(vpcObj);
      objectByArn.set(vpcRes.arn, vpcObjId);
      objectByResourceId.set(vpcRes.resourceId, vpcObjId);
      vpcObjectByVpcId.set(vpcRes.resourceId, vpcObjId);
      resourceByArn.set(vpcRes.arn, vpcRes);
      resourcesByType['vpc']++;

      evidence.push({
        id: `ev-aws-${vpcRes.resourceId}`,
        sourceType: 'cloud_resource',
        externalId: vpcRes.arn,
        confidence: 1.0,
        description: `AWS VPC discovery from account ${vpcRes.accountId}`,
        metadata: { region: vpcRes.region, arn: vpcRes.arn, accountId: vpcRes.accountId },
        createdAt: new Date(),
      });
    }
  }

  // Step 2: Second pass — map all non-VPC resources
  const nonVpcResources = validResources.filter((r) => r.resourceType !== 'vpc');

  for (const res of nonVpcResources) {
    if (!ALL_AWS_RESOURCE_TYPES.includes(res.resourceType)) {
      unmappedResources.push({ arn: res.arn, reason: `Unsupported resource type: ${res.resourceType}` });
      continue;
    }

    const objId = `obj-aws-${res.resourceType}-${res.resourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}` as ObjectId;
    const parentId = res.vpcId && includeVpc ? vpcObjectByVpcId.get(res.vpcId) || null : null;
    const kind = determineObjectKindForAws(res.resourceType);

    const obj: ModelObject = {
      id: objId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: res.name || `${res.resourceType.toUpperCase()} (${res.resourceId})`,
      description: `AWS ${res.resourceType.toUpperCase()} resource in ${res.region}`,
      metadata: {
        cloudProvider: 'aws',
        awsResourceType: res.resourceType,
        arn: res.arn,
        resourceId: res.resourceId,
        region: res.region,
        accountId: res.accountId,
        vpcId: res.vpcId || null,
        subnetIds: res.subnetIds || [],
        tags: res.tags || {},
        ...(res.metadata || {}),
      },
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    objects.push(obj);
    objectByArn.set(res.arn, objId);
    objectByResourceId.set(res.resourceId, objId);
    resourceByArn.set(res.arn, res);
    resourcesByType[res.resourceType]++;

    evidence.push({
      id: `ev-aws-${res.resourceId}`,
      sourceType: 'cloud_resource',
      externalId: res.arn,
      confidence: 0.95,
      description: `Discovered AWS ${res.resourceType.toUpperCase()} resource ${res.name}`,
      metadata: {
        arn: res.arn,
        region: res.region,
        accountId: res.accountId,
      },
      createdAt: new Date(),
    });
  }

  // Step 3: Third pass — map relationships and dependencies into ModelConnection
  if (mapConnections) {
    let connIdx = 1;
    for (const res of validResources) {
      const sourceObjId = objectByArn.get(res.arn);
      if (!sourceObjId) continue;

      if (res.dependencies && res.dependencies.length > 0) {
        for (const targetRef of res.dependencies) {
          // Resolve by ARN or by resource ID
          const targetObjId = objectByArn.get(targetRef) || objectByResourceId.get(targetRef);
          if (!targetObjId || targetObjId === sourceObjId) continue;

          const targetResource = resourceByArn.get(targetRef) ||
            Array.from(resourceByArn.values()).find((r) => r.resourceId === targetRef);

          const targetType: AwsResourceType = targetResource ? targetResource.resourceType : 'lambda';
          const { kind, label, protocol } = determineConnectionKindForAws(res.resourceType, targetType);

          const connId = `conn-aws-${connIdx++}` as ConnectionId;
          const conn: ModelConnection = {
            id: connId,
            architectureId,
            versionId,
            sourceObjectId: sourceObjId,
            targetObjectId: targetObjId,
            kind,
            label,
            description: `AWS interaction between ${res.name} and ${targetResource ? targetResource.name : targetRef}`,
            metadata: {
              cloudProvider: 'aws',
              protocol,
              sourceArn: res.arn,
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
// Mock AWS Account Generator for Testing and Demo
// ============================================================================

export function createMockAwsAccount(accountId = '123456789012', region = 'us-east-1'): AwsAccountScanInput {
  const vpcId = 'vpc-0a1b2c3d4e5f6g7h8';
  const vpcArn = `arn:aws:ec2:${region}:${accountId}:vpc/${vpcId}`;

  const resources: AwsResource[] = [
    // 1. VPC
    {
      arn: vpcArn,
      resourceType: 'vpc',
      resourceId: vpcId,
      name: 'Production Core VPC',
      region,
      accountId,
      tags: { Environment: 'production', CostCenter: 'platform' },
      metadata: { cidrBlock: '10.0.0.0/16' },
    },
    // 2. CloudFront
    {
      arn: `arn:aws:cloudfront::${accountId}:distribution/EDFDVBD632BHYS5`,
      resourceType: 'cloudfront',
      resourceId: 'EDFDVBD632BHYS5',
      name: 'Global CDN Web Ingress',
      region: 'global',
      accountId,
      dependencies: [`arn:aws:s3:::production-web-static-assets`, `arn:aws:apigateway:${region}::/restapis/api-prod-core`],
      tags: { Environment: 'production' },
      metadata: { domainName: 'd111111abcdef8.cloudfront.net' },
    },
    // 3. S3 Bucket
    {
      arn: `arn:aws:s3:::production-web-static-assets`,
      resourceType: 's3',
      resourceId: 'production-web-static-assets',
      name: 'Web Static Assets Store',
      region,
      accountId,
      tags: { Environment: 'production', Security: 'private-oac' },
      metadata: { bucketEncryption: 'AES256', versioning: 'Enabled' },
    },
    // 4. API Gateway
    {
      arn: `arn:aws:apigateway:${region}::/restapis/api-prod-core`,
      resourceType: 'api_gateway',
      resourceId: 'api-prod-core',
      name: 'Edge API Gateway',
      region,
      accountId,
      dependencies: [`arn:aws:lambda:${region}:${accountId}:function:auth-authorizer`, `arn:aws:lambda:${region}:${accountId}:function:order-service`],
      tags: { Environment: 'production', Tier: 'tier-1' },
      metadata: { endpointType: 'REGIONAL', stage: 'v1' },
    },
    // 5. Lambda (Authorizer)
    {
      arn: `arn:aws:lambda:${region}:${accountId}:function:auth-authorizer`,
      resourceType: 'lambda',
      resourceId: 'auth-authorizer',
      name: 'JWT Lambda Authorizer',
      region,
      accountId,
      vpcId,
      dependencies: [`arn:aws:dynamodb:${region}:${accountId}:table/UserSessions`],
      tags: { Environment: 'production', Runtime: 'nodejs20.x' },
      metadata: { memorySize: 256, timeout: 3 },
    },
    // 6. Lambda (Order Processing)
    {
      arn: `arn:aws:lambda:${region}:${accountId}:function:order-service`,
      resourceType: 'lambda',
      resourceId: 'order-service',
      name: 'Order Processing Function',
      region,
      accountId,
      vpcId,
      dependencies: [
        `arn:aws:rds:${region}:${accountId}:db:prod-payments-postgres`,
        `arn:aws:sns:${region}:${accountId}:order-events-topic`,
      ],
      tags: { Environment: 'production', Runtime: 'nodejs20.x' },
      metadata: { memorySize: 1024, timeout: 15 },
    },
    // 7. DynamoDB
    {
      arn: `arn:aws:dynamodb:${region}:${accountId}:table/UserSessions`,
      resourceType: 'dynamodb',
      resourceId: 'UserSessions',
      name: 'Active User Sessions Table',
      region,
      accountId,
      tags: { Environment: 'production' },
      metadata: { billingMode: 'PAY_PER_REQUEST', primaryKey: 'sessionId' },
    },
    // 8. RDS PostgreSQL
    {
      arn: `arn:aws:rds:${region}:${accountId}:db:prod-payments-postgres`,
      resourceType: 'rds',
      resourceId: 'prod-payments-postgres',
      name: 'Primary Ledger RDS PostgreSQL',
      region,
      accountId,
      vpcId,
      tags: { Environment: 'production', Engine: 'postgres' },
      metadata: { engine: 'postgres', engineVersion: '16.2', instanceClass: 'db.r6g.xlarge', multiAz: true },
    },
    // 9. SNS Topic
    {
      arn: `arn:aws:sns:${region}:${accountId}:order-events-topic`,
      resourceType: 'sns',
      resourceId: 'order-events-topic',
      name: 'Order Lifecycle Events Topic',
      region,
      accountId,
      dependencies: [`arn:aws:sqs:${region}:${accountId}:fulfillment-queue`],
      tags: { Environment: 'production' },
      metadata: { fifoTopic: false },
    },
    // 10. SQS Queue
    {
      arn: `arn:aws:sqs:${region}:${accountId}:fulfillment-queue`,
      resourceType: 'sqs',
      resourceId: 'fulfillment-queue',
      name: 'Fulfillment Worker Queue',
      region,
      accountId,
      tags: { Environment: 'production' },
      metadata: { visibilityTimeout: 30, messageRetentionPeriod: 86400 },
    },
    // 11. EventBridge Event Bus
    {
      arn: `arn:aws:events:${region}:${accountId}:event-bus/audit-events`,
      resourceType: 'eventbridge',
      resourceId: 'audit-events',
      name: 'Global Enterprise Audit Bus',
      region,
      accountId,
      dependencies: [`arn:aws:sqs:${region}:${accountId}:fulfillment-queue`],
      tags: { Environment: 'production' },
      metadata: { ruleCount: 4 },
    },
    // 12. ECS Cluster & Service
    {
      arn: `arn:aws:ecs:${region}:${accountId}:cluster/prod-backend-cluster`,
      resourceType: 'ecs',
      resourceId: 'prod-backend-cluster',
      name: 'Backend Microservices ECS Cluster',
      region,
      accountId,
      vpcId,
      dependencies: [`arn:aws:rds:${region}:${accountId}:db:prod-payments-postgres`],
      tags: { Environment: 'production', LaunchType: 'FARGATE' },
      metadata: { runningTasksCount: 12, serviceCount: 4 },
    },
    // 13. EKS Cluster
    {
      arn: `arn:aws:eks:${region}:${accountId}:cluster/analytics-eks-cluster`,
      resourceType: 'eks',
      resourceId: 'analytics-eks-cluster',
      name: 'BigData Analytics EKS Cluster',
      region,
      accountId,
      vpcId,
      tags: { Environment: 'production', KubernetesVersion: '1.29' },
      metadata: { nodeGroups: ['analytics-m5-workers'], platformVersion: 'eks.7' },
    },
    // 14. EC2 Bastion Instance
    {
      arn: `arn:aws:ec2:${region}:${accountId}:instance/i-0987654321fedcba0`,
      resourceType: 'ec2',
      resourceId: 'i-0987654321fedcba0',
      name: 'Secure Ops Bastion Host',
      region,
      accountId,
      vpcId,
      tags: { Environment: 'production', Role: 'bastion' },
      metadata: { instanceType: 't4g.micro', state: 'running' },
    },
  ];

  return {
    accountId,
    accountName: 'Production AWS Core Account',
    defaultRegion: region,
    resources,
  };
}
