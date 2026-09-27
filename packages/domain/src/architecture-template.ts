/**
 * F135 — Architecture templates.
 *
 * Domain-layer template registry. A template is a pure data description of
 * objects and connections that can be instantiated into any architecture model.
 * Templates live in the domain (pure) layer — they never touch persistence or UI.
 *
 * Acceptance criteria:
 *  - Templates: SaaS, e-commerce, fintech, healthcare, microservices, monolith,
 *    serverless, event-driven, data-platform, Kubernetes, AWS, Azure, GCP.
 *  - Instantiate a template into a new architecture.
 *  - Test: instantiate a template → expected objects/connections created.
 */

import type {
  ArchitectureId,
  ConnectionId,
  ObjectId,
  VersionId,
} from './ids';
import type { ConnectionKind, ModelConnection, ModelObject, ObjectKind } from './types';

// ─── Template definition types ───────────────────────────────────────────────

/** All supported architecture template identifiers. */
export type TemplateId =
  | 'saas'
  | 'ecommerce'
  | 'fintech'
  | 'healthcare'
  | 'microservices'
  | 'monolith'
  | 'serverless'
  | 'event-driven'
  | 'data-platform'
  | 'kubernetes'
  | 'aws'
  | 'azure'
  | 'gcp';

/** A single object slot in a template (no IDs yet — IDs are assigned at instantiation). */
export interface TemplateObject {
  /** Stable slug used to reference this object in template connections. */
  readonly ref: string;
  readonly kind: ObjectKind;
  readonly name: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  /** Relative canvas position hint (layout engine may override). */
  readonly position?: { x: number; y: number };
}

/** A connection between two template objects, referenced by their ref slugs. */
export interface TemplateConnection {
  readonly sourceRef: string;
  readonly targetRef: string;
  readonly kind: ConnectionKind;
  readonly label?: string;
  readonly description?: string;
}

/** An architecture template definition. */
export interface ArchitectureTemplate {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly objects: TemplateObject[];
  readonly connections: TemplateConnection[];
}

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES: Record<TemplateId, ArchitectureTemplate> = {
  saas: {
    id: 'saas',
    name: 'SaaS',
    description: 'Multi-tenant SaaS platform with web front-end, API, database, and auth.',
    category: 'patterns',
    objects: [
      { ref: 'user',        kind: 'actor',       name: 'User',               description: 'End user of the SaaS product' },
      { ref: 'web',         kind: 'application',  name: 'Web App',            description: 'Single-page application' },
      { ref: 'api',         kind: 'application',  name: 'API Gateway',        description: 'REST / GraphQL API layer' },
      { ref: 'auth',        kind: 'application',  name: 'Auth Service',       description: 'Authentication and authorisation' },
      { ref: 'db',          kind: 'store',        name: 'Primary Database',   description: 'Tenant data store (PostgreSQL)' },
      { ref: 'cache',       kind: 'store',        name: 'Cache',              description: 'Redis session / query cache' },
      { ref: 'email',       kind: 'system',       name: 'Email Service',      description: 'Transactional email (SES / SendGrid)' },
      { ref: 'billing',     kind: 'system',       name: 'Billing Service',    description: 'Subscription management (Stripe)' },
      { ref: 'storage',     kind: 'store',        name: 'Object Storage',     description: 'File / asset storage (S3)' },
    ],
    connections: [
      { sourceRef: 'user',    targetRef: 'web',     kind: 'sync',         label: 'HTTPS' },
      { sourceRef: 'web',     targetRef: 'api',     kind: 'sync',         label: 'REST/GraphQL' },
      { sourceRef: 'api',     targetRef: 'auth',    kind: 'sync',         label: 'verify token' },
      { sourceRef: 'api',     targetRef: 'db',      kind: 'sync',         label: 'SQL' },
      { sourceRef: 'api',     targetRef: 'cache',   kind: 'sync',         label: 'read/write' },
      { sourceRef: 'api',     targetRef: 'email',   kind: 'async',        label: 'send email' },
      { sourceRef: 'api',     targetRef: 'billing', kind: 'sync',         label: 'billing API' },
      { sourceRef: 'api',     targetRef: 'storage', kind: 'sync',         label: 'upload/download' },
    ],
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store with product catalog, cart, checkout, and payments.',
    category: 'patterns',
    objects: [
      { ref: 'shopper',     kind: 'actor',       name: 'Shopper',            description: 'Online customer' },
      { ref: 'storefront',  kind: 'application',  name: 'Storefront',         description: 'Customer-facing web store' },
      { ref: 'catalog',     kind: 'application',  name: 'Product Catalog',    description: 'Product search and listings' },
      { ref: 'cart',        kind: 'application',  name: 'Cart Service',       description: 'Shopping cart management' },
      { ref: 'checkout',    kind: 'application',  name: 'Checkout Service',   description: 'Order placement and summary' },
      { ref: 'payment',     kind: 'system',       name: 'Payment Gateway',    description: 'Stripe / PayPal integration' },
      { ref: 'inventory',   kind: 'application',  name: 'Inventory Service',  description: 'Stock level management' },
      { ref: 'orderdb',     kind: 'store',        name: 'Order Database',     description: 'Persistent order records' },
      { ref: 'search',      kind: 'store',        name: 'Search Index',       description: 'ElasticSearch / Algolia' },
      { ref: 'cdn',         kind: 'system',       name: 'CDN',                description: 'Static asset delivery' },
    ],
    connections: [
      { sourceRef: 'shopper',    targetRef: 'storefront',  kind: 'sync',  label: 'browse' },
      { sourceRef: 'storefront', targetRef: 'catalog',     kind: 'sync',  label: 'fetch products' },
      { sourceRef: 'storefront', targetRef: 'cdn',         kind: 'sync',  label: 'assets' },
      { sourceRef: 'catalog',    targetRef: 'search',      kind: 'sync',  label: 'search query' },
      { sourceRef: 'storefront', targetRef: 'cart',        kind: 'sync',  label: 'add to cart' },
      { sourceRef: 'cart',       targetRef: 'checkout',    kind: 'sync',  label: 'place order' },
      { sourceRef: 'checkout',   targetRef: 'payment',     kind: 'sync',  label: 'charge' },
      { sourceRef: 'checkout',   targetRef: 'inventory',   kind: 'sync',  label: 'reserve stock' },
      { sourceRef: 'checkout',   targetRef: 'orderdb',     kind: 'sync',  label: 'persist order' },
    ],
  },

  fintech: {
    id: 'fintech',
    name: 'Fintech',
    description: 'Financial platform with ledger, payments, compliance, and fraud detection.',
    category: 'patterns',
    objects: [
      { ref: 'customer',    kind: 'actor',       name: 'Customer',           description: 'Account holder' },
      { ref: 'portal',      kind: 'application',  name: 'Customer Portal',    description: 'Web/mobile banking app' },
      { ref: 'api',         kind: 'application',  name: 'Core API',           description: 'Versioned financial API' },
      { ref: 'ledger',      kind: 'store',        name: 'Ledger',             description: 'Double-entry accounting store' },
      { ref: 'payments',    kind: 'application',  name: 'Payments Service',   description: 'ACH / SWIFT / instant payments' },
      { ref: 'fraud',       kind: 'application',  name: 'Fraud Detection',    description: 'Real-time anomaly scoring' },
      { ref: 'kyc',         kind: 'application',  name: 'KYC / AML',         description: 'Identity verification and compliance' },
      { ref: 'audit',       kind: 'store',        name: 'Audit Log',          description: 'Immutable event log (append-only)' },
      { ref: 'notify',      kind: 'application',  name: 'Notification Hub',   description: 'SMS / push / email alerts' },
    ],
    connections: [
      { sourceRef: 'customer',  targetRef: 'portal',   kind: 'sync',   label: 'HTTPS' },
      { sourceRef: 'portal',    targetRef: 'api',       kind: 'sync',   label: 'REST' },
      { sourceRef: 'api',       targetRef: 'ledger',   kind: 'sync',   label: 'debit/credit' },
      { sourceRef: 'api',       targetRef: 'payments', kind: 'sync',   label: 'initiate payment' },
      { sourceRef: 'api',       targetRef: 'fraud',    kind: 'sync',   label: 'score transaction' },
      { sourceRef: 'api',       targetRef: 'kyc',      kind: 'sync',   label: 'verify identity' },
      { sourceRef: 'api',       targetRef: 'audit',    kind: 'async',  label: 'append event' },
      { sourceRef: 'payments',  targetRef: 'notify',   kind: 'async',  label: 'payment alert' },
    ],
  },

  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'HIPAA-aware platform with EHR, patient portal, appointments, and labs.',
    category: 'patterns',
    objects: [
      { ref: 'patient',     kind: 'actor',       name: 'Patient',            description: 'Individual receiving care' },
      { ref: 'clinician',   kind: 'actor',       name: 'Clinician',          description: 'Doctor / nurse / care provider' },
      { ref: 'portal',      kind: 'application',  name: 'Patient Portal',     description: 'Web/mobile patient interface' },
      { ref: 'ehr',         kind: 'application',  name: 'EHR Service',        description: 'Electronic health record management' },
      { ref: 'appt',        kind: 'application',  name: 'Appointments',       description: 'Scheduling and calendar' },
      { ref: 'labs',        kind: 'application',  name: 'Lab Results',        description: 'Lab order and result management' },
      { ref: 'ehrdb',       kind: 'store',        name: 'EHR Database',       description: 'Clinical data store (encrypted, HIPAA)' },
      { ref: 'audit',       kind: 'store',        name: 'Audit Log',          description: 'Immutable access log for compliance' },
      { ref: 'notify',      kind: 'application',  name: 'Notification Hub',   description: 'Appointment reminders, alerts' },
    ],
    connections: [
      { sourceRef: 'patient',    targetRef: 'portal',  kind: 'sync',   label: 'view records' },
      { sourceRef: 'clinician',  targetRef: 'ehr',     kind: 'sync',   label: 'chart' },
      { sourceRef: 'portal',     targetRef: 'ehr',     kind: 'sync',   label: 'read summary' },
      { sourceRef: 'portal',     targetRef: 'appt',    kind: 'sync',   label: 'book appointment' },
      { sourceRef: 'ehr',        targetRef: 'ehrdb',   kind: 'sync',   label: 'persist clinical data' },
      { sourceRef: 'ehr',        targetRef: 'labs',    kind: 'sync',   label: 'order lab' },
      { sourceRef: 'ehr',        targetRef: 'audit',   kind: 'async',  label: 'access event' },
      { sourceRef: 'appt',       targetRef: 'notify',  kind: 'async',  label: 'send reminder' },
    ],
  },

  microservices: {
    id: 'microservices',
    name: 'Microservices',
    description: 'Service mesh with independent deployable services, message bus, and API gateway.',
    category: 'patterns',
    objects: [
      { ref: 'client',      kind: 'actor',       name: 'Client',             description: 'External consumer' },
      { ref: 'gateway',     kind: 'application',  name: 'API Gateway',        description: 'Edge routing, auth, rate limiting' },
      { ref: 'svcA',        kind: 'application',  name: 'Service A',          description: 'Domain service — e.g. Users' },
      { ref: 'svcB',        kind: 'application',  name: 'Service B',          description: 'Domain service — e.g. Orders' },
      { ref: 'svcC',        kind: 'application',  name: 'Service C',          description: 'Domain service — e.g. Notifications' },
      { ref: 'bus',         kind: 'system',       name: 'Message Bus',        description: 'Kafka / RabbitMQ async backbone' },
      { ref: 'dbA',         kind: 'store',        name: 'DB — Service A',     description: 'Service-owned datastore' },
      { ref: 'dbB',         kind: 'store',        name: 'DB — Service B',     description: 'Service-owned datastore' },
      { ref: 'registry',    kind: 'application',  name: 'Service Registry',   description: 'Service discovery (Consul / Eureka)' },
    ],
    connections: [
      { sourceRef: 'client',   targetRef: 'gateway',   kind: 'sync',         label: 'HTTPS' },
      { sourceRef: 'gateway',  targetRef: 'svcA',      kind: 'sync',         label: 'route' },
      { sourceRef: 'gateway',  targetRef: 'svcB',      kind: 'sync',         label: 'route' },
      { sourceRef: 'svcA',     targetRef: 'dbA',       kind: 'sync',         label: 'read/write' },
      { sourceRef: 'svcB',     targetRef: 'dbB',       kind: 'sync',         label: 'read/write' },
      { sourceRef: 'svcA',     targetRef: 'bus',       kind: 'async',        label: 'publish event' },
      { sourceRef: 'bus',      targetRef: 'svcC',      kind: 'async',        label: 'consume event' },
      { sourceRef: 'svcA',     targetRef: 'registry',  kind: 'dependency',   label: 'discover' },
      { sourceRef: 'svcB',     targetRef: 'registry',  kind: 'dependency',   label: 'discover' },
    ],
  },

  monolith: {
    id: 'monolith',
    name: 'Monolith',
    description: 'Single deployable web application with layered modules.',
    category: 'patterns',
    objects: [
      { ref: 'user',        kind: 'actor',       name: 'User',               description: 'Application user' },
      { ref: 'app',         kind: 'application',  name: 'Monolith App',       description: 'All modules in a single process' },
      { ref: 'web',         kind: 'component',    name: 'Web Layer',          description: 'Controllers, routes, views' },
      { ref: 'biz',         kind: 'component',    name: 'Business Logic',     description: 'Domain services and rules' },
      { ref: 'data',        kind: 'component',    name: 'Data Access Layer',  description: 'ORM / repository' },
      { ref: 'db',          kind: 'store',        name: 'Database',           description: 'Single relational DB' },
      { ref: 'cache',       kind: 'store',        name: 'Cache',              description: 'In-process or Redis cache' },
      { ref: 'ext',         kind: 'system',       name: 'External APIs',      description: 'Third-party integrations' },
    ],
    connections: [
      { sourceRef: 'user',  targetRef: 'app',    kind: 'sync',   label: 'HTTP' },
      { sourceRef: 'app',   targetRef: 'web',    kind: 'dependency' },
      { sourceRef: 'web',   targetRef: 'biz',    kind: 'dependency' },
      { sourceRef: 'biz',   targetRef: 'data',   kind: 'dependency' },
      { sourceRef: 'data',  targetRef: 'db',     kind: 'sync',   label: 'SQL' },
      { sourceRef: 'biz',   targetRef: 'cache',  kind: 'sync',   label: 'cache aside' },
      { sourceRef: 'biz',   targetRef: 'ext',    kind: 'sync',   label: 'HTTP/SDK' },
    ],
  },

  serverless: {
    id: 'serverless',
    name: 'Serverless',
    description: 'Event-driven functions with managed services and no persistent servers.',
    category: 'patterns',
    objects: [
      { ref: 'client',      kind: 'actor',       name: 'Client',             description: 'Browser / mobile / IoT device' },
      { ref: 'gateway',     kind: 'application',  name: 'API Gateway',        description: 'Managed HTTP gateway (AWS APIGW)' },
      { ref: 'fnAuth',      kind: 'application',  name: 'Auth Function',      description: 'Lambda — JWT validation' },
      { ref: 'fnMain',      kind: 'application',  name: 'Core Function',      description: 'Lambda — business logic' },
      { ref: 'fnAsync',     kind: 'application',  name: 'Async Function',     description: 'Lambda — event processor' },
      { ref: 'db',          kind: 'store',        name: 'Managed Database',   description: 'DynamoDB / Aurora Serverless' },
      { ref: 'queue',       kind: 'system',       name: 'Event Queue',        description: 'SQS / EventBridge' },
      { ref: 'storage',     kind: 'store',        name: 'Object Store',       description: 'S3 / Blob storage' },
      { ref: 'cdn',         kind: 'system',       name: 'CDN',                description: 'CloudFront / static assets' },
    ],
    connections: [
      { sourceRef: 'client',    targetRef: 'cdn',      kind: 'sync',  label: 'static assets' },
      { sourceRef: 'client',    targetRef: 'gateway',  kind: 'sync',  label: 'API call' },
      { sourceRef: 'gateway',   targetRef: 'fnAuth',   kind: 'sync',  label: 'authorise' },
      { sourceRef: 'gateway',   targetRef: 'fnMain',   kind: 'sync',  label: 'invoke' },
      { sourceRef: 'fnMain',    targetRef: 'db',       kind: 'sync',  label: 'read/write' },
      { sourceRef: 'fnMain',    targetRef: 'queue',    kind: 'async', label: 'enqueue' },
      { sourceRef: 'queue',     targetRef: 'fnAsync',  kind: 'async', label: 'trigger' },
      { sourceRef: 'fnAsync',   targetRef: 'storage',  kind: 'sync',  label: 'store artifact' },
    ],
  },

  'event-driven': {
    id: 'event-driven',
    name: 'Event-Driven',
    description: 'Producers/consumers connected through a durable event log with CQRS/ES.',
    category: 'patterns',
    objects: [
      { ref: 'producer',    kind: 'application',  name: 'Event Producer',     description: 'Emits domain events' },
      { ref: 'broker',      kind: 'system',       name: 'Event Broker',       description: 'Kafka / Pulsar topic router' },
      { ref: 'store',       kind: 'store',        name: 'Event Store',        description: 'Durable ordered log' },
      { ref: 'consumer1',   kind: 'application',  name: 'Consumer — Query',   description: 'Read-model projector (CQRS)' },
      { ref: 'consumer2',   kind: 'application',  name: 'Consumer — Worker',  description: 'Side-effect processor' },
      { ref: 'readdb',      kind: 'store',        name: 'Read Database',      description: 'Denormalised query store' },
      { ref: 'deadletter',  kind: 'store',        name: 'Dead-Letter Queue',  description: 'Failed message parking lot' },
      { ref: 'schema',      kind: 'system',       name: 'Schema Registry',    description: 'Avro / Protobuf schema management' },
    ],
    connections: [
      { sourceRef: 'producer',  targetRef: 'broker',      kind: 'async', label: 'publish event' },
      { sourceRef: 'broker',    targetRef: 'store',       kind: 'async', label: 'persist' },
      { sourceRef: 'broker',    targetRef: 'consumer1',   kind: 'async', label: 'fan-out' },
      { sourceRef: 'broker',    targetRef: 'consumer2',   kind: 'async', label: 'fan-out' },
      { sourceRef: 'consumer1', targetRef: 'readdb',      kind: 'sync',  label: 'project' },
      { sourceRef: 'broker',    targetRef: 'deadletter',  kind: 'async', label: 'on failure' },
      { sourceRef: 'producer',  targetRef: 'schema',      kind: 'dependency', label: 'validate schema' },
    ],
  },

  'data-platform': {
    id: 'data-platform',
    name: 'Data Platform',
    description: 'Lakehouse with ingestion, transformation, cataloging, and serving.',
    category: 'data',
    objects: [
      { ref: 'source',      kind: 'system',       name: 'Source Systems',     description: 'Operational DBs, SaaS APIs, IoT' },
      { ref: 'ingest',      kind: 'application',  name: 'Ingestion Layer',    description: 'Kafka / Firehose / batch loader' },
      { ref: 'lake',        kind: 'store',        name: 'Data Lake',          description: 'Raw zone — S3 / ADLS / GCS' },
      { ref: 'transform',   kind: 'application',  name: 'Transform Layer',    description: 'dbt / Spark / Flink' },
      { ref: 'warehouse',   kind: 'store',        name: 'Data Warehouse',     description: 'Curated zone — Snowflake / BigQuery / Redshift' },
      { ref: 'catalog',     kind: 'application',  name: 'Data Catalog',       description: 'Lineage, discovery (DataHub / Alation)' },
      { ref: 'bi',          kind: 'application',  name: 'BI & Reporting',     description: 'Looker / Tableau / Power BI' },
      { ref: 'mlplatform',  kind: 'application',  name: 'ML Platform',        description: 'Feature store + model training / serving' },
    ],
    connections: [
      { sourceRef: 'source',      targetRef: 'ingest',     kind: 'data',  label: 'stream / batch' },
      { sourceRef: 'ingest',      targetRef: 'lake',       kind: 'data',  label: 'land raw' },
      { sourceRef: 'lake',        targetRef: 'transform',  kind: 'data',  label: 'read' },
      { sourceRef: 'transform',   targetRef: 'warehouse',  kind: 'data',  label: 'write curated' },
      { sourceRef: 'warehouse',   targetRef: 'bi',         kind: 'data',  label: 'query' },
      { sourceRef: 'warehouse',   targetRef: 'mlplatform', kind: 'data',  label: 'features' },
      { sourceRef: 'catalog',     targetRef: 'lake',       kind: 'dependency', label: 'scan lineage' },
      { sourceRef: 'catalog',     targetRef: 'warehouse',  kind: 'dependency', label: 'scan lineage' },
    ],
  },

  kubernetes: {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Cloud-native workloads on K8s with ingress, services, and observability.',
    category: 'infrastructure',
    objects: [
      { ref: 'internet',    kind: 'actor',       name: 'Internet',           description: 'External traffic' },
      { ref: 'ingress',     kind: 'application',  name: 'Ingress Controller', description: 'Nginx / Traefik / ALB controller' },
      { ref: 'frontend',    kind: 'application',  name: 'Frontend Pod',       description: 'Next.js / React deployment' },
      { ref: 'backend',     kind: 'application',  name: 'Backend Pod',        description: 'API service deployment' },
      { ref: 'worker',      kind: 'application',  name: 'Worker Pod',         description: 'Background job deployment' },
      { ref: 'db',          kind: 'store',        name: 'StatefulSet DB',     description: 'PostgreSQL StatefulSet / RDS' },
      { ref: 'configmap',   kind: 'system',       name: 'ConfigMap / Secret', description: 'K8s configuration store' },
      { ref: 'prometheus',  kind: 'application',  name: 'Prometheus',         description: 'Metrics collection' },
      { ref: 'grafana',     kind: 'application',  name: 'Grafana',            description: 'Dashboards and alerting' },
    ],
    connections: [
      { sourceRef: 'internet',   targetRef: 'ingress',    kind: 'sync',         label: 'TLS' },
      { sourceRef: 'ingress',    targetRef: 'frontend',   kind: 'sync',         label: 'route /' },
      { sourceRef: 'ingress',    targetRef: 'backend',    kind: 'sync',         label: 'route /api' },
      { sourceRef: 'frontend',   targetRef: 'backend',    kind: 'sync',         label: 'API calls' },
      { sourceRef: 'backend',    targetRef: 'db',         kind: 'sync',         label: 'SQL' },
      { sourceRef: 'backend',    targetRef: 'worker',     kind: 'async',        label: 'enqueue job' },
      { sourceRef: 'backend',    targetRef: 'configmap',  kind: 'dependency',   label: 'env vars' },
      { sourceRef: 'prometheus', targetRef: 'backend',    kind: 'dependency',   label: 'scrape /metrics' },
      { sourceRef: 'grafana',    targetRef: 'prometheus', kind: 'sync',         label: 'query' },
    ],
  },

  aws: {
    id: 'aws',
    name: 'AWS',
    description: 'Reference architecture for a three-tier web application on AWS.',
    category: 'cloud',
    objects: [
      { ref: 'user',        kind: 'actor',       name: 'User',               description: 'End user' },
      { ref: 'cloudfront',  kind: 'system',       name: 'CloudFront',         description: 'CDN + WAF edge' },
      { ref: 'alb',         kind: 'application',  name: 'ALB',                description: 'Application Load Balancer' },
      { ref: 'ec2',         kind: 'application',  name: 'EC2 / ECS',          description: 'Application tier' },
      { ref: 'lambda',      kind: 'application',  name: 'Lambda',             description: 'Serverless functions' },
      { ref: 'rds',         kind: 'store',        name: 'RDS (Aurora)',        description: 'Managed relational database' },
      { ref: 'elasticache', kind: 'store',        name: 'ElastiCache',        description: 'Redis / Memcached cache' },
      { ref: 's3',          kind: 'store',        name: 'S3',                 description: 'Object storage' },
      { ref: 'sqs',         kind: 'system',       name: 'SQS / SNS',          description: 'Async messaging' },
      { ref: 'iam',         kind: 'system',       name: 'IAM',                description: 'Identity and access management' },
    ],
    connections: [
      { sourceRef: 'user',        targetRef: 'cloudfront',  kind: 'sync',  label: 'HTTPS' },
      { sourceRef: 'cloudfront',  targetRef: 'alb',         kind: 'sync',  label: 'origin request' },
      { sourceRef: 'cloudfront',  targetRef: 's3',          kind: 'sync',  label: 'static assets' },
      { sourceRef: 'alb',         targetRef: 'ec2',         kind: 'sync',  label: 'route' },
      { sourceRef: 'ec2',         targetRef: 'rds',         kind: 'sync',  label: 'SQL' },
      { sourceRef: 'ec2',         targetRef: 'elasticache', kind: 'sync',  label: 'cache' },
      { sourceRef: 'ec2',         targetRef: 'sqs',         kind: 'async', label: 'publish' },
      { sourceRef: 'sqs',         targetRef: 'lambda',      kind: 'async', label: 'trigger' },
      { sourceRef: 'lambda',      targetRef: 's3',          kind: 'sync',  label: 'put object' },
    ],
  },

  azure: {
    id: 'azure',
    name: 'Azure',
    description: 'Reference architecture for a web application on Microsoft Azure.',
    category: 'cloud',
    objects: [
      { ref: 'user',        kind: 'actor',       name: 'User',               description: 'End user' },
      { ref: 'frontdoor',   kind: 'system',       name: 'Azure Front Door',   description: 'Global CDN + WAF' },
      { ref: 'apim',        kind: 'application',  name: 'API Management',     description: 'Managed API gateway' },
      { ref: 'appservice',  kind: 'application',  name: 'App Service',        description: 'Managed web app hosting' },
      { ref: 'functions',   kind: 'application',  name: 'Azure Functions',    description: 'Serverless compute' },
      { ref: 'sqldb',       kind: 'store',        name: 'Azure SQL',          description: 'Managed SQL database' },
      { ref: 'cosmos',      kind: 'store',        name: 'Cosmos DB',          description: 'Multi-model globally distributed DB' },
      { ref: 'servicebus',  kind: 'system',       name: 'Service Bus',        description: 'Enterprise messaging' },
      { ref: 'blob',        kind: 'store',        name: 'Blob Storage',       description: 'Object storage' },
      { ref: 'aad',         kind: 'system',       name: 'Azure AD / Entra',   description: 'Identity and access' },
    ],
    connections: [
      { sourceRef: 'user',        targetRef: 'frontdoor',   kind: 'sync',  label: 'HTTPS' },
      { sourceRef: 'frontdoor',   targetRef: 'apim',        kind: 'sync',  label: 'API request' },
      { sourceRef: 'apim',        targetRef: 'appservice',  kind: 'sync',  label: 'route' },
      { sourceRef: 'appservice',  targetRef: 'sqldb',       kind: 'sync',  label: 'query' },
      { sourceRef: 'appservice',  targetRef: 'cosmos',      kind: 'sync',  label: 'document store' },
      { sourceRef: 'appservice',  targetRef: 'servicebus',  kind: 'async', label: 'publish' },
      { sourceRef: 'servicebus',  targetRef: 'functions',   kind: 'async', label: 'trigger' },
      { sourceRef: 'functions',   targetRef: 'blob',        kind: 'sync',  label: 'store' },
      { sourceRef: 'apim',        targetRef: 'aad',         kind: 'sync',  label: 'validate token' },
    ],
  },

  gcp: {
    id: 'gcp',
    name: 'GCP',
    description: 'Reference architecture for a web application on Google Cloud Platform.',
    category: 'cloud',
    objects: [
      { ref: 'user',        kind: 'actor',       name: 'User',               description: 'End user' },
      { ref: 'lb',          kind: 'system',       name: 'Cloud Load Balancing', description: 'Global HTTPS LB + CDN' },
      { ref: 'gke',         kind: 'application',  name: 'GKE Cluster',        description: 'Google Kubernetes Engine' },
      { ref: 'run',         kind: 'application',  name: 'Cloud Run',          description: 'Serverless containers' },
      { ref: 'sql',         kind: 'store',        name: 'Cloud SQL',          description: 'Managed PostgreSQL / MySQL' },
      { ref: 'firestore',   kind: 'store',        name: 'Firestore',          description: 'Managed document database' },
      { ref: 'pubsub',      kind: 'system',       name: 'Pub/Sub',            description: 'Async messaging service' },
      { ref: 'gcs',         kind: 'store',        name: 'Cloud Storage (GCS)', description: 'Object storage' },
      { ref: 'bq',          kind: 'store',        name: 'BigQuery',           description: 'Serverless data warehouse' },
      { ref: 'iam',         kind: 'system',       name: 'IAM / Workload Identity', description: 'Identity and access management' },
    ],
    connections: [
      { sourceRef: 'user',   targetRef: 'lb',        kind: 'sync',  label: 'HTTPS' },
      { sourceRef: 'lb',     targetRef: 'gke',       kind: 'sync',  label: 'route' },
      { sourceRef: 'lb',     targetRef: 'run',       kind: 'sync',  label: 'route' },
      { sourceRef: 'gke',    targetRef: 'sql',       kind: 'sync',  label: 'SQL' },
      { sourceRef: 'gke',    targetRef: 'firestore', kind: 'sync',  label: 'document ops' },
      { sourceRef: 'gke',    targetRef: 'pubsub',    kind: 'async', label: 'publish' },
      { sourceRef: 'pubsub', targetRef: 'run',       kind: 'async', label: 'trigger' },
      { sourceRef: 'run',    targetRef: 'gcs',       kind: 'sync',  label: 'store object' },
      { sourceRef: 'gke',    targetRef: 'bq',        kind: 'data',  label: 'stream analytics' },
      { sourceRef: 'gke',    targetRef: 'iam',       kind: 'dependency', label: 'workload identity' },
    ],
  },
};

// ─── Registry API ─────────────────────────────────────────────────────────────

/** Returns all registered architecture templates. */
export function listTemplates(): ArchitectureTemplate[] {
  return Object.values(TEMPLATES);
}

/** Returns a single template by ID, or undefined if not found. */
export function getTemplate(id: TemplateId): ArchitectureTemplate | undefined {
  return TEMPLATES[id];
}

/** Returns templates filtered by category (e.g. 'patterns', 'cloud', 'infrastructure'). */
export function getTemplatesByCategory(category: string): ArchitectureTemplate[] {
  return listTemplates().filter((t) => t.category === category);
}

// ─── Instantiation ────────────────────────────────────────────────────────────

export interface InstantiateTemplateParams {
  templateId: TemplateId;
  architectureId: ArchitectureId;
  versionId: VersionId;
  /** Factory for object IDs — supply createId('sys') etc. or a stub in tests. */
  createObjectId: () => ObjectId;
  /** Factory for connection IDs — supply createId('con') etc. or a stub in tests. */
  createConnectionId: () => ConnectionId;
  /** Optional override for createdAt / updatedAt (defaults to now). */
  now?: Date;
}

export interface InstantiateTemplateResult {
  objects: ModelObject[];
  connections: ModelConnection[];
}

/**
 * Instantiates an architecture template into concrete ModelObjects and
 * ModelConnections bound to the given architectureId + versionId.
 *
 * Returns the raw objects/connections — callers are responsible for persisting
 * them via addModelObject / addModelConnection or the API layer.
 *
 * Throws if the templateId is unknown.
 */
export function instantiateTemplate(
  params: InstantiateTemplateParams,
): InstantiateTemplateResult {
  const { templateId, architectureId, versionId, createObjectId, createConnectionId } = params;
  const now = params.now ?? new Date();
  const template = TEMPLATES[templateId];

  if (!template) {
    throw new Error(`Unknown architecture template: '${templateId}'`);
  }

  // Build a ref → ObjectId map so connections can be wired up.
  const refToId = new Map<string, ObjectId>();

  const objects: ModelObject[] = template.objects.map((tObj) => {
    const id = createObjectId();
    refToId.set(tObj.ref, id);
    return {
      id,
      architectureId,
      versionId,
      kind: tObj.kind,
      name: tObj.name,
      description: tObj.description ?? null,
      metadata: tObj.metadata ?? {},
      position: tObj.position ?? null,
      createdAt: now,
      updatedAt: now,
    };
  });

  const connections: ModelConnection[] = template.connections.map((tConn) => {
    const sourceObjectId = refToId.get(tConn.sourceRef);
    const targetObjectId = refToId.get(tConn.targetRef);

    if (!sourceObjectId) {
      throw new Error(
        `Template '${templateId}': connection sourceRef '${tConn.sourceRef}' not found in objects`,
      );
    }
    if (!targetObjectId) {
      throw new Error(
        `Template '${templateId}': connection targetRef '${tConn.targetRef}' not found in objects`,
      );
    }

    return {
      id: createConnectionId(),
      architectureId,
      versionId,
      sourceObjectId,
      targetObjectId,
      kind: tConn.kind,
      label: tConn.label ?? null,
      description: tConn.description ?? null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
  });

  return { objects, connections };
}
