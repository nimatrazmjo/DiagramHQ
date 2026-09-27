import { PrismaClient, VersionKind, VersionStatus, ObjectKind, ConnectionKind, ViewKind, MemberRole, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mirrors AuthService.validateCredentials: there is no users table yet, so a
 * user's id is derived from their email. Members must use the same id or the
 * seeded orgs are invisible after login.
 */
export function userIdFor(email: string): string {
  return `usr_${Buffer.from(email.toLowerCase().trim()).toString('hex').slice(0, 12)}`;
}

export const SEED_USERS = {
  admin: { email: 'admin@diagramhq.com', password: 'adminpassword' },
  lead: { email: 'lead@diagramhq.com', password: 'leadpassword' },
  architect: { email: 'architect@diagramhq.com', password: 'strongpassword' },
  developer: { email: 'developer@diagramhq.com', password: 'password123' },
} as const;

const SEED_ORG_IDS = ['org_acme', 'org_globex'];

const TECHNOLOGIES = [
  { id: 'tech_nextjs', name: 'Next.js', category: 'frontend', version: '14', vendor: 'Vercel', lifecycle: 'adopt', securityStatus: 'ok', owner: 'web-team', docs: 'https://nextjs.org/docs' },
  { id: 'tech_react_native', name: 'React Native', category: 'mobile', version: '0.74', vendor: 'Meta', lifecycle: 'trial', securityStatus: 'ok', owner: 'mobile-team', docs: 'https://reactnative.dev' },
  { id: 'tech_nestjs', name: 'NestJS', category: 'backend', version: '10', vendor: 'NestJS', lifecycle: 'adopt', securityStatus: 'ok', owner: 'platform-team', docs: 'https://docs.nestjs.com' },
  { id: 'tech_go', name: 'Go', category: 'backend', version: '1.22', vendor: 'Google', lifecycle: 'adopt', securityStatus: 'ok', owner: 'payments-team', docs: 'https://go.dev/doc' },
  { id: 'tech_postgres', name: 'PostgreSQL', category: 'database', version: '16', vendor: 'PostgreSQL', lifecycle: 'adopt', securityStatus: 'ok', owner: 'platform-team', docs: 'https://www.postgresql.org/docs' },
  { id: 'tech_redis', name: 'Redis', category: 'cache', version: '7', vendor: 'Redis', lifecycle: 'adopt', securityStatus: 'ok', owner: 'platform-team', docs: 'https://redis.io/docs' },
  { id: 'tech_kafka', name: 'Kafka', category: 'messaging', version: '3.7', vendor: 'Apache', lifecycle: 'adopt', securityStatus: 'ok', owner: 'platform-team', docs: 'https://kafka.apache.org/documentation' },
  { id: 'tech_elasticsearch', name: 'Elasticsearch', category: 'search', version: '7.10', vendor: 'Elastic', lifecycle: 'hold', securityStatus: 'vulnerable', owner: 'catalog-team', docs: 'https://www.elastic.co/guide' },
];

type ObjSeed = {
  id: string;
  kind: ObjectKind;
  name: string;
  description?: string;
  parentId?: string;
  metadata?: Prisma.InputJsonValue;
  position: { x: number; y: number };
  tech?: string[];
  tags?: string[];
};

async function seedArchitecture(opts: {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  objects: ObjSeed[];
  connections: Array<{ id: string; source: string; target: string; kind: ConnectionKind; label?: string; description?: string; metadata?: Prisma.InputJsonValue }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  views?: Array<{ id: string; name: string; kind: ViewKind; level?: number; isStarred?: boolean; filter?: Prisma.InputJsonValue; objects: string[] }>;
  decisions?: Array<{ id: string; number: number; title: string; status: string; context: string; decision: string; consequences: string; objects: string[] }>;
}): Promise<void> {
  const verId = `ver_${opts.id.replace(/^arch_/, '')}_main`;
  await prisma.architecture.create({
    data: { id: opts.id, workspaceId: opts.workspaceId, name: opts.name, description: opts.description },
  });
  await prisma.version.create({
    data: { id: verId, architectureId: opts.id, name: 'main', kind: VersionKind.main, status: VersionStatus.open },
  });
  await prisma.architecture.update({ where: { id: opts.id }, data: { defaultVersionId: verId } });

  for (const t of opts.tags ?? []) {
    await prisma.tag.create({ data: { ...t, architectureId: opts.id } });
  }

  // Parents first so parentId references resolve.
  for (const o of opts.objects) {
    await prisma.modelObject.create({
      data: {
        id: o.id,
        architectureId: opts.id,
        versionId: verId,
        parentId: o.parentId,
        kind: o.kind,
        name: o.name,
        description: o.description,
        metadata: o.metadata,
        position: o.position,
      },
    });
    if (o.tech?.length) {
      await prisma.objectTechnology.createMany({ data: o.tech.map((technologyId) => ({ objectId: o.id, technologyId })) });
    }
    if (o.tags?.length) {
      await prisma.objectTag.createMany({ data: o.tags.map((tagId) => ({ objectId: o.id, tagId })) });
    }
  }

  for (const c of opts.connections) {
    await prisma.modelConnection.create({
      data: {
        id: c.id,
        architectureId: opts.id,
        versionId: verId,
        sourceObjectId: c.source,
        targetObjectId: c.target,
        kind: c.kind,
        label: c.label,
        description: c.description,
        metadata: c.metadata,
      },
    });
  }

  const positions = new Map(opts.objects.map((o) => [o.id, o.position]));
  for (const v of opts.views ?? []) {
    await prisma.view.create({
      data: { id: v.id, architectureId: opts.id, name: v.name, kind: v.kind, level: v.level ?? 1, isStarred: v.isStarred ?? false, filter: v.filter },
    });
    await prisma.viewObject.createMany({
      data: v.objects.map((objectId) => ({ viewId: v.id, objectId, position: positions.get(objectId) })),
    });
  }

  for (const d of opts.decisions ?? []) {
    const { objects, ...rest } = d;
    await prisma.decision.create({ data: { ...rest, architectureId: opts.id } });
    await prisma.decisionObject.createMany({ data: objects.map((objectId) => ({ decisionId: d.id, objectId })) });
  }
}

export async function seed(): Promise<void> {
  console.log('Seeding DiagramHQ database...');

  // Only remove what this script owns; cascades clear workspaces → architectures → model/views.
  await prisma.organization.deleteMany({ where: { id: { in: SEED_ORG_IDS } } });
  // Legacy seed ids from the earlier single-org seed.
  await prisma.organization.deleteMany({ where: { slug: { in: ['acme', 'globex'] } } });

  for (const t of TECHNOLOGIES) {
    await prisma.technology.upsert({ where: { name: t.name }, update: t, create: t });
  }

  // ── Organizations & members ────────────────────────────────────────────
  await prisma.organization.create({ data: { id: 'org_acme', name: 'Acme Corporation', slug: 'acme' } });
  await prisma.organization.create({ data: { id: 'org_globex', name: 'Globex Industries', slug: 'globex' } });

  await prisma.member.createMany({
    data: [
      { id: 'mem_acme_admin', orgId: 'org_acme', userId: userIdFor(SEED_USERS.admin.email), role: MemberRole.owner },
      { id: 'mem_acme_lead', orgId: 'org_acme', userId: userIdFor(SEED_USERS.lead.email), role: MemberRole.admin },
      { id: 'mem_acme_architect', orgId: 'org_acme', userId: userIdFor(SEED_USERS.architect.email), role: MemberRole.editor },
      { id: 'mem_acme_developer', orgId: 'org_acme', userId: userIdFor(SEED_USERS.developer.email), role: MemberRole.viewer },
      // Globex: only the architect — use it to verify tenant isolation.
      { id: 'mem_globex_architect', orgId: 'org_globex', userId: userIdFor(SEED_USERS.architect.email), role: MemberRole.owner },
    ],
  });

  // ── Workspaces ─────────────────────────────────────────────────────────
  await prisma.workspace.createMany({
    data: [
      { id: 'ws_core', orgId: 'org_acme', name: 'Core Engineering', slug: 'core', settings: { defaultTheme: 'dark' } },
      { id: 'ws_payments', orgId: 'org_acme', name: 'Payments', slug: 'payments' },
      { id: 'ws_globex_platform', orgId: 'org_globex', name: 'Platform', slug: 'platform' },
    ],
  });

  // ── Architecture 1: E-commerce platform (rich — exercises every view) ──
  await seedArchitecture({
    id: 'arch_ecommerce',
    workspaceId: 'ws_core',
    name: 'E-commerce Platform',
    description: 'Online store: storefront, mobile app, order processing and payments.',
    tags: [
      { id: 'tag_ecom_critical', name: 'critical', color: '#ef4444' },
      { id: 'tag_ecom_pci', name: 'pci', color: '#f59e0b' },
      { id: 'tag_ecom_public', name: 'public', color: '#3b82f6' },
    ],
    objects: [
      // Actors
      { id: 'act_customer', kind: ObjectKind.actor, name: 'Customer', description: 'Shops online via web or mobile', position: { x: 0, y: 0 }, metadata: { role: 'end-user', department: 'external' } },
      { id: 'act_support', kind: ObjectKind.actor, name: 'Support Agent', description: 'Handles refunds and order issues', position: { x: 0, y: 300 }, metadata: { role: 'staff', department: 'customer-success', email: 'support@acme.test' } },
      // Systems
      { id: 'sys_store', kind: ObjectKind.system, name: 'Online Store', description: 'Acme e-commerce system', position: { x: 300, y: 100 }, metadata: { team: 'platform', owner: 'lead@diagramhq.com', lifecycle: 'live', trustZone: 'internal' }, tags: ['tag_ecom_critical'] },
      { id: 'sys_stripe', kind: ObjectKind.system, name: 'Stripe', description: 'External payment provider', position: { x: 700, y: 100 }, metadata: { external: true, trustZone: 'external', compliance: ['PCI-DSS'] }, tags: ['tag_ecom_pci'] },
      { id: 'sys_email', kind: ObjectKind.system, name: 'SendGrid', description: 'Transactional email', position: { x: 700, y: 300 }, metadata: { external: true, trustZone: 'external' } },
      // Group (bounded context) inside the store
      { id: 'grp_checkout', kind: ObjectKind.group, name: 'Checkout Domain', parentId: 'sys_store', position: { x: 280, y: 380 }, metadata: { groupKind: 'domain', color: '#22c55e', team: 'payments' } },
      // Applications
      { id: 'app_web', kind: ObjectKind.application, name: 'Web Storefront', parentId: 'sys_store', description: 'Customer-facing website', position: { x: 300, y: 250 }, tech: ['tech_nextjs'], tags: ['tag_ecom_public'], metadata: { team: 'web', owner: 'architect@diagramhq.com', technology: 'Next.js', lifecycle: 'live', trustZone: 'dmz', publicEndpoint: true, requiresAuth: false, repository: 'acme/storefront' } },
      { id: 'app_mobile', kind: ObjectKind.application, name: 'Mobile App', parentId: 'sys_store', description: 'iOS/Android shopping app', position: { x: 100, y: 450 }, tech: ['tech_react_native'], metadata: { team: 'mobile', owner: 'architect@diagramhq.com', technology: 'React Native', lifecycle: 'future' } },
      { id: 'app_gateway', kind: ObjectKind.application, name: 'API Gateway', parentId: 'sys_store', description: 'Edge routing, auth, rate limits', position: { x: 500, y: 250 }, tech: ['tech_nestjs'], tags: ['tag_ecom_public', 'tag_ecom_critical'], metadata: { team: 'platform', owner: 'lead@diagramhq.com', technology: 'NestJS', lifecycle: 'live', trustZone: 'dmz', publicEndpoint: true, requiresAuth: true, hasSecrets: true, encryption: 'TLS 1.3' } },
      { id: 'app_catalog', kind: ObjectKind.application, name: 'Catalog Service', parentId: 'sys_store', description: 'Products, prices, search', position: { x: 500, y: 450 }, tech: ['tech_nestjs', 'tech_elasticsearch'], metadata: { team: 'catalog', owner: 'developer@diagramhq.com', technology: 'NestJS', lifecycle: 'live', trustZone: 'internal', requiresAuth: true } },
      { id: 'app_orders', kind: ObjectKind.application, name: 'Orders Service', parentId: 'grp_checkout', description: 'Carts, orders, fulfilment', position: { x: 300, y: 600 }, tech: ['tech_nestjs'], tags: ['tag_ecom_critical'], metadata: { team: 'payments', owner: 'lead@diagramhq.com', technology: 'NestJS', lifecycle: 'live', trustZone: 'internal', requiresAuth: true, dataClassification: 'confidential' } },
      { id: 'app_payments', kind: ObjectKind.application, name: 'Payments Service', parentId: 'grp_checkout', description: 'Charges, refunds, Stripe integration', position: { x: 550, y: 600 }, tech: ['tech_go'], tags: ['tag_ecom_pci', 'tag_ecom_critical'], metadata: { team: 'payments', owner: 'lead@diagramhq.com', technology: 'Go', lifecycle: 'live', trustZone: 'restricted', requiresAuth: true, hasSecrets: true, encryption: 'AES-256', compliance: ['PCI-DSS', 'SOC2'], dataClassification: 'restricted' } },
      { id: 'app_legacy_search', kind: ObjectKind.application, name: 'Legacy Search', parentId: 'sys_store', description: 'Being replaced by Catalog Service search', position: { x: 750, y: 450 }, tech: ['tech_elasticsearch'], metadata: { team: 'catalog', owner: 'developer@diagramhq.com', technology: 'Elasticsearch', lifecycle: 'deprecated' } },
      // Components inside Orders Service
      { id: 'cmp_orders_ctrl', kind: ObjectKind.component, name: 'OrdersController', parentId: 'app_orders', description: 'REST endpoints for orders', position: { x: 250, y: 800 }, metadata: { team: 'payments', technology: 'NestJS' } },
      { id: 'cmp_orders_svc', kind: ObjectKind.component, name: 'OrderService', parentId: 'app_orders', description: 'Order state machine', position: { x: 450, y: 800 }, metadata: { team: 'payments', technology: 'NestJS' } },
      { id: 'cmp_orders_repo', kind: ObjectKind.component, name: 'OrderRepository', parentId: 'app_orders', description: 'Persistence adapter', position: { x: 650, y: 800 }, metadata: { team: 'payments', technology: 'Prisma' } },
      // Stores
      { id: 'sto_orders_db', kind: ObjectKind.store, name: 'Orders DB', parentId: 'sys_store', description: 'Orders and customers', position: { x: 300, y: 950 }, tech: ['tech_postgres'], metadata: { storeKind: 'database', databaseKind: 'relational', technology: 'PostgreSQL', version: '16', schema: 'orders', team: 'payments', owner: 'lead@diagramhq.com', dataClassification: 'confidential', encryption: 'AES-256', trustZone: 'restricted' } },
      { id: 'sto_catalog_db', kind: ObjectKind.store, name: 'Catalog DB', parentId: 'sys_store', description: 'Product catalogue', position: { x: 550, y: 950 }, tech: ['tech_postgres'], metadata: { storeKind: 'database', databaseKind: 'relational', technology: 'PostgreSQL', team: 'catalog', dataClassification: 'public' } },
      { id: 'sto_cache', kind: ObjectKind.store, name: 'Session Cache', parentId: 'sys_store', description: 'Sessions and carts', position: { x: 800, y: 950 }, tech: ['tech_redis'], metadata: { storeKind: 'database', databaseKind: 'key-value', technology: 'Redis', team: 'platform', dataClassification: 'internal' } },
      { id: 'que_order_events', kind: ObjectKind.store, name: 'Order Events', parentId: 'sys_store', description: 'OrderPlaced / OrderPaid / OrderShipped', position: { x: 450, y: 1100 }, tech: ['tech_kafka'], metadata: { storeKind: 'queue', queueKind: 'topic', topics: ['order.placed', 'order.paid', 'order.shipped'], technology: 'Kafka', team: 'platform', dataClassification: 'confidential' } },
    ],
    connections: [
      { id: 'con_cust_web', source: 'act_customer', target: 'app_web', kind: ConnectionKind.sync, label: 'Browses & buys', description: 'HTTPS' },
      { id: 'con_cust_mobile', source: 'act_customer', target: 'app_mobile', kind: ConnectionKind.sync, label: 'Uses' },
      { id: 'con_support_orders', source: 'act_support', target: 'app_orders', kind: ConnectionKind.sync, label: 'Issues refunds' },
      { id: 'con_web_gw', source: 'app_web', target: 'app_gateway', kind: ConnectionKind.sync, label: 'REST / JSON', metadata: { protocol: 'HTTPS', encryption: 'TLS 1.3' } },
      { id: 'con_mobile_gw', source: 'app_mobile', target: 'app_gateway', kind: ConnectionKind.sync, label: 'REST / JSON', metadata: { protocol: 'HTTPS' } },
      { id: 'con_gw_catalog', source: 'app_gateway', target: 'app_catalog', kind: ConnectionKind.sync, label: 'Products API' },
      { id: 'con_gw_orders', source: 'app_gateway', target: 'app_orders', kind: ConnectionKind.sync, label: 'Orders API' },
      { id: 'con_orders_payments', source: 'app_orders', target: 'app_payments', kind: ConnectionKind.sync, label: 'Charge', metadata: { protocol: 'gRPC', dataClassification: 'restricted' } },
      { id: 'con_payments_stripe', source: 'app_payments', target: 'sys_stripe', kind: ConnectionKind.sync, label: 'Stripe API', metadata: { protocol: 'HTTPS', dataClassification: 'restricted', encryption: 'TLS 1.3' } },
      { id: 'con_orders_db', source: 'app_orders', target: 'sto_orders_db', kind: ConnectionKind.data, label: 'Reads/writes', metadata: { dataClassification: 'confidential' } },
      { id: 'con_catalog_db', source: 'app_catalog', target: 'sto_catalog_db', kind: ConnectionKind.data, label: 'Reads/writes', metadata: { dataClassification: 'public' } },
      { id: 'con_gw_cache', source: 'app_gateway', target: 'sto_cache', kind: ConnectionKind.data, label: 'Sessions' },
      { id: 'con_orders_events', source: 'app_orders', target: 'que_order_events', kind: ConnectionKind.async, label: 'Publishes order.*', metadata: { dataClassification: 'confidential' } },
      { id: 'con_events_email', source: 'que_order_events', target: 'sys_email', kind: ConnectionKind.async, label: 'Order emails' },
      { id: 'con_catalog_legacy', source: 'app_catalog', target: 'app_legacy_search', kind: ConnectionKind.dependency, label: 'Search fallback' },
      { id: 'con_ctrl_svc', source: 'cmp_orders_ctrl', target: 'cmp_orders_svc', kind: ConnectionKind.sync, label: 'Calls' },
      { id: 'con_svc_repo', source: 'cmp_orders_svc', target: 'cmp_orders_repo', kind: ConnectionKind.sync, label: 'Persists via' },
      { id: 'con_repo_db', source: 'cmp_orders_repo', target: 'sto_orders_db', kind: ConnectionKind.data, label: 'SQL' },
    ],
    views: [
      { id: 'vw_ecom_context', name: 'System Context', kind: ViewKind.context, level: 1, isStarred: true, objects: ['act_customer', 'act_support', 'sys_store', 'sys_stripe', 'sys_email'] },
      { id: 'vw_ecom_container', name: 'Containers', kind: ViewKind.container, level: 2, isStarred: true, objects: ['act_customer', 'app_web', 'app_mobile', 'app_gateway', 'app_catalog', 'app_orders', 'app_payments', 'sto_orders_db', 'sto_catalog_db', 'sto_cache', 'que_order_events', 'sys_stripe', 'sys_email'] },
      { id: 'vw_ecom_component', name: 'Orders Service — Components', kind: ViewKind.component, level: 3, objects: ['cmp_orders_ctrl', 'cmp_orders_svc', 'cmp_orders_repo', 'sto_orders_db'] },
      { id: 'vw_ecom_security', name: 'Security & Trust Zones', kind: ViewKind.security, objects: ['app_web', 'app_gateway', 'app_catalog', 'app_orders', 'app_payments', 'sto_orders_db', 'sys_stripe'] },
      { id: 'vw_ecom_data', name: 'Data Classification', kind: ViewKind.data, objects: ['app_orders', 'app_payments', 'sto_orders_db', 'sto_catalog_db', 'sto_cache', 'que_order_events', 'sys_stripe'] },
      { id: 'vw_ecom_ownership', name: 'Team Ownership', kind: ViewKind.ownership, objects: ['app_web', 'app_mobile', 'app_gateway', 'app_catalog', 'app_orders', 'app_payments', 'app_legacy_search'] },
      { id: 'vw_ecom_tech', name: 'Technology Radar', kind: ViewKind.technology, objects: ['app_web', 'app_mobile', 'app_gateway', 'app_catalog', 'app_payments', 'app_legacy_search', 'sto_orders_db', 'sto_cache', 'que_order_events'] },
      { id: 'vw_ecom_persona', name: 'Executive Overview', kind: ViewKind.persona, objects: ['act_customer', 'sys_store', 'sys_stripe', 'sys_email'] },
      { id: 'vw_ecom_payments_team', name: 'Payments Team (dynamic)', kind: ViewKind.custom, filter: { team: 'payments' }, objects: [] },
    ],
    decisions: [
      { id: 'dec_ecom_1', number: 1, title: 'Use PostgreSQL for transactional data', status: 'accepted', context: 'Orders need ACID guarantees.', decision: 'All transactional stores use PostgreSQL 16.', consequences: 'Team standardises on one RDBMS; sharding deferred.', objects: ['sto_orders_db', 'sto_catalog_db'] },
      { id: 'dec_ecom_2', number: 2, title: 'Publish order lifecycle events to Kafka', status: 'accepted', context: 'Email, analytics and fulfilment all react to orders.', decision: 'Orders Service publishes order.* events.', consequences: 'Consumers are decoupled; need schema registry.', objects: ['app_orders', 'que_order_events'] },
      { id: 'dec_ecom_3', number: 3, title: 'Retire Legacy Search', status: 'proposed', context: 'Elasticsearch 7.10 is out of support.', decision: 'Move search into Catalog Service.', consequences: 'Migration effort for catalog team.', objects: ['app_legacy_search', 'app_catalog'] },
    ],
  });

  // ── Architecture 2: Payments ledger (small, second workspace) ──────────
  await seedArchitecture({
    id: 'arch_ledger',
    workspaceId: 'ws_payments',
    name: 'Payments Ledger',
    description: 'Double-entry ledger and reconciliation.',
    objects: [
      { id: 'sys_ledger', kind: ObjectKind.system, name: 'Ledger', position: { x: 0, y: 0 }, metadata: { team: 'payments', owner: 'lead@diagramhq.com' } },
      { id: 'app_ledger_api', kind: ObjectKind.application, name: 'Ledger API', parentId: 'sys_ledger', position: { x: 0, y: 200 }, tech: ['tech_go'], metadata: { team: 'payments', technology: 'Go', lifecycle: 'live' } },
      { id: 'app_recon', kind: ObjectKind.application, name: 'Reconciliation Job', parentId: 'sys_ledger', position: { x: 300, y: 200 }, tech: ['tech_go'], metadata: { team: 'payments', technology: 'Go', lifecycle: 'future' } },
      { id: 'sto_ledger_db', kind: ObjectKind.store, name: 'Ledger DB', parentId: 'sys_ledger', position: { x: 150, y: 400 }, tech: ['tech_postgres'], metadata: { storeKind: 'database', databaseKind: 'relational', dataClassification: 'restricted' } },
    ],
    connections: [
      { id: 'con_ledger_db', source: 'app_ledger_api', target: 'sto_ledger_db', kind: ConnectionKind.data, label: 'Writes entries' },
      { id: 'con_recon_db', source: 'app_recon', target: 'sto_ledger_db', kind: ConnectionKind.data, label: 'Reads entries' },
    ],
    views: [
      { id: 'vw_ledger_container', name: 'Ledger Containers', kind: ViewKind.container, level: 2, objects: ['app_ledger_api', 'app_recon', 'sto_ledger_db'] },
    ],
  });

  // ── Architecture 3: Globex (tenant-isolation check) ───────────────────
  await seedArchitecture({
    id: 'arch_globex',
    workspaceId: 'ws_globex_platform',
    name: 'Globex IoT Platform',
    description: 'Only visible to architect@diagramhq.com.',
    objects: [
      { id: 'sys_globex_iot', kind: ObjectKind.system, name: 'IoT Platform', position: { x: 0, y: 0 } },
      { id: 'app_globex_ingest', kind: ObjectKind.application, name: 'Telemetry Ingest', parentId: 'sys_globex_iot', position: { x: 0, y: 200 } },
    ],
    connections: [],
  });

  console.log(
    [
      'Database seeded successfully:',
      '  orgs: Acme Corporation (acme), Globex Industries (globex)',
      '  workspaces: Core Engineering, Payments, Platform',
      '  architectures: E-commerce Platform (20 objects, 18 connections, 9 views, 3 ADRs), Payments Ledger, Globex IoT Platform',
      '  login as:',
      ...Object.entries(SEED_USERS).map(([k, u]) => `    ${k.padEnd(10)} ${u.email} / ${u.password}`),
    ].join('\n'),
  );
}

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
