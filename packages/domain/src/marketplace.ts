import {
  createId,
  type InstallationId,
  type MarketplaceItemId,
  type WorkspaceId,
} from './ids';

// ============================================================================
// 1. Types & Models
// ============================================================================

export type MarketplaceItemType =
  | 'template'
  | 'integration_plugin'
  | 'technology_catalog'
  | 'ai_agent'
  | 'rule'
  | 'compliance_pack';

export type PublisherTier = 'official' | 'partner' | 'community';

export interface MarketplacePublisher {
  readonly id: string;
  readonly name: string;
  readonly verified: boolean;
  readonly tier: PublisherTier;
  readonly website?: string;
}

export type MarketplaceAssetKind =
  | 'model_object'
  | 'diagram_view'
  | 'architecture_rule'
  | 'ai_agent_spec'
  | 'technology_entry'
  | 'compliance_framework';

export interface MarketplaceAsset {
  readonly id: string;
  readonly kind: MarketplaceAssetKind;
  readonly name: string;
  readonly description: string;
  readonly payload: Record<string, unknown>;
}

export interface MarketplaceItem {
  readonly id: MarketplaceItemId;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly fullDescription: string;
  readonly type: MarketplaceItemType;
  readonly category: string;
  readonly version: string;
  readonly publisher: MarketplacePublisher;
  readonly rating: number; // 0.0 - 5.0
  readonly reviewsCount: number;
  readonly downloadCount: number;
  readonly tags: readonly string[];
  readonly minDhqVersion: string;
  readonly assets: readonly MarketplaceAsset[];
  readonly featured?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InstallationRecord {
  readonly id: InstallationId;
  readonly workspaceId: WorkspaceId;
  readonly itemId: MarketplaceItemId;
  readonly itemSlug: string;
  readonly itemName: string;
  readonly itemType: MarketplaceItemType;
  readonly installedVersion: string;
  readonly installedAssetIds: readonly string[];
  readonly status: 'active' | 'disabled';
  readonly installedAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// 2. Built-in Marketplace Catalog
// ============================================================================

export const BUILTIN_MARKETPLACE_CATALOG: readonly MarketplaceItem[] = [
  // 1. TEMPLATES
  {
    id: 'mkt_tmpl_pci_fintech' as MarketplaceItemId,
    slug: 'pci-payment-gateway-blueprint',
    name: 'PCI DSS v4.0 Payment Gateway Blueprint',
    shortDescription: 'Production-ready tokenized payment architecture with HSM cryptographic isolation.',
    fullDescription: 'Comprehensive C4 model template implementing Level 1 PCI DSS compliance with cardholder data environment (CDE) segmentation, tokenization vaults, and double-envelope KMS encryption.',
    type: 'template',
    category: 'Fintech & Security',
    version: '2.1.0',
    publisher: {
      id: 'pub_diagramhq',
      name: 'DiagramHQ Official',
      verified: true,
      tier: 'official',
      website: 'https://diagramhq.com',
    },
    rating: 4.9,
    reviewsCount: 148,
    downloadCount: 3820,
    tags: ['pci-dss', 'fintech', 'tokenization', 'cde-isolation', 'hsm'],
    minDhqVersion: '1.0.0',
    featured: true,
    assets: [
      {
        id: 'ast_obj_cde_vault',
        kind: 'model_object',
        name: 'PAN Tokenization & HSM Vault',
        description: 'FIPS 140-3 Level 4 hardware security module backed data vault.',
        payload: { kind: 'store', boundary: 'isolated_cde_enclave', encryption: 'AES-256-GCM' },
      },
      {
        id: 'ast_obj_payment_gateway',
        kind: 'model_object',
        name: 'Public Inbound Payment Gateway',
        description: 'Zero-trust TLS 1.3 reverse proxy terminating customer checkouts.',
        payload: { kind: 'application', protocol: 'mTLS' },
      },
      {
        id: 'ast_view_pci_overview',
        kind: 'diagram_view',
        name: 'PCI Boundary & Cardholder Flow',
        description: 'Container level view depicting end-to-end tokenization.',
        payload: { level: 'container', focusObject: 'ast_obj_cde_vault' },
      },
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
  {
    id: 'mkt_tmpl_event_mesh' as MarketplaceItemId,
    slug: 'multi-region-event-driven-mesh',
    name: 'Multi-Region Event-Driven Mesh Architecture',
    shortDescription: 'Active-Active Kafka & Pulsar event mesh with outbox replication.',
    fullDescription: 'Production architecture blueprint for globally distributed active-active event-driven architectures with idempotent consumer guarantees and schema registry synchronization.',
    type: 'template',
    category: 'Distributed Systems',
    version: '1.4.0',
    publisher: {
      id: 'pub_confluent_partner',
      name: 'StreamMesh Labs',
      verified: true,
      tier: 'partner',
    },
    rating: 4.8,
    reviewsCount: 92,
    downloadCount: 2450,
    tags: ['kafka', 'event-driven', 'active-active', 'outbox-pattern', 'cqrs'],
    minDhqVersion: '1.0.0',
    assets: [
      {
        id: 'ast_obj_kafka_cluster',
        kind: 'model_object',
        name: 'Geo-Replicated Kafka Event Mesh',
        description: 'Multi-cluster Kafka broker ring with MirrorMaker 2 synchronization.',
        payload: { kind: 'store', protocol: 'Kafka Wire Protocol' },
      },
      {
        id: 'ast_view_event_mesh',
        kind: 'diagram_view',
        name: 'Global Event Topology & Outbox Flows',
        description: 'Visual flow of asynchronous ledger mutations.',
        payload: { level: 'context' },
      },
    ],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },

  // 2. INTEGRATION PLUGINS
  {
    id: 'mkt_int_datadog' as MarketplaceItemId,
    slug: 'datadog-live-telemetry-overlay',
    name: 'Datadog Live Telemetry & Health Overlay',
    shortDescription: 'Real-time p99 latency, error rates, and APM spans rendered on C4 components.',
    fullDescription: 'Connects Datadog APM and Synthetic Monitoring metrics directly to DiagramHQ canvas components for live operational visibility and instant incident debugging.',
    type: 'integration_plugin',
    category: 'Observability & Monitoring',
    version: '3.0.2',
    publisher: {
      id: 'pub_datadog',
      name: 'Datadog Ecosystem',
      verified: true,
      tier: 'partner',
      website: 'https://datadoghq.com',
    },
    rating: 4.9,
    reviewsCount: 310,
    downloadCount: 8900,
    tags: ['datadog', 'apm', 'telemetry', 'incident-response', 'slo'],
    minDhqVersion: '1.0.0',
    featured: true,
    assets: [
      {
        id: 'ast_plugin_datadog_adapter',
        kind: 'technology_entry',
        name: 'Datadog APM Live Overlay Provider',
        description: 'Bi-directional telemetry adapter polling service health metrics.',
        payload: { syncIntervalSeconds: 30, metrics: ['p99_latency', 'error_rate', 'throughput'] },
      },
    ],
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },

  // 3. TECHNOLOGY CATALOGS
  {
    id: 'mkt_cat_cncf_2026' as MarketplaceItemId,
    slug: 'cncf-cloud-native-2026-catalog',
    name: 'CNCF Cloud Native 2026 Technology Catalog',
    shortDescription: 'Over 200 curated and verified CNCF graduated and incubating projects.',
    fullDescription: 'Comprehensive technology catalog populated with official icons, category tags, and maturity levels for Kubernetes, Envoy, Prometheus, ArgoCD, OpenTelemetry, and more.',
    type: 'technology_catalog',
    category: 'Infrastructure & DevOps',
    version: '2026.1.0',
    publisher: {
      id: 'pub_diagramhq',
      name: 'DiagramHQ Official',
      verified: true,
      tier: 'official',
    },
    rating: 5.0,
    reviewsCount: 420,
    downloadCount: 11200,
    tags: ['cncf', 'kubernetes', 'opentelemetry', 'cloud-native', 'envoy'],
    minDhqVersion: '1.0.0',
    featured: true,
    assets: [
      {
        id: 'ast_tech_k8s',
        kind: 'technology_entry',
        name: 'Kubernetes v1.32',
        description: 'Automated container orchestration and workload scheduling.',
        payload: { category: 'orchestration', maturity: 'graduated' },
      },
      {
        id: 'ast_tech_otel',
        kind: 'technology_entry',
        name: 'OpenTelemetry 2.0',
        description: 'Standardized metrics, traces, and logging telemetry collection.',
        payload: { category: 'observability', maturity: 'graduated' },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z',
  },

  // 4. AI AGENTS
  {
    id: 'mkt_agent_cost_guard' as MarketplaceItemId,
    slug: 'autonomous-finops-cost-guard-agent',
    name: 'Autonomous FinOps Cost Guard Agent',
    shortDescription: 'AI agent that continuously audits architecture topologies for cloud cost waste.',
    fullDescription: 'Autonomous AI agent powered by specialized finops heuristics that flags over-provisioned datastores, cross-AZ traffic penalties, idle NAT gateways, and un-tiered object storage.',
    type: 'ai_agent',
    category: 'AI & Automation',
    version: '1.8.0',
    publisher: {
      id: 'pub_diagramhq',
      name: 'DiagramHQ Official',
      verified: true,
      tier: 'official',
    },
    rating: 4.8,
    reviewsCount: 184,
    downloadCount: 4120,
    tags: ['finops', 'ai-agent', 'cost-optimization', 'aws', 'gcp'],
    minDhqVersion: '1.0.0',
    assets: [
      {
        id: 'ast_agent_cost_spec',
        kind: 'ai_agent_spec',
        name: 'FinOps Optimization Agent Spec',
        description: 'Specialized LLM agent prompt directives and tool configurations.',
        payload: { model: 'gemini-1.5-pro', tools: ['cloud_cost_calc', 'az_traffic_scan'] },
      },
    ],
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-03-30T00:00:00.000Z',
  },

  // 5. RULES (ARCHITECTURE GUARDRAILS)
  {
    id: 'mkt_rule_zero_trust' as MarketplaceItemId,
    slug: 'zero-trust-network-guardrails',
    name: 'Zero-Trust Architecture Linter & Guardrails',
    shortDescription: '12 automated architectural rules enforcing mTLS and zero unencrypted datastores.',
    fullDescription: 'Static architecture rule pack that detects unencrypted ingress routes, missing API gateways, public datastores, and unauthenticated internal service connections.',
    type: 'rule',
    category: 'Governance & Rules',
    version: '2.0.0',
    publisher: {
      id: 'pub_sec_council',
      name: 'CyberSec Architecture Guild',
      verified: true,
      tier: 'community',
    },
    rating: 4.7,
    reviewsCount: 76,
    downloadCount: 3100,
    tags: ['zero-trust', 'rules', 'linter', 'security', 'mtls'],
    minDhqVersion: '1.0.0',
    assets: [
      {
        id: 'ast_rule_mtls_mandate',
        kind: 'architecture_rule',
        name: 'Mandatory Service-to-Service mTLS',
        description: 'Flags any synchronous connection lacking mutual TLS encryption.',
        payload: { severity: 'error', selector: "connection[protocol != 'mTLS']" },
      },
      {
        id: 'ast_rule_no_public_db',
        kind: 'architecture_rule',
        name: 'Disallow Public Database Ingress',
        description: 'Blocks direct external caller access to relational or document databases.',
        payload: { severity: 'critical', selector: "edge[source.isExternal && target.isDatabase]" },
      },
    ],
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z',
  },

  // 6. COMPLIANCE PACKS
  {
    id: 'mkt_cpl_fedramp' as MarketplaceItemId,
    slug: 'fedramp-moderate-compliance-pack',
    name: 'FedRAMP Moderate Ready Compliance Pack',
    shortDescription: '325 controls mapped to NIST SP 800-53 Rev. 5 baseline for federal cloud workloads.',
    fullDescription: 'Official FedRAMP Moderate mapping pack providing pre-configured control definitions, architecture evidence templates, and continuous boundary verification.',
    type: 'compliance_pack',
    category: 'Compliance & Governance',
    version: '3.1.0',
    publisher: {
      id: 'pub_diagramhq',
      name: 'DiagramHQ Official',
      verified: true,
      tier: 'official',
    },
    rating: 4.9,
    reviewsCount: 88,
    downloadCount: 1950,
    tags: ['fedramp', 'nist-800-53', 'govcloud', 'compliance', 'federal'],
    minDhqVersion: '1.0.0',
    featured: true,
    assets: [
      {
        id: 'ast_cpl_fedramp_matrix',
        kind: 'compliance_framework',
        name: 'FedRAMP Moderate Control Matrix',
        description: 'Pre-mapped control catalog with evidentiary artifact anchors.',
        payload: { baseline: 'Moderate', controlCount: 325 },
      },
    ],
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
  },
];

// ============================================================================
// 3. Marketplace Query & Installation Operations
// ============================================================================

export interface MarketplaceFilterOptions {
  readonly type?: MarketplaceItemType;
  readonly query?: string;
  readonly category?: string;
  readonly tag?: string;
  readonly verifiedOnly?: boolean;
}

/**
 * Searches and filters the marketplace catalog.
 */
export function queryMarketplaceCatalog(
  options: MarketplaceFilterOptions = {},
  catalog: readonly MarketplaceItem[] = BUILTIN_MARKETPLACE_CATALOG,
): MarketplaceItem[] {
  return catalog.filter((item) => {
    if (options.type && item.type !== options.type) {
      return false;
    }
    if (options.verifiedOnly && !item.publisher.verified) {
      return false;
    }
    if (options.category && item.category.toLowerCase() !== options.category.toLowerCase()) {
      return false;
    }
    if (options.tag && !item.tags.includes(options.tag.toLowerCase())) {
      return false;
    }
    if (options.query) {
      const q = options.query.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.shortDescription.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchPublisher = item.publisher.name.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchTags && !matchPublisher) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Finds a marketplace item by slug.
 */
export function getMarketplaceItemBySlug(
  slug: string,
  catalog: readonly MarketplaceItem[] = BUILTIN_MARKETPLACE_CATALOG,
): MarketplaceItem | undefined {
  return catalog.find((item) => item.slug === slug || item.id === slug);
}

export interface InstallResult {
  readonly record: InstallationRecord;
  readonly installedAssets: readonly MarketplaceAsset[];
  readonly alreadyInstalled: boolean;
}

/**
 * Installs a marketplace extension pack into a workspace.
 * Acceptance criteria: "install a template pack; assets appear."
 */
export function installMarketplaceItem(
  workspaceId: WorkspaceId,
  item: MarketplaceItem,
  existingInstallations: readonly InstallationRecord[] = [],
): InstallResult {
  const existing = existingInstallations.find(
    (ins) => ins.workspaceId === workspaceId && ins.itemId === item.id,
  );

  const now = new Date().toISOString();

  if (existing) {
    return {
      record: existing,
      installedAssets: item.assets,
      alreadyInstalled: true,
    };
  }

  const record: InstallationRecord = {
    id: createId('ins'),
    workspaceId,
    itemId: item.id,
    itemSlug: item.slug,
    itemName: item.name,
    itemType: item.type,
    installedVersion: item.version,
    installedAssetIds: item.assets.map((a) => a.id),
    status: 'active',
    installedAt: now,
    updatedAt: now,
  };

  return {
    record,
    installedAssets: item.assets,
    alreadyInstalled: false,
  };
}

/**
 * Uninstalls a marketplace item from a workspace.
 */
export function uninstallMarketplaceItem(
  installationId: InstallationId,
  currentInstallations: readonly InstallationRecord[],
): InstallationRecord[] {
  return currentInstallations.filter((ins) => ins.id !== installationId);
}

/**
 * Upgrades an installed marketplace item to a newer version.
 */
export function upgradeMarketplaceItem(
  currentRecord: InstallationRecord,
  newItem: MarketplaceItem,
): InstallationRecord {
  const now = new Date().toISOString();
  return {
    ...currentRecord,
    installedVersion: newItem.version,
    installedAssetIds: newItem.assets.map((a) => a.id),
    updatedAt: now,
  };
}
