/**
 * Extensible Object-Type Registry & Catalog (F112 / MODULES.md §1).
 *
 * Provides extensible registration for architecture model object kinds.
 * Built-in types are seeded at module initialization. New types (custom kinds,
 * cloud providers, domain-specific primitives) register without editing the core.
 */

export interface InspectorFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: 'text' | 'textarea' | 'select' | 'tags' | 'number' | 'boolean' | 'url';
  readonly options?: readonly string[];
  readonly placeholder?: string;
  readonly defaultValue?: unknown;
  readonly required?: boolean;
  readonly description?: string;
}

export interface InspectorSectionDefinition {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly fields: readonly InspectorFieldDefinition[];
}

export interface ObjectTypeDefinition {
  readonly kind: string;
  readonly label: string;
  readonly icon: string;
  readonly category:
    | 'actor'
    | 'system'
    | 'compute'
    | 'storage'
    | 'network'
    | 'messaging'
    | 'grouping'
    | 'custom';
  readonly description?: string;
  readonly allowedParents?: readonly string[];
  readonly allowedConnectionKinds?: readonly string[];
  readonly metadataSchema?: Record<string, unknown>;
  readonly inspectorSection?: InspectorSectionDefinition;
  readonly defaultStyle?: Record<string, unknown>;
}

/**
 * The standard built-in object types seeded into the catalog (F112).
 * 22 types: person, actor, system, external-system, application, service,
 * component, database, cache, queue, topic, bucket, api, function, server,
 * container, k8s-workload, cloud-resource, load-balancer, gateway, group, boundary.
 */
export const BUILTIN_OBJECT_TYPES: readonly ObjectTypeDefinition[] = [
  {
    kind: 'person',
    label: 'Person',
    icon: 'user',
    category: 'actor',
    description: 'Human user, customer, internal operator, or stakeholder of the architecture.',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency'],
    metadataSchema: {
      role: 'End User',
      external: false,
      department: '',
    },
    inspectorSection: {
      id: 'person-details',
      title: 'Person Details',
      description: 'Profile and identity attributes for human actors.',
      fields: [
        { key: 'role', label: 'User Role', type: 'text', placeholder: 'e.g. Retail Customer, Admin' },
        { key: 'department', label: 'Department / Org', type: 'text', placeholder: 'e.g. Operations' },
        { key: 'external', label: 'External User', type: 'boolean', defaultValue: false },
      ],
    },
  },
  {
    kind: 'actor',
    label: 'Actor',
    icon: 'users',
    category: 'actor',
    description: 'Abstract role, persona, or external entity interacting with systems.',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency'],
    metadataSchema: {
      actorType: 'external_client',
      interfaceMethod: 'web',
    },
    inspectorSection: {
      id: 'actor-details',
      title: 'Actor Details',
      description: 'Actor role and interaction modality.',
      fields: [
        {
          key: 'actorType',
          label: 'Actor Classification',
          type: 'select',
          options: ['external_client', 'third_party_system', 'automated_bot', 'internal_staff'],
          defaultValue: 'external_client',
        },
        { key: 'interactionMethod', label: 'Primary Interaction', type: 'text', placeholder: 'e.g. REST API, Portal' },
      ],
    },
  },
  {
    kind: 'system',
    label: 'Software System',
    icon: 'layers',
    category: 'system',
    description: 'High-level software system providing cohesive business value (C4 Context level).',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      scope: 'internal',
      tier: 'tier-1',
      criticality: 'high',
    },
    inspectorSection: {
      id: 'system-details',
      title: 'System Specification',
      description: 'System-level architecture boundaries and tier.',
      fields: [
        { key: 'scope', label: 'System Scope', type: 'select', options: ['internal', 'external', 'shared'] },
        { key: 'tier', label: 'Operational Tier', type: 'select', options: ['tier-1', 'tier-2', 'tier-3', 'tier-4'] },
        { key: 'serviceLevelObjective', label: 'Target SLO', type: 'text', placeholder: 'e.g. 99.95%' },
      ],
    },
  },
  {
    kind: 'external-system',
    label: 'External System',
    icon: 'external-link',
    category: 'system',
    description: 'Third-party SaaS, legacy upstream, partner platform, or external integration.',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency'],
    metadataSchema: {
      vendor: '',
      integrationMethod: 'REST / Webhook',
      contractOwner: '',
    },
    inspectorSection: {
      id: 'external-system-details',
      title: 'External System Properties',
      description: 'Vendor details and contractual SLA.',
      fields: [
        { key: 'vendor', label: 'Vendor / Provider', type: 'text', placeholder: 'e.g. Stripe, Salesforce' },
        { key: 'integrationMethod', label: 'Integration Protocol', type: 'text', placeholder: 'e.g. Webhook, REST, SFTP' },
        { key: 'slaStatus', label: 'Vendor SLA Tier', type: 'select', options: ['gold', 'silver', 'bronze', 'best-effort'] },
      ],
    },
  },
  {
    kind: 'application',
    label: 'Application',
    icon: 'app-window',
    category: 'compute',
    description: 'Deployable unit of software, e.g. web front-end, mobile client, or monolith service.',
    allowedParents: ['system', 'group', 'boundary', 'server', 'container', 'k8s-workload'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      runtime: 'node',
      framework: 'Next.js',
      appType: 'spa',
    },
    inspectorSection: {
      id: 'application-details',
      title: 'Application Stack',
      description: 'Runtime environment, frameworks, and deployment targets.',
      fields: [
        { key: 'framework', label: 'Framework / Tech', type: 'text', placeholder: 'e.g. Next.js, React, Django' },
        { key: 'runtime', label: 'Runtime Environment', type: 'text', placeholder: 'e.g. Node 20, Python 3.12' },
        { key: 'appType', label: 'Application Type', type: 'select', options: ['spa', 'ssr', 'mobile', 'desktop', 'monolith'] },
      ],
    },
  },
  {
    kind: 'service',
    label: 'Service / Microservice',
    icon: 'server',
    category: 'compute',
    description: 'Autonomous microservice or backend daemon implementing specific business logic.',
    allowedParents: ['system', 'group', 'boundary', 'container', 'k8s-workload', 'server'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      language: 'TypeScript',
      framework: 'Fastify',
      port: 8080,
    },
    inspectorSection: {
      id: 'service-details',
      title: 'Service Profile',
      description: 'Port bindings, protocol, and code repository.',
      fields: [
        { key: 'language', label: 'Programming Language', type: 'text', placeholder: 'e.g. Go, Java, TypeScript' },
        { key: 'port', label: 'Listening Port', type: 'number', placeholder: '8080' },
        { key: 'healthCheckPath', label: 'Health Check Endpoint', type: 'text', placeholder: '/healthz' },
      ],
    },
  },
  {
    kind: 'component',
    label: 'Component',
    icon: 'box',
    category: 'compute',
    description: 'Fine-grained module, controller, repository, or package inside a service (C4 Level 3).',
    allowedParents: ['application', 'service', 'container', 'system', 'group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency'],
    metadataSchema: {
      moduleType: 'controller',
      interfaceExport: '',
    },
    inspectorSection: {
      id: 'component-details',
      title: 'Component Structure',
      description: 'Internal module patterns and architectural roles.',
      fields: [
        {
          key: 'moduleType',
          label: 'Pattern / Role',
          type: 'select',
          options: ['controller', 'use-case', 'repository', 'domain-service', 'adapter', 'facade'],
        },
        { key: 'namespace', label: 'Package / Namespace', type: 'text', placeholder: 'e.g. @app/billing-core' },
      ],
    },
  },
  {
    kind: 'database',
    label: 'Database',
    icon: 'database',
    category: 'storage',
    description: 'Relational or document persistent datastore (PostgreSQL, MySQL, MongoDB, DynamoDB).',
    allowedParents: ['system', 'group', 'boundary', 'server', 'cloud-resource'],
    allowedConnectionKinds: ['data', 'sync', 'dependency'],
    metadataSchema: {
      engine: 'PostgreSQL',
      version: '16',
      replication: 'primary-replica',
      backupRpoHours: 1,
    },
    inspectorSection: {
      id: 'database-details',
      title: 'Database Engine',
      description: 'Engine, schemas, clustering, and storage specs.',
      fields: [
        {
          key: 'engine',
          label: 'Database Engine',
          type: 'select',
          options: ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'Cassandra', 'CockroachDB', 'Oracle', 'SQL Server'],
        },
        { key: 'clusterTopology', label: 'Topology', type: 'select', options: ['single-instance', 'primary-replica', 'multi-region', 'sharded'] },
        { key: 'databaseName', label: 'Default Catalog / DB', type: 'text', placeholder: 'e.g. app_production' },
      ],
    },
  },
  {
    kind: 'cache',
    label: 'Cache',
    icon: 'zap',
    category: 'storage',
    description: 'In-memory fast lookup cache or distributed key-value store (Redis, Memcached, Dragonfly).',
    allowedParents: ['system', 'group', 'boundary', 'server', 'cloud-resource'],
    allowedConnectionKinds: ['data', 'sync', 'dependency'],
    metadataSchema: {
      engine: 'Redis',
      evictionPolicy: 'volatile-lru',
      ttlSeconds: 3600,
    },
    inspectorSection: {
      id: 'cache-details',
      title: 'Cache Configuration',
      description: 'Eviction policy, cluster size, and TTL.',
      fields: [
        { key: 'engine', label: 'Cache Engine', type: 'select', options: ['Redis', 'Memcached', 'Dragonfly', 'Valkey'] },
        { key: 'evictionPolicy', label: 'Eviction Policy', type: 'select', options: ['volatile-lru', 'allkeys-lru', 'volatile-ttl', 'noeviction'] },
        { key: 'ttlSeconds', label: 'Default TTL (seconds)', type: 'number', placeholder: '3600' },
      ],
    },
  },
  {
    kind: 'queue',
    label: 'Message Queue',
    icon: 'git-commit',
    category: 'messaging',
    description: 'Point-to-point asynchronous message queue (RabbitMQ, SQS, Celery, BullMQ).',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['async', 'data', 'dependency'],
    metadataSchema: {
      broker: 'RabbitMQ',
      fifo: true,
      deadLetterQueue: true,
    },
    inspectorSection: {
      id: 'queue-details',
      title: 'Queue Configuration',
      description: 'Queue topology, dead-lettering, and ordering guarantees.',
      fields: [
        { key: 'broker', label: 'Queue Broker', type: 'text', placeholder: 'e.g. RabbitMQ, AWS SQS, Azure Service Bus' },
        { key: 'fifo', label: 'Strict FIFO Ordering', type: 'boolean', defaultValue: true },
        { key: 'deadLetterQueue', label: 'DLQ Configured', type: 'boolean', defaultValue: true },
      ],
    },
  },
  {
    kind: 'topic',
    label: 'Event Topic / Stream',
    icon: 'radio',
    category: 'messaging',
    description: 'Publish-subscribe event topic or log stream (Apache Kafka, AWS SNS, GCP Pub/Sub, Pulsar).',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['async', 'data', 'dependency'],
    metadataSchema: {
      broker: 'Apache Kafka',
      partitions: 6,
      retentionDays: 7,
    },
    inspectorSection: {
      id: 'topic-details',
      title: 'Event Topic Parameters',
      description: 'Stream partitioning, retention, and schema registry.',
      fields: [
        { key: 'broker', label: 'Event Streaming Platform', type: 'text', placeholder: 'e.g. Apache Kafka, Redpanda, AWS SNS/EventBridge' },
        { key: 'partitions', label: 'Partition Count', type: 'number', placeholder: '6' },
        { key: 'retentionDays', label: 'Retention Period (Days)', type: 'number', placeholder: '7' },
      ],
    },
  },
  {
    kind: 'bucket',
    label: 'Object Storage Bucket',
    icon: 'archive',
    category: 'storage',
    description: 'Object / blob storage bucket (Amazon S3, Google Cloud Storage, Azure Blob Storage).',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['data', 'sync', 'dependency'],
    metadataSchema: {
      provider: 'AWS S3',
      storageClass: 'Standard',
      versioning: true,
      encryption: 'AES-256',
    },
    inspectorSection: {
      id: 'bucket-details',
      title: 'Object Store Settings',
      description: 'Storage tiering, versioning, and encryption at rest.',
      fields: [
        { key: 'storageClass', label: 'Storage Tier', type: 'select', options: ['Standard', 'Infrequent Access', 'Archive/Glacier', 'Multi-region'] },
        { key: 'versioning', label: 'Object Versioning', type: 'boolean', defaultValue: true },
        { key: 'encryption', label: 'Encryption Key Type', type: 'text', placeholder: 'e.g. SSE-KMS, AES-256' },
      ],
    },
  },
  {
    kind: 'api',
    label: 'API / Endpoint',
    icon: 'network',
    category: 'network',
    description: 'Declared HTTP / gRPC / GraphQL endpoint or OpenAPI contract.',
    allowedParents: ['application', 'service', 'gateway', 'system', 'group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'dependency'],
    metadataSchema: {
      basePath: '/v1',
      protocol: 'HTTPS',
      specFormat: 'OpenAPI 3.1',
    },
    inspectorSection: {
      id: 'api-details',
      title: 'API Interface',
      description: 'Base path, API specification, and public routing.',
      fields: [
        { key: 'basePath', label: 'Base Path', type: 'text', placeholder: '/api/v1' },
        { key: 'specFormat', label: 'Specification Standard', type: 'select', options: ['OpenAPI 3.1', 'OpenAPI 3.0', 'GraphQL Schema', 'Protobuf'] },
        { key: 'docsUrl', label: 'Swagger / Documentation URL', type: 'url', placeholder: 'https://api.example.com/docs' },
      ],
    },
  },
  {
    kind: 'function',
    label: 'Serverless Function',
    icon: 'code',
    category: 'compute',
    description: 'Event-driven serverless compute (AWS Lambda, Cloud Functions, Cloudflare Workers).',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency'],
    metadataSchema: {
      memoryMb: 512,
      timeoutSeconds: 30,
      concurrency: 100,
    },
    inspectorSection: {
      id: 'function-details',
      title: 'Function Execution',
      description: 'Memory allocation, execution timeout, and trigger event.',
      fields: [
        { key: 'memoryMb', label: 'Allocated Memory (MB)', type: 'number', placeholder: '512' },
        { key: 'timeoutSeconds', label: 'Timeout Limit (Seconds)', type: 'number', placeholder: '30' },
        { key: 'triggerSource', label: 'Invocation Trigger', type: 'text', placeholder: 'e.g. SQS Event, HTTP Gateway' },
      ],
    },
  },
  {
    kind: 'server',
    label: 'Server / Host',
    icon: 'hard-drive',
    category: 'compute',
    description: 'Physical bare-metal host, dedicated server, or virtual machine instance (EC2, Azure VM).',
    allowedParents: ['group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      os: 'Ubuntu 22.04 LTS',
      instanceType: 't3.xlarge',
      cpuCores: 4,
      memoryGb: 16,
    },
    inspectorSection: {
      id: 'server-details',
      title: 'Host Hardware & OS',
      description: 'Operating system, CPU, memory, and virtualization layer.',
      fields: [
        { key: 'os', label: 'Operating System', type: 'text', placeholder: 'e.g. Ubuntu 24.04, Debian 12' },
        { key: 'instanceType', label: 'Instance Sizing', type: 'text', placeholder: 'e.g. c6i.2xlarge, Standard_D4s_v5' },
        { key: 'cpuCores', label: 'vCPU Cores', type: 'number', placeholder: '4' },
      ],
    },
  },
  {
    kind: 'container',
    label: 'Container',
    icon: 'box',
    category: 'compute',
    description: 'OCI container instance running Docker / Containerd container images.',
    allowedParents: ['server', 'k8s-workload', 'system', 'group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      image: '',
      tag: 'latest',
      containerPort: 8080,
    },
    inspectorSection: {
      id: 'container-details',
      title: 'Container Image Specification',
      description: 'Registry repository, container port, and volume mounts.',
      fields: [
        { key: 'image', label: 'Container Image Repository', type: 'text', placeholder: 'ghcr.io/org/service' },
        { key: 'tag', label: 'Image Tag / Digest', type: 'text', placeholder: 'v1.4.2' },
        { key: 'containerPort', label: 'Exposed Port', type: 'number', placeholder: '8080' },
      ],
    },
  },
  {
    kind: 'k8s-workload',
    label: 'Kubernetes Workload',
    icon: 'anchor',
    category: 'compute',
    description: 'Kubernetes Deployment, StatefulSet, DaemonSet, Job, or Helm release.',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      workloadKind: 'Deployment',
      namespace: 'production',
      replicas: 3,
    },
    inspectorSection: {
      id: 'k8s-details',
      title: 'Kubernetes Workload Specification',
      description: 'Resource kind, target namespace, and autoscaling parameters.',
      fields: [
        { key: 'workloadKind', label: 'Resource Kind', type: 'select', options: ['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob', 'Rollout'] },
        { key: 'namespace', label: 'Target Namespace', type: 'text', placeholder: 'default, production' },
        { key: 'replicas', label: 'Replica Count', type: 'number', placeholder: '3' },
      ],
    },
  },
  {
    kind: 'cloud-resource',
    label: 'Cloud Resource',
    icon: 'cloud',
    category: 'compute',
    description: 'Managed cloud resource or infra service (AWS, Azure, Google Cloud).',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['sync', 'async', 'data', 'dependency', 'deploys_to'],
    metadataSchema: {
      cloudProvider: 'aws',
      region: 'us-east-1',
      terraformResource: '',
    },
    inspectorSection: {
      id: 'cloud-details',
      title: 'Cloud Infrastructure Profile',
      description: 'Cloud provider, provisioning region, and infrastructure-as-code address.',
      fields: [
        { key: 'cloudProvider', label: 'Cloud Provider', type: 'select', options: ['aws', 'azure', 'gcp', 'cloudflare', 'digitalocean'] },
        { key: 'region', label: 'Region / Availability Zone', type: 'text', placeholder: 'us-east-1, westeurope' },
        { key: 'terraformResource', label: 'Terraform Resource Identifier', type: 'text', placeholder: 'aws_ecs_cluster.main' },
      ],
    },
  },
  {
    kind: 'load-balancer',
    label: 'Load Balancer',
    icon: 'git-merge',
    category: 'network',
    description: 'Layer 4 / Layer 7 traffic distributor (ALB, NLB, Envoy, HAProxy, NGINX).',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['sync', 'async', 'dependency'],
    metadataSchema: {
      layer: 'L7 (Application)',
      scheme: 'internet-facing',
      algorithm: 'round-robin',
    },
    inspectorSection: {
      id: 'load-balancer-details',
      title: 'Load Balancing Configuration',
      description: 'Network tier, distribution algorithm, and TLS termination.',
      fields: [
        { key: 'layer', label: 'OSI Layer', type: 'select', options: ['L7 (Application)', 'L4 (Network/TCP)'] },
        { key: 'scheme', label: 'Ingress Scheme', type: 'select', options: ['internet-facing', 'internal-private'] },
        { key: 'algorithm', label: 'Distribution Algorithm', type: 'select', options: ['round-robin', 'least-connections', 'ip-hash'] },
      ],
    },
  },
  {
    kind: 'gateway',
    label: 'API Gateway / Ingress',
    icon: 'shield',
    category: 'network',
    description: 'API gateway, edge router, or reverse proxy managing authentication and throttling.',
    allowedParents: ['system', 'group', 'boundary', 'cloud-resource'],
    allowedConnectionKinds: ['sync', 'async', 'dependency'],
    metadataSchema: {
      gatewayType: 'Kong',
      authMethod: 'OAuth2 / JWT',
      rateLimitRps: 1000,
    },
    inspectorSection: {
      id: 'gateway-details',
      title: 'Gateway Policies',
      description: 'Authentication filters, rate limiting, and mTLS verification.',
      fields: [
        { key: 'gatewayType', label: 'Gateway Engine', type: 'text', placeholder: 'e.g. Kong, Envoy, Traefik, AWS API Gateway' },
        { key: 'authMethod', label: 'Edge Authentication', type: 'select', options: ['OAuth2 / JWT', 'API Keys', 'mTLS', 'OpenID Connect', 'None'] },
        { key: 'rateLimitRps', label: 'Rate Limit (req/sec)', type: 'number', placeholder: '1000' },
      ],
    },
  },
  {
    kind: 'group',
    label: 'Logical Group',
    icon: 'folder',
    category: 'grouping',
    description: 'Organizational boundary grouping related subsystems, containers, or layers.',
    allowedParents: ['group', 'boundary'],
    allowedConnectionKinds: ['dependency'],
    metadataSchema: {
      groupType: 'logical',
      collapsedByDefault: false,
    },
    inspectorSection: {
      id: 'group-details',
      title: 'Group Configuration',
      description: 'Logical grouping behavior and presentation style.',
      fields: [
        { key: 'groupType', label: 'Grouping Kind', type: 'select', options: ['logical', 'domain', 'team', 'network-zone'] },
        { key: 'color', label: 'Accent Border Color', type: 'text', placeholder: '#3b82f6' },
      ],
    },
  },
  {
    kind: 'boundary',
    label: 'System / Trust Boundary',
    icon: 'square',
    category: 'grouping',
    description: 'Security zone, compliance perimeter, VPC, or architectural trust boundary.',
    allowedParents: ['boundary', 'group'],
    allowedConnectionKinds: ['dependency'],
    metadataSchema: {
      boundaryType: 'trust-boundary',
      securityZone: 'private-subnet',
    },
    inspectorSection: {
      id: 'boundary-details',
      title: 'Boundary & Perimeter Security',
      description: 'Security zone definitions and compliance scope.',
      fields: [
        { key: 'boundaryType', label: 'Boundary Classification', type: 'select', options: ['trust-boundary', 'vpc', 'subnetwork', 'compliance-scope'] },
        { key: 'securityZone', label: 'Security Zone', type: 'select', options: ['dmz', 'public-ingress', 'private-subnet', 'isolated-data-store'] },
      ],
    },
  },
];

// Active registry map
const catalogRegistry = new Map<string, ObjectTypeDefinition>();

/**
 * Resets the catalog registry back to the 22 built-in object types.
 */
export function resetObjectTypeRegistry(): void {
  catalogRegistry.clear();
  for (const def of BUILTIN_OBJECT_TYPES) {
    catalogRegistry.set(def.kind, def);
  }
}

// Seed the registry on module load
resetObjectTypeRegistry();

/**
 * Registers an object type into the catalog (MODULES.md §1).
 * Can register novel custom kinds or override existing configurations without core changes.
 */
export function registerObjectType(definition: ObjectTypeDefinition): void {
  if (!definition || !definition.kind || typeof definition.kind !== 'string') {
    throw new Error('registerObjectType: invalid definition; "kind" string is required.');
  }
  catalogRegistry.set(definition.kind, definition);
}

/**
 * Retrieves a registered object type definition by its kind string.
 */
export function getObjectType(kind: string): ObjectTypeDefinition | undefined {
  if (!kind) return undefined;
  return catalogRegistry.get(kind);
}

/**
 * Checks if an object type kind is registered.
 */
export function hasObjectType(kind: string): boolean {
  if (!kind) return false;
  return catalogRegistry.has(kind);
}

/**
 * Unregisters a type from the catalog (primarily for dynamic plugins or testing).
 * Returns true if removed, false if not found.
 */
export function unregisterObjectType(kind: string): boolean {
  return catalogRegistry.delete(kind);
}

/**
 * Lists all registered object type definitions in the catalog.
 */
export function listObjectTypes(): ObjectTypeDefinition[] {
  return Array.from(catalogRegistry.values());
}

/**
 * Lists all registered object type kinds.
 */
export function listObjectTypeKinds(): string[] {
  return Array.from(catalogRegistry.keys());
}

/**
 * Returns all custom inspector sections for a given object kind.
 */
export function getInspectorSectionsForType(kind: string): InspectorSectionDefinition[] {
  const typeDef = catalogRegistry.get(kind);
  if (!typeDef || !typeDef.inspectorSection) {
    return [];
  }
  return [typeDef.inspectorSection];
}

/**
 * Checks whether an object of childKind can be nested under a parent of parentKind.
 * If parentKind is null or undefined, checks if the child can exist as a root-level node.
 */
export function isParentAllowedForKind(parentKind: string | null | undefined, childKind: string): boolean {
  const childDef = catalogRegistry.get(childKind);
  if (!childDef) {
    // If unknown custom type with no registry entry, allow by default
    return true;
  }

  // Root node: parent is null/undefined
  if (!parentKind) {
    // Top-level allowed unless restricted strictly to child-only
    return true;
  }

  if (!childDef.allowedParents || childDef.allowedParents.length === 0) {
    return true;
  }

  if (childDef.allowedParents.includes('*')) {
    return true;
  }

  return childDef.allowedParents.includes(parentKind);
}

/**
 * Validates a parent-child relationship against catalog definitions.
 */
export function validateParentChildRelationship(
  parentKind: string | null | undefined,
  childKind: string,
): { valid: boolean; reason?: string } {
  const allowed = isParentAllowedForKind(parentKind, childKind);
  if (!allowed) {
    return {
      valid: false,
      reason: `Object kind "${childKind}" cannot be placed inside parent kind "${parentKind}". Allowed parents: ${
        catalogRegistry.get(childKind)?.allowedParents?.join(', ') || 'none'
      }`,
    };
  }
  return { valid: true };
}

/**
 * Checks whether a connection kind is allowed on an object kind.
 */
export function isConnectionKindAllowedForObject(kind: string, connectionKind: string): boolean {
  const def = catalogRegistry.get(kind);
  if (!def || !def.allowedConnectionKinds || def.allowedConnectionKinds.length === 0) {
    return true;
  }
  if (def.allowedConnectionKinds.includes('*')) {
    return true;
  }
  return def.allowedConnectionKinds.includes(connectionKind);
}

/**
 * Validates whether a connection of connectionKind is permitted between source and target kinds.
 */
export function validateConnectionAllowed(
  sourceKind: string,
  targetKind: string,
  connectionKind: string,
): { valid: boolean; reason?: string } {
  if (!isConnectionKindAllowedForObject(sourceKind, connectionKind)) {
    return {
      valid: false,
      reason: `Source kind "${sourceKind}" does not allow connection kind "${connectionKind}".`,
    };
  }
  if (!isConnectionKindAllowedForObject(targetKind, connectionKind)) {
    return {
      valid: false,
      reason: `Target kind "${targetKind}" does not allow connection kind "${connectionKind}".`,
    };
  }
  return { valid: true };
}
