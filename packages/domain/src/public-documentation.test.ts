import { describe, it, expect } from 'vitest';
import {
  createPublicDocPublication,
  publishDocPublication,
  unpublishDocPublication,
  updatePublicDocPublication,
  recordPublicDocView,
  verifyPublicDocAccess,
  compilePublicSiteBundle,
  searchPublicSite,
  renderStandalonePublicSiteHtml,
  generatePublicShareUrl,
  slugify,
  estimateReadingTime,
  generatePageExcerpt,
} from './public-documentation';
import { createId } from './ids';
import type { ArchitectureModel, View, Flow } from './types';
import type { ArchitectureDecisionRecord } from './adrs';

function buildMockModel(): ArchitectureModel {
  const archId = createId('arch');
  const sys1 = createId('sys');
  const app1 = createId('app');
  const sto1 = createId('sto');
  const con1 = createId('con');
  const con2 = createId('con');

  return {
    architecture: {
      id: archId,
      name: 'Global Payment Network',
      description: 'Distributed payment orchestration and clearing pipeline',
    },
    objects: [
      {
        id: sys1,
        kind: 'system',
        name: 'Payment Core',
        description: 'Primary ledger and transaction processor',
        metadata: {
          technology: 'Java 21 / Spring Boot',
          owner: 'Core Banking Team',
          status: 'active',
          sla: '99.99%',
          compliance: ['PCI-DSS', 'SOC2'],
          tags: ['critical', 'finance'],
        },
      },
      {
        id: app1,
        kind: 'application',
        name: 'Checkout Gateway API',
        description: 'Public-facing REST API for merchant transaction ingest',
        parentId: sys1,
        metadata: {
          technology: 'Go / gRPC',
          owner: 'Merchant Team',
          status: 'active',
          tags: ['edge', 'api'],
        },
      },
      {
        id: sto1,
        kind: 'store',
        name: 'Transaction Ledger DB',
        description: 'Immutable transaction store',
        parentId: sys1,
        metadata: {
          technology: 'PostgreSQL 16',
          owner: 'Data Infrastructure',
          status: 'active',
          tags: ['database', 'acid'],
        },
      },
    ],
    connections: [
      {
        id: con1,
        sourceId: app1,
        targetId: sys1,
        kind: 'sync',
        protocol: 'gRPC',
        label: 'Submits payment authorization',
      },
      {
        id: con2,
        sourceId: sys1,
        targetId: sto1,
        kind: 'sync',
        protocol: 'TCP / TLS',
        label: 'Persists ledger journal entry',
      },
    ],
  };
}

describe('Public Documentation Domain Engine (F094)', () => {
  describe('Helper Utilities', () => {
    it('slugifies titles safely', () => {
      expect(slugify('Payment Gateway API v2.0!')).toBe('payment-gateway-api-v20');
      expect(slugify('   Spaces and   Tabs   ')).toBe('spaces-and-tabs');
      expect(slugify('---special---')).toBe('special');
      expect(slugify('')).toBe('page');
    });

    it('estimates reading time reasonably', () => {
      const shortText = 'Hello world this is a short test document.';
      expect(estimateReadingTime(shortText)).toBe(1);

      const longText = new Array(500).fill('word').join(' ');
      expect(estimateReadingTime(longText)).toBe(3);
    });

    it('generates clean page excerpts from markdown', () => {
      const md = '# Header\n\nThis is the **first** paragraph of docs.\n\n:::diagram[123]:::\n\n```code\nvar a = 1;\n```';
      const excerpt = generatePageExcerpt(md, 50);
      expect(excerpt).toBe('This is the first paragraph of docs.');
    });
  });

  describe('Publication Lifecycle', () => {
    it('creates a publication in draft mode with generated ID and default settings', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Payments Architecture Documentation',
        description: 'Official external architecture reference',
      });

      expect(pub.id).toMatch(/^pub_/);
      expect(pub.status).toBe('draft');
      expect(pub.version).toBe('1.0.0');
      expect(pub.slug).toBe('payments-architecture-documentation');
      expect(pub.visibility).toBe('public');
      expect(pub.viewCount).toBe(0);
      expect(pub.uniqueVisitors).toBe(0);
      expect(pub.versionHistory).toEqual([]);
      expect(pub.contentConfig.includeOverview).toBe(true);
      expect(pub.branding.organizationName).toBe('Architecture Team');
    });

    it('throws error when title is empty or only whitespace', () => {
      const archId = createId('arch');
      expect(() =>
        createPublicDocPublication({
          architectureId: archId,
          title: '   ',
        }),
      ).toThrow('Publication title cannot be empty');
    });

    it('publishes and records version history', () => {
      const archId = createId('arch');
      const draft = createPublicDocPublication({
        architectureId: archId,
        title: 'Order Fulfillment Platform',
      });

      const published = publishDocPublication(draft, {
        version: '1.0.1',
        changelog: 'Initial public doc release',
      });

      expect(published.status).toBe('published');
      expect(published.version).toBe('1.0.1');
      expect(published.publishedAt).toBeDefined();
      expect(published.versionHistory).toHaveLength(1);
      expect(published.versionHistory[0]?.version).toBe('1.0.1');
      expect(published.versionHistory[0]?.changelog).toBe('Initial public doc release');
    });

    it('unpublishes back to draft status', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Inventory Systems',
      });
      const published = publishDocPublication(pub);
      const unpublished = unpublishDocPublication(published);

      expect(unpublished.status).toBe('draft');
    });

    it('updates publication settings and recalculates slug when changed', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Old Title',
      });

      const updated = updatePublicDocPublication(pub, {
        title: 'New Enterprise Title',
        slug: 'new-enterprise-slug',
        visibility: 'password_protected',
        passkey: 'secret123',
      });

      expect(updated.title).toBe('New Enterprise Title');
      expect(updated.slug).toBe('new-enterprise-slug');
      expect(updated.visibility).toBe('password_protected');
      expect(updated.passkey).toBe('secret123');
    });

    it('records page views and unique visitors', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({ architectureId: archId, title: 'Docs' });

      const v1 = recordPublicDocView(pub, { isNewVisitor: true });
      expect(v1.viewCount).toBe(1);
      expect(v1.uniqueVisitors).toBe(1);
      expect(v1.lastViewedAt).toBeDefined();

      const v2 = recordPublicDocView(v1, { isNewVisitor: false });
      expect(v2.viewCount).toBe(2);
      expect(v2.uniqueVisitors).toBe(1);
    });
  });

  describe('Anonymous Access Verification (Viewable Without Account)', () => {
    it('denies access if publication is draft or archived', () => {
      const archId = createId('arch');
      const draft = createPublicDocPublication({ architectureId: archId, title: 'Unpublished Docs' });

      const result = verifyPublicDocAccess(draft);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_published');
    });

    it('denies access if publication has expired', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Temporary Docs',
        expiresAt: new Date(Date.now() - 60000).toISOString(), // expired 1 minute ago
      });
      const published = publishDocPublication(pub);

      const result = verifyPublicDocAccess(published);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('allows external reader without an account for public documentation', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Public Knowledge Base',
        visibility: 'public',
      });
      const published = publishDocPublication(pub);

      const result = verifyPublicDocAccess(published);
      expect(result.allowed).toBe(true);
      expect(result.requiresPasskey).toBe(false);
      expect(result.reason).toBe('success');
    });

    it('allows external reader via unlisted secret link without an account', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Secret Spec',
        visibility: 'unlisted',
      });
      const published = publishDocPublication(pub);

      const result = verifyPublicDocAccess(published);
      expect(result.allowed).toBe(true);
      expect(result.requiresPasskey).toBe(false);
      expect(result.reason).toBe('success');
    });

    it('enforces passkey check for password_protected docs without requiring user account', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Confidential Client Architecture',
        visibility: 'password_protected',
        passkey: 'correct-passcode',
      });
      const published = publishDocPublication(pub);

      // No passkey provided
      const r1 = verifyPublicDocAccess(published);
      expect(r1.allowed).toBe(false);
      expect(r1.requiresPasskey).toBe(true);
      expect(r1.reason).toBe('passkey_required');

      // Incorrect passkey provided
      const r2 = verifyPublicDocAccess(published, { passkey: 'wrong-pass' });
      expect(r2.allowed).toBe(false);
      expect(r2.requiresPasskey).toBe(true);
      expect(r2.reason).toBe('invalid_passkey');

      // Correct passkey provided -> viewable without an account
      const r3 = verifyPublicDocAccess(published, { passkey: 'correct-passcode' });
      expect(r3.allowed).toBe(true);
      expect(r3.requiresPasskey).toBe(true);
      expect(r3.reason).toBe('success');
    });

    it('generates public share URLs accurately', () => {
      const archId = createId('arch');
      const pub = createPublicDocPublication({
        architectureId: archId,
        title: 'Microservices Guide',
        slug: 'microservices-guide',
      });

      expect(generatePublicShareUrl(pub)).toBe('https://diagramhq.com/docs/pub/microservices-guide');

      const customDomainPub = updatePublicDocPublication(pub, { customDomain: 'docs.example.org' });
      expect(generatePublicShareUrl(customDomainPub)).toBe('https://docs.example.org/docs/microservices-guide');
    });
  });

  describe('Site Compiler & Search Index', () => {
    it('compiles a complete public documentation site bundle from model, ADRs, views, and flows', () => {
      const model = buildMockModel();
      const pub = createPublicDocPublication({
        architectureId: model.architecture.id,
        title: 'Global Payment Platform',
        description: 'Complete architecture specification for external partners',
      });
      const published = publishDocPublication(pub);

      const adr1: ArchitectureDecisionRecord = {
        id: createId('dec'),
        number: 1,
        title: 'Adopt PostgreSQL for Ledger Storage',
        status: 'accepted',
        context: 'We require ACID guarantees for ledger integrity.',
        decision: 'Use PostgreSQL with serializable isolation level.',
        consequences: 'Guarantees balance invariants; requires careful indexing.',
        alternatives: ['MySQL', 'Cassandra'],
        attachments: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const view1: View = {
        id: createId('vw'),
        architectureId: model.architecture.id,
        name: 'Payment Core Container View',
        kind: 'container',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const flow1: Flow = {
        id: createId('flw'),
        architectureId: model.architecture.id,
        name: 'Authorize Card Payment Flow',
        type: 'sequence',
        description: 'Step-by-step authorization flow',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const bundle = compilePublicSiteBundle(published, model, {
        adrs: [adr1],
        views: [view1],
        flows: [flow1],
      });

      expect(bundle.publicationId).toBe(published.id);
      expect(bundle.title).toBe(published.title);
      expect(bundle.pages.length).toBeGreaterThanOrEqual(6); // Overview + 3 objects + 1 ADR + 1 View + 1 Flow

      // Check Overview page
      const overviewPage = bundle.pages.find((p) => p.category === 'overview');
      expect(overviewPage).toBeDefined();
      expect(overviewPage?.title).toContain('Overview');

      // Check Component pages
      const appPage = bundle.pages.find((p) => p.title === 'Checkout Gateway API');
      expect(appPage).toBeDefined();
      expect(appPage?.category).toBe('subsystem');
      expect(appPage?.content).toContain('Checkout Gateway API');

      // Check ADR page
      const adrPage = bundle.pages.find((p) => p.category === 'adr');
      expect(adrPage).toBeDefined();
      expect(adrPage?.title).toContain('ADR-1: Adopt PostgreSQL');
      expect(adrPage?.content).toContain('ACID guarantees');

      // Check Diagram View page
      const viewPage = bundle.pages.find((p) => p.category === 'view');
      expect(viewPage).toBeDefined();
      expect(viewPage?.diagramEmbed?.title).toBe('Payment Core Container View');

      // Check Flow page
      const flowPage = bundle.pages.find((p) => p.category === 'flow');
      expect(flowPage).toBeDefined();
      expect(flowPage?.title).toBe('Authorize Card Payment Flow');

      // Check sitemap and robots
      expect(bundle.sitemapXml).toContain('<?xml version="1.0"');
      expect(bundle.sitemapXml).toContain(published.slug);
      expect(bundle.robotsTxt).toContain('Allow: /');

      // Check navigation sections
      expect(bundle.navigation.length).toBeGreaterThanOrEqual(4);
      expect(bundle.navigation.some((s) => s.category === 'adr')).toBe(true);

      // Check search index
      expect(bundle.searchIndex.length).toBe(bundle.pages.length);
    });

    it('filters included objects and ADRs according to contentConfig', () => {
      const model = buildMockModel();
      const allowedObjId = model.objects[0]!.id;

      const pub = createPublicDocPublication({
        architectureId: model.architecture.id,
        title: 'Filtered Docs',
        contentConfig: {
          includeOverview: false,
          includedObjectIds: [allowedObjId],
        },
      });
      const published = publishDocPublication(pub);

      const bundle = compilePublicSiteBundle(published, model);

      expect(bundle.pages.some((p) => p.category === 'overview')).toBe(false);
      expect(bundle.pages).toHaveLength(1);
      expect(bundle.pages[0]?.title).toBe('Payment Core');
    });

    it('performs weighted client-side search across public documentation', () => {
      const model = buildMockModel();
      const pub = createPublicDocPublication({
        architectureId: model.architecture.id,
        title: 'Searchable Platform',
      });
      const published = publishDocPublication(pub);

      const bundle = compilePublicSiteBundle(published, model);

      // Exact title match receives highest score
      const results1 = searchPublicSite(bundle, 'Checkout Gateway API');
      expect(results1.length).toBeGreaterThan(0);
      expect(results1[0]?.title).toBe('Checkout Gateway API');
      expect(results1[0]?.score).toBeGreaterThanOrEqual(50);

      // Search matching technology/keyword in snippet
      const results2 = searchPublicSite(bundle, 'PostgreSQL');
      expect(results2.length).toBeGreaterThan(0);
      expect(results2.some((r) => r.title === 'Transaction Ledger DB')).toBe(true);

      // Empty query returns no results
      expect(searchPublicSite(bundle, '   ')).toEqual([]);
    });

    it('renders valid standalone HTML document', () => {
      const model = buildMockModel();
      const pub = createPublicDocPublication({
        architectureId: model.architecture.id,
        title: 'Offline Standalone Portal',
      });
      const published = publishDocPublication(pub);
      const bundle = compilePublicSiteBundle(published, model);

      const html = renderStandalonePublicSiteHtml(bundle);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Offline Standalone Portal - Architecture Documentation</title>');
      expect(html).toContain('class="search-input"');
      expect(html).toContain('Payment Core');
      expect(html).toContain('function showPage');
    });
  });
});
