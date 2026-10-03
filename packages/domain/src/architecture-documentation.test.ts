import { describe, expect, it } from 'vitest';
import {
  buildArchitectureDocTree,
  findDocTreeNode,
  flattenDocTree,
  getDocBreadcrumbs,
  searchDocTree,
  generateObjectDocPage,
  generateArchitectureOverviewDocPage,
  generateArchitectureDocPages,
  exportArchitectureDocsAsCatalog,
  renderDocPageToMarkdown,
  slugifyDocName,
} from './architecture-documentation';
import type {
  ArchitectureModel,
  ModelObject,
  ModelConnection,
  Architecture,
  Version,
  View,
  Flow,
} from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import type { Team, ObjectOwnership } from './teams';
import { createId, type ObjectId } from './ids';

describe('F092: Architecture Documentation Engine', () => {
  const archId = createId('architecture');
  const verId = createId('version');

  const arch: Architecture = {
    id: archId,
    workspaceId: createId('workspace'),
    name: 'ShopSphere E-Commerce',
    description: 'Cloud-native multi-tier e-commerce platform and event backbone.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ver: Version = {
    id: verId,
    architectureId: archId,
    name: 'v1.0.0',
    kind: 'main',
    status: 'approved',
    createdAt: new Date(),
  };

  // Objects
  const webAppId = createId('object');
  const apiGatewayId = createId('object');
  const orderServiceId = createId('object');
  const paymentServiceId = createId('object');
  const orderDbId = createId('object');
  const kafkaQueueId = createId('object');
  const orderWorkerId = createId('object'); // child component of orderService

  const objects: ModelObject[] = [
    {
      id: webAppId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Storefront Web App',
      description: 'Customer facing Next.js storefront portal.',
      metadata: {
        technology: 'Next.js 15 / React 19',
        owner: 'Storefront Team',
        team: 'Team Frontend',
        status: 'active',
        environment: 'production',
        criticality: 'high',
        dataClassification: 'public',
        tags: ['web', 'customer-facing'],
        repository: 'https://github.com/shopsphere/storefront',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: apiGatewayId,
      architectureId: archId,
      versionId: verId,
      kind: 'system',
      name: 'API Gateway',
      description: 'Kong API Gateway and edge router handling SSL termination and rate limiting.',
      metadata: {
        technology: 'Kong / Envoy',
        owner: 'Platform Eng',
        team: 'Platform Core',
        status: 'active',
        criticality: 'critical',
        sla: '99.99%',
        rto: '5m',
        rpo: '0m',
        tags: ['ingress', 'network'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: orderServiceId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Order Service',
      description: 'Core microservice managing checkout, order lifecycle, and fulfillment state.',
      metadata: {
        technology: 'Go 1.23 / gRPC',
        owner: 'Orders Squad',
        team: 'Core Commerce',
        status: 'active',
        domain: 'Checkout & Orders',
        criticality: 'critical',
        dataClassification: 'confidential',
        compliance: ['PCI-DSS', 'SOC2'],
        sla: '99.95%',
        repository: 'https://github.com/shopsphere/order-service',
        documentation: 'https://docs.shopsphere.internal/order-service',
        tags: ['orders', 'microservice'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: orderWorkerId,
      architectureId: archId,
      versionId: verId,
      parentId: orderServiceId,
      kind: 'component',
      name: 'Order Fulfillment Worker',
      description: 'Background worker polling events and updating shipment status.',
      metadata: {
        technology: 'Go Goroutines',
        status: 'active',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: paymentServiceId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Payment Service',
      description: 'Stripe tokenized payment processing service.',
      metadata: {
        technology: 'Rust / Actix',
        owner: 'Payments Squad',
        status: 'active',
        criticality: 'critical',
        compliance: ['PCI-DSS Level 1'],
        tags: ['payments', 'financial'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: orderDbId,
      architectureId: archId,
      versionId: verId,
      kind: 'store',
      name: 'Orders PostgreSQL DB',
      description: 'Primary relational datastore for orders and transaction ledger.',
      metadata: {
        technology: 'PostgreSQL 16',
        owner: 'DBA Team',
        status: 'active',
        criticality: 'critical',
        dataClassification: 'confidential',
        tags: ['database', 'rdbms'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: kafkaQueueId,
      architectureId: archId,
      versionId: verId,
      kind: 'store',
      name: 'Order Events Kafka',
      description: 'Apache Kafka event bus for async order event streaming.',
      metadata: {
        technology: 'Apache Kafka 3.7',
        status: 'active',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Connections
  const connections: ModelConnection[] = [
    {
      id: createId('connection'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: webAppId,
      targetObjectId: apiGatewayId,
      kind: 'sync',
      label: 'REST API Calls',
      description: 'HTTPS JSON API queries from browser client',
      metadata: { protocol: 'HTTPS', technology: 'JSON/REST' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('connection'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: apiGatewayId,
      targetObjectId: orderServiceId,
      kind: 'sync',
      label: 'Proxy Order API',
      description: 'Authenticated gRPC forwarding to Order Service',
      metadata: { protocol: 'gRPC', technology: 'HTTP/2 Protobuf' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('connection'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: orderServiceId,
      targetObjectId: paymentServiceId,
      kind: 'sync',
      label: 'Process Payment',
      description: 'Synchronous payment authorization and capture',
      metadata: { protocol: 'HTTPS', technology: 'TLS REST' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('connection'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: orderServiceId,
      targetObjectId: orderDbId,
      kind: 'data',
      label: 'Persist Orders',
      description: 'ACID transaction writes and queries',
      metadata: { protocol: 'Postgres Wire', technology: 'SQL' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: createId('connection'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: orderServiceId,
      targetObjectId: kafkaQueueId,
      kind: 'async',
      label: 'Publish Order Events',
      description: 'Emits OrderPlaced and OrderFulfilled events',
      metadata: { protocol: 'Kafka Protocol', technology: 'Avro' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const model: ArchitectureModel = {
    architecture: arch,
    version: ver,
    objects,
    connections,
  };

  it('slugifyDocName normalizes names cleanly', () => {
    expect(slugifyDocName('Order Service')).toBe('order-service');
    expect(slugifyDocName('API Gateway v2.0!')).toBe('api-gateway-v20');
    expect(slugifyDocName('   ')).toBe('doc');
  });

  describe('Architecture Doc Tree', () => {
    it('builds a hierarchical navigation tree with correct depths and paths', () => {
      const tree = buildArchitectureDocTree(model);

      expect(tree.root.id).toBe('architecture-root');
      expect(tree.root.title).toBe('ShopSphere E-Commerce');
      expect(tree.root.kind).toBe('architecture');
      expect(tree.totalObjects).toBe(objects.length);
      expect(tree.maxDepth).toBeGreaterThanOrEqual(2); // Order Service -> Order Fulfillment Worker

      // Check root children (top-level objects without parentId)
      expect(tree.root.children.length).toBe(6); // 7 objects total, 1 has parentId

      // Find Order Service in tree
      const orderNode = findDocTreeNode(tree, orderServiceId);
      expect(orderNode).toBeDefined();
      expect(orderNode?.title).toBe('Order Service');
      expect(orderNode?.depth).toBe(1);
      expect(orderNode?.inboundCount).toBe(1); // from API Gateway
      expect(orderNode?.outboundCount).toBe(3); // to Payment, DB, Kafka
      expect(orderNode?.children.length).toBe(1); // Order Fulfillment Worker

      // Check child node
      const workerNode = orderNode?.children[0];
      expect(workerNode?.title).toBe('Order Fulfillment Worker');
      expect(workerNode?.depth).toBe(2);
      expect(workerNode?.path).toBe('/docs/shopsphere-e-commerce/order-service/order-fulfillment-worker');
    });

    it('flattens doc tree into linear list of nodes', () => {
      const tree = buildArchitectureDocTree(model);
      const flattened = flattenDocTree(tree);

      expect(flattened.length).toBe(tree.totalNodes);
      expect(flattened[0].id).toBe('architecture-root');
      expect(flattened.some((n) => n.objectId === orderServiceId)).toBe(true);
      expect(flattened.some((n) => n.objectId === orderWorkerId)).toBe(true);
    });

    it('computes breadcrumbs from architecture root to deep child object', () => {
      const tree = buildArchitectureDocTree(model);
      const crumbs = getDocBreadcrumbs(tree, orderWorkerId);

      expect(crumbs.length).toBe(3);
      expect(crumbs[0].title).toBe('ShopSphere E-Commerce');
      expect(crumbs[1].title).toBe('Order Service');
      expect(crumbs[2].title).toBe('Order Fulfillment Worker');
    });

    it('searches doc tree across titles, descriptions, technologies, and tags', () => {
      const tree = buildArchitectureDocTree(model);

      const goMatches = searchDocTree(tree, 'Go 1.23');
      expect(goMatches.length).toBe(1);
      expect(goMatches[0].title).toBe('Order Service');

      const kafkaMatches = searchDocTree(tree, 'Kafka');
      expect(kafkaMatches.length).toBe(1);
      expect(kafkaMatches[0].title).toBe('Order Events Kafka');

      const allNodes = searchDocTree(tree, '');
      expect(allNodes.length).toBe(tree.totalNodes);
    });
  });

  describe('Object Documentation Page Generation', () => {
    it('renders an object doc page from metadata + connections', () => {
      const page = generateObjectDocPage(orderServiceId, model);

      expect(page.id).toBe(`doc-${orderServiceId}`);
      expect(page.title).toBe('Order Service');
      expect(page.kind).toBe('application');
      expect(page.description).toContain('Core microservice managing checkout');

      // Metadata verification
      expect(page.metadata.technology).toBe('Go 1.23 / gRPC');
      expect(page.metadata.owner).toBe('Orders Squad');
      expect(page.metadata.team).toBe('Core Commerce');
      expect(page.metadata.status).toBe('active');
      expect(page.metadata.criticality).toBe('critical');
      expect(page.metadata.domain).toBe('Checkout & Orders');
      expect(page.metadata.compliance).toContain('PCI-DSS');
      expect(page.metadata.tags).toContain('orders');
      expect(page.metadata.repositoryUrl).toBe('https://github.com/shopsphere/order-service');

      // Inbound Connections verification (API Gateway -> Order Service)
      expect(page.inboundConnections.length).toBe(1);
      expect(page.inboundConnections[0].sourceName).toBe('API Gateway');
      expect(page.inboundConnections[0].sourceKind).toBe('system');
      expect(page.inboundConnections[0].label).toBe('Proxy Order API');
      expect(page.inboundConnections[0].protocol).toBe('gRPC');

      // Outbound Dependencies verification (Order Service -> Payment, DB, Kafka)
      expect(page.outboundConnections.length).toBe(3);
      const targetNames = page.outboundConnections.map((c) => c.targetName);
      expect(targetNames).toContain('Payment Service');
      expect(targetNames).toContain('Orders PostgreSQL DB');
      expect(targetNames).toContain('Order Events Kafka');

      // Children components verification
      expect(page.children.length).toBe(1);
      expect(page.children[0].name).toBe('Order Fulfillment Worker');
      expect(page.children[0].kind).toBe('component');

      // Breadcrumbs
      expect(page.breadcrumbs.length).toBe(2);
      expect(page.breadcrumbs[0].title).toBe('ShopSphere E-Commerce');
      expect(page.breadcrumbs[1].title).toBe('Order Service');

      // Markdown synthesis
      expect(page.markdown).toContain('# Order Service');
      expect(page.markdown).toContain('## Overview');
      expect(page.markdown).toContain('## Inbound Integrations (Callers)');
      expect(page.markdown).toContain('API Gateway');
      expect(page.markdown).toContain('## Outbound Dependencies');
      expect(page.markdown).toContain('Payment Service');
      expect(page.markdown).toContain('Orders PostgreSQL DB');
      expect(page.markdown).toContain('Order Events Kafka');
      expect(page.markdown).toContain('## Contained Components & Subsystems');
      expect(page.markdown).toContain('Order Fulfillment Worker');

      const standaloneMarkdown = renderDocPageToMarkdown(page);
      expect(standaloneMarkdown).toBe(page.markdown);
    });

    it('integrates associated ADRs, Views, and Flows when provided in context', () => {
      const adr: ArchitectureDecisionRecord = {
        id: createId('decision'),
        number: 42,
        title: 'Adopt gRPC for Internal Inter-Service Communication',
        status: 'accepted',
        context: 'Need high performance RPCs between API Gateway and Order Service.',
        decision: 'Use protobuf and gRPC.',
        consequences: 'Requires protobuf compiler in CI pipeline.',
        alternatives: ['REST', 'Thrift'],
        attachments: [
          {
            targetType: 'object',
            targetId: orderServiceId,
            attachedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const view: View = {
        id: createId('view'),
        architectureId: archId,
        name: 'Order Processing Container View',
        kind: 'container',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const flow: Flow = {
        id: createId('flow'),
        architectureId: archId,
        name: 'Customer Checkout Flow',
        actorId: webAppId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const team: Team = {
        id: createId('team'),
        orgId: createId('org'),
        name: 'Commerce Core Engineering',
        slug: 'commerce-core-engineering',
        memberUserIds: ['user-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ownership: ObjectOwnership = {
        objectId: orderServiceId,
        primaryTeamId: team.id,
        updatedAt: new Date(),
      };

      const page = generateObjectDocPage(orderServiceId, model, {
        adrs: [adr],
        views: [view],
        flows: [flow],
        teams: [team],
        ownerships: [ownership],
      });

      expect(page.associatedAdrs.length).toBe(1);
      expect(page.associatedAdrs[0].number).toBe(42);
      expect(page.associatedAdrs[0].title).toContain('Adopt gRPC');

      expect(page.associatedViews.length).toBe(1);
      expect(page.associatedViews[0].name).toBe('Order Processing Container View');

      // Ownership resolved from team catalog
      expect(page.metadata.team).toBe('Commerce Core Engineering');

      // ADR table rendered in markdown
      expect(page.markdown).toContain('## Architectural Decision Records (ADRs)');
      expect(page.markdown).toContain('ADR-042');
      expect(page.markdown).toContain('Adopt gRPC');
    });

    it('throws when target object does not exist in model', () => {
      expect(() => {
        generateObjectDocPage('non-existent-id' as ObjectId, model);
      }).toThrow(/Cannot generate documentation page/);
    });
  });

  describe('Architecture Overview Documentation', () => {
    it('generates high-level system doc page with entity breakdown and top subsystems', () => {
      const overview = generateArchitectureOverviewDocPage(model);

      expect(overview.id).toBe('doc-overview');
      expect(overview.title).toBe('ShopSphere E-Commerce');
      expect(overview.kind).toBe('architecture');
      expect(overview.sections.some((s) => s.id === 'overview')).toBe(true);
      expect(overview.sections.some((s) => s.id === 'metrics')).toBe(true);
      expect(overview.sections.some((s) => s.id === 'technologies')).toBe(true);
      expect(overview.sections.some((s) => s.id === 'subsystems')).toBe(true);

      expect(overview.markdown).toContain('# ShopSphere E-Commerce');
      expect(overview.markdown).toContain('Entity Breakdown');
      expect(overview.markdown).toContain('Technology Stack');
      expect(overview.markdown).toContain('Next.js 15 / React 19');
      expect(overview.markdown).toContain('Kong / Envoy');
      expect(overview.markdown).toContain('PostgreSQL 16');
    });
  });

  describe('Catalog & Batch Generation', () => {
    it('generateArchitectureDocPages generates doc pages for all objects', () => {
      const pagesMap = generateArchitectureDocPages(model);

      expect(pagesMap.size).toBe(objects.length);
      for (const obj of objects) {
        expect(pagesMap.has(obj.id)).toBe(true);
        const p = pagesMap.get(obj.id)!;
        expect(p.title).toBe(obj.name);
      }
    });

    it('exportArchitectureDocsAsCatalog exports complete catalog structure', () => {
      const catalog = exportArchitectureDocsAsCatalog(model);

      expect(catalog.architectureId).toBe(archId);
      expect(catalog.architectureName).toBe('ShopSphere E-Commerce');
      expect(catalog.tree.totalObjects).toBe(objects.length);
      expect(catalog.overviewPage.title).toBe('ShopSphere E-Commerce');
      expect(catalog.objectPages.length).toBe(objects.length);
    });
  });
});
