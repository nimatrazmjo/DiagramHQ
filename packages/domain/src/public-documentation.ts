/**
 * DiagramHQ - Public Documentation Domain Engine (F094)
 *
 * Provides static site generation and public publishing capabilities for
 * architecture documentation, viewable by external readers without an account:
 * - Public publication lifecycle management (draft, published, archived).
 * - Anonymous access control:
 *   - 'public': open to all external visitors without login.
 *   - 'unlisted': accessible via unique secret slug without login.
 *   - 'password_protected': accessible via passkey without user account registration.
 * - Version management and version history recording.
 * - Public site compilation:
 *   - Generates responsive pages for Overview, Subsystems, Components, ADRs, Views, and Flows.
 *   - Formats rich semantic HTML and markdown excerpts.
 *   - Computes reading times and breadcrumbs.
 *   - Builds client-side full-text search index with weighted relevance scoring.
 *   - Generates sitemap.xml and robots.txt.
 *   - Emits standalone self-contained offline HTML documentation bundle.
 */

import {
  createId,
  type ArchitectureId,
  type DecisionId,
  type FlowId,
  type ObjectId,
  type PublicationId,
  type ViewId,
} from './ids';
import type { ArchitectureModel, View, Flow } from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import {
  exportArchitectureDocsAsCatalog,
  type ArchitectureDocCatalog,
  type DocGenerationContext,
} from './architecture-documentation';
import {
  renderMarkdownToHtml,
} from './markdown-editor';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PublicDocVisibility = 'public' | 'unlisted' | 'password_protected';
export type PublicDocStatus = 'draft' | 'published' | 'archived';

export interface PublicDocBranding {
  organizationName: string;
  primaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  supportEmail?: string;
}

export interface PublicDocSeo {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string;
  keywords: string[];
}

export interface CustomPublicDocPage {
  id: string;
  slug: string;
  title: string;
  category: string;
  markdown: string;
  order?: number;
}

export interface PublicDocContentConfig {
  includeOverview: boolean;
  includedObjectIds?: ObjectId[];
  includedAdrIds?: DecisionId[];
  includedViewIds?: ViewId[];
  includedFlowIds?: FlowId[];
  customPages?: CustomPublicDocPage[];
  enableSearch: boolean;
  allowDiagramInteractivity: boolean;
  allowPdfDownload: boolean;
  showBreadcrumbs: boolean;
}

export interface PublicDocVersionRecord {
  version: string;
  publishedAt: string;
  changelog?: string;
}

export interface PublicDocPublication {
  id: PublicationId;
  architectureId: ArchitectureId;
  slug: string;
  title: string;
  description: string;
  version: string;
  status: PublicDocStatus;
  visibility: PublicDocVisibility;
  passkey?: string; // Used when visibility === 'password_protected'
  branding: PublicDocBranding;
  seo: PublicDocSeo;
  contentConfig: PublicDocContentConfig;
  customDomain?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  expiresAt?: string; // ISO date string or undefined for indefinite
  viewCount: number;
  uniqueVisitors: number;
  lastViewedAt?: string;
  versionHistory: PublicDocVersionRecord[];
}

export interface PublicDocBreadcrumb {
  title: string;
  path: string;
  slug: string;
}

export type PublicSitePageCategory =
  | 'overview'
  | 'subsystem'
  | 'component'
  | 'adr'
  | 'view'
  | 'flow'
  | 'custom';

export interface PublicSiteDiagramEmbed {
  viewId: ViewId;
  title: string;
  nodeCount: number;
  connectionCount: number;
  previewSvg?: string;
}

export interface PublicSitePage {
  id: string;
  slug: string;
  title: string;
  category: PublicSitePageCategory;
  path: string;
  excerpt: string;
  content: string; // Markdown source
  html: string; // Semantic HTML
  breadcrumbs: PublicDocBreadcrumb[];
  tags: string[];
  readingTimeMinutes: number;
  diagramEmbed?: PublicSiteDiagramEmbed;
  metadata: Record<string, unknown>;
}

export interface PublicSiteNavItem {
  id: string;
  title: string;
  path: string;
  slug: string;
  kind?: string;
  badge?: string;
}

export interface PublicSiteNavSection {
  title: string;
  category: string;
  items: PublicSiteNavItem[];
}

export interface PublicDocSearchEntry {
  pageId: string;
  title: string;
  path: string;
  category: string;
  snippet: string;
  keywords: string[];
}

export interface PublicDocSearchResult {
  pageId: string;
  title: string;
  path: string;
  category: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
}

export interface PublicDocAccessVerification {
  allowed: boolean;
  requiresPasskey: boolean;
  reason: 'success' | 'not_published' | 'expired' | 'passkey_required' | 'invalid_passkey';
  publication?: PublicDocPublication;
}

export interface PublicSiteBundle {
  publicationId: PublicationId;
  title: string;
  description: string;
  version: string;
  baseUrl: string;
  branding: PublicDocBranding;
  navigation: PublicSiteNavSection[];
  pages: PublicSitePage[];
  searchIndex: PublicDocSearchEntry[];
  sitemapXml: string;
  robotsTxt: string;
  standaloneHtmlExport: string;
  generatedAt: string;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

export function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function generatePageExcerpt(markdown: string, maxLength = 160): string {
  const stripped = markdown
    .replace(/#+\s+.*?\n/g, '') // remove headings
    .replace(/:::[\s\S]*?:::/g, '') // remove directives
    .replace(/`{3}[\s\S]*?`{3}/g, '') // remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap links
    .replace(/[*_~`]/g, '') // remove inline formatting
    .replace(/\n+/g, ' ')
    .trim();

  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength).trim()}...`;
}

// ============================================================================
// Publication Management
// ============================================================================

export interface CreatePublicDocPublicationParams {
  architectureId: ArchitectureId;
  title: string;
  description?: string;
  slug?: string;
  version?: string;
  visibility?: PublicDocVisibility;
  passkey?: string;
  branding?: Partial<PublicDocBranding>;
  seo?: Partial<PublicDocSeo>;
  contentConfig?: Partial<PublicDocContentConfig>;
  customDomain?: string;
  expiresAt?: string;
}

/**
 * Creates a new public documentation publication initialized in 'draft' mode.
 */
export function createPublicDocPublication(
  params: CreatePublicDocPublicationParams,
): PublicDocPublication {
  const title = params.title.trim();
  if (!title) {
    throw new Error('Publication title cannot be empty');
  }

  const slug = params.slug ? slugify(params.slug) : slugify(title);
  const now = new Date().toISOString();
  const id = createId('pub');
  const version = params.version || '1.0.0';

  const branding: PublicDocBranding = {
    organizationName: params.branding?.organizationName || 'Architecture Team',
    primaryColor: params.branding?.primaryColor || '#2563eb',
    logoUrl: params.branding?.logoUrl,
    faviconUrl: params.branding?.faviconUrl,
    supportEmail: params.branding?.supportEmail,
  };

  const seo: PublicDocSeo = {
    metaTitle: params.seo?.metaTitle || `${title} | Architecture Documentation`,
    metaDescription:
      params.seo?.metaDescription ||
      params.description ||
      `Official system architecture documentation for ${title}.`,
    ogImageUrl: params.seo?.ogImageUrl,
    keywords: params.seo?.keywords || ['architecture', 'documentation', 'systems', 'design'],
  };

  const contentConfig: PublicDocContentConfig = {
    includeOverview: params.contentConfig?.includeOverview ?? true,
    includedObjectIds: params.contentConfig?.includedObjectIds,
    includedAdrIds: params.contentConfig?.includedAdrIds,
    includedViewIds: params.contentConfig?.includedViewIds,
    includedFlowIds: params.contentConfig?.includedFlowIds,
    customPages: params.contentConfig?.customPages || [],
    enableSearch: params.contentConfig?.enableSearch ?? true,
    allowDiagramInteractivity: params.contentConfig?.allowDiagramInteractivity ?? true,
    allowPdfDownload: params.contentConfig?.allowPdfDownload ?? true,
    showBreadcrumbs: params.contentConfig?.showBreadcrumbs ?? true,
  };

  return {
    id,
    architectureId: params.architectureId,
    slug,
    title,
    description: params.description || '',
    version,
    status: 'draft',
    visibility: params.visibility || 'public',
    passkey: params.passkey?.trim() || undefined,
    branding,
    seo,
    contentConfig,
    customDomain: params.customDomain?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    expiresAt: params.expiresAt,
    viewCount: 0,
    uniqueVisitors: 0,
    versionHistory: [],
  };
}

/**
 * Publishes a documentation publication, making it viewable to external readers.
 */
export function publishDocPublication(
  publication: PublicDocPublication,
  options?: {
    version?: string;
    changelog?: string;
    expiresAt?: string;
  },
): PublicDocPublication {
  const now = new Date().toISOString();
  const nextVersion = options?.version || publication.version;

  const versionRecord: PublicDocVersionRecord = {
    version: nextVersion,
    publishedAt: now,
    changelog: options?.changelog || 'Published updated architecture documentation.',
  };

  return {
    ...publication,
    status: 'published',
    version: nextVersion,
    publishedAt: now,
    updatedAt: now,
    expiresAt: options?.expiresAt !== undefined ? options.expiresAt : publication.expiresAt,
    versionHistory: [versionRecord, ...publication.versionHistory],
  };
}

/**
 * Unpublishes a public documentation site back to draft mode.
 */
export function unpublishDocPublication(
  publication: PublicDocPublication,
): PublicDocPublication {
  return {
    ...publication,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates publication metadata and settings.
 */
export function updatePublicDocPublication(
  publication: PublicDocPublication,
  updates: Partial<Omit<PublicDocPublication, 'id' | 'architectureId' | 'createdAt'>>,
): PublicDocPublication {
  const now = new Date().toISOString();
  return {
    ...publication,
    ...updates,
    slug: updates.slug ? slugify(updates.slug) : publication.slug,
    updatedAt: now,
  };
}

/**
 * Increments page view counters.
 */
export function recordPublicDocView(
  publication: PublicDocPublication,
  options?: { isNewVisitor?: boolean },
): PublicDocPublication {
  return {
    ...publication,
    viewCount: publication.viewCount + 1,
    uniqueVisitors: options?.isNewVisitor ? publication.uniqueVisitors + 1 : publication.uniqueVisitors,
    lastViewedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Access Verification (External Readers Without Account)
// ============================================================================

export interface PublicDocAccessRequest {
  passkey?: string;
  token?: string;
}

/**
 * Verifies whether an external reader (with NO account or authentication) can view the docs.
 */
export function verifyPublicDocAccess(
  publication: PublicDocPublication,
  request?: PublicDocAccessRequest,
): PublicDocAccessVerification {
  // 1. Status Check
  if (publication.status !== 'published') {
    return {
      allowed: false,
      requiresPasskey: false,
      reason: 'not_published',
      publication,
    };
  }

  // 2. Expiration Check
  if (publication.expiresAt) {
    const expiresTime = new Date(publication.expiresAt).getTime();
    if (Date.now() > expiresTime) {
      return {
        allowed: false,
        requiresPasskey: false,
        reason: 'expired',
        publication,
      };
    }
  }

  // 3. Visibility Check
  if (publication.visibility === 'public') {
    // Open to everyone without login
    return {
      allowed: true,
      requiresPasskey: false,
      reason: 'success',
      publication,
    };
  }

  if (publication.visibility === 'unlisted') {
    // Accessible anonymously via secret slug/link
    return {
      allowed: true,
      requiresPasskey: false,
      reason: 'success',
      publication,
    };
  }

  if (publication.visibility === 'password_protected') {
    if (!request?.passkey) {
      return {
        allowed: false,
        requiresPasskey: true,
        reason: 'passkey_required',
        publication,
      };
    }

    if (request.passkey !== publication.passkey) {
      return {
        allowed: false,
        requiresPasskey: true,
        reason: 'invalid_passkey',
        publication,
      };
    }

    return {
      allowed: true,
      requiresPasskey: true,
      reason: 'success',
      publication,
    };
  }

  return {
    allowed: false,
    requiresPasskey: false,
    reason: 'not_published',
    publication,
  };
}

/**
 * Generates the public share URL for external readers.
 */
export function generatePublicShareUrl(
  publication: PublicDocPublication,
  baseUrl = 'https://diagramhq.com',
): string {
  if (publication.customDomain) {
    return `https://${publication.customDomain}/docs/${publication.slug}`;
  }
  return `${baseUrl.replace(/\/$/, '')}/docs/pub/${publication.slug}`;
}

// ============================================================================
// Public Site Compiler & Bundle Engine
// ============================================================================

export interface CompilePublicSiteOptions {
  baseUrl?: string;
  views?: View[];
  flows?: Flow[];
  adrs?: ArchitectureDecisionRecord[];
}

/**
 * Compiles an entire public documentation site bundle from the model and settings.
 */
export function compilePublicSiteBundle(
  publication: PublicDocPublication,
  model: ArchitectureModel,
  options?: CompilePublicSiteOptions,
): PublicSiteBundle {
  const baseUrl = options?.baseUrl || 'https://diagramhq.com';
  const siteUrl = generatePublicShareUrl(publication, baseUrl);

  const context: DocGenerationContext = {
    views: options?.views,
    flows: options?.flows,
    adrs: options?.adrs,
  };

  // 1. Export standard architecture doc catalog
  const catalog: ArchitectureDocCatalog = exportArchitectureDocsAsCatalog(model, context);

  const pages: PublicSitePage[] = [];
  const searchIndex: PublicDocSearchEntry[] = [];
  const navSections: PublicSiteNavSection[] = [];

  // Helper to register page and search index
  function registerPage(page: PublicSitePage, sectionTitle: string, sectionCategory: string) {
    pages.push(page);
    searchIndex.push({
      pageId: page.id,
      title: page.title,
      path: page.path,
      category: page.category,
      snippet: page.excerpt,
      keywords: page.tags,
    });

    let section = navSections.find((s) => s.category === sectionCategory);
    if (!section) {
      section = { title: sectionTitle, category: sectionCategory, items: [] };
      navSections.push(section);
    }
    section.items.push({
      id: page.id,
      title: page.title,
      path: page.path,
      slug: page.slug,
      kind: page.metadata.kind as string | undefined,
      badge: page.category === 'adr' ? (page.metadata.status as string) : undefined,
    });
  }

  // 2. Overview Page
  if (publication.contentConfig.includeOverview) {
    const overviewDoc = catalog.overviewPage;
    const overviewMarkdown = overviewDoc.markdown;
    const overviewHtml = renderMarkdownToHtml(overviewMarkdown, model, context);

    const overviewPage: PublicSitePage = {
      id: 'doc-overview',
      slug: 'overview',
      title: `${publication.title} Overview`,
      category: 'overview',
      path: `/docs/pub/${publication.slug}/overview`,
      excerpt: generatePageExcerpt(overviewMarkdown),
      content: overviewMarkdown,
      html: overviewHtml,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: 'Overview', path: `/docs/pub/${publication.slug}/overview`, slug: 'overview' },
      ],
      tags: ['overview', 'system', 'architecture'],
      readingTimeMinutes: estimateReadingTime(overviewMarkdown),
      metadata: {
        totalObjects: model.objects.length,
        totalConnections: model.connections.length,
      },
    };

    registerPage(overviewPage, 'Getting Started', 'overview');
  }

  // 3. Object Doc Pages (Subsystems & Components)
  const allowedObjectIds = publication.contentConfig.includedObjectIds;
  const filteredObjectPages = catalog.objectPages.filter((page) => {
    if (!allowedObjectIds || allowedObjectIds.length === 0) return true;
    return page.objectId ? allowedObjectIds.includes(page.objectId) : true;
  });

  // Group objects into subsystems / systems and components
  for (const objPage of filteredObjectPages) {
    const html = renderMarkdownToHtml(objPage.markdown, model, context);
    const isContainerOrSystem = objPage.kind === 'system' || objPage.kind === 'application';
    const category: PublicSitePageCategory = isContainerOrSystem ? 'subsystem' : 'component';
    const sectionTitle = isContainerOrSystem ? 'Systems & Subsystems' : 'Components & Services';

    const page: PublicSitePage = {
      id: objPage.id,
      slug: objPage.slug,
      title: objPage.title,
      category,
      path: `/docs/pub/${publication.slug}/entities/${objPage.slug}`,
      excerpt: generatePageExcerpt(objPage.markdown),
      content: objPage.markdown,
      html,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: sectionTitle, path: `/docs/pub/${publication.slug}/entities`, slug: 'entities' },
        { title: objPage.title, path: `/docs/pub/${publication.slug}/entities/${objPage.slug}`, slug: objPage.slug },
      ],
      tags: [objPage.kind, objPage.metadata.technology || '', ...objPage.metadata.tags].filter(Boolean),
      readingTimeMinutes: estimateReadingTime(objPage.markdown),
      metadata: {
        objectId: objPage.objectId,
        kind: objPage.kind,
        technology: objPage.metadata.technology,
        owner: objPage.metadata.owner,
        status: objPage.metadata.status,
      },
    };

    registerPage(page, sectionTitle, category);
  }

  // 4. Architecture Decision Records (ADRs)
  const adrs = options?.adrs || [];
  const allowedAdrIds = publication.contentConfig.includedAdrIds;
  const filteredAdrs = adrs.filter((adr) => {
    if (!allowedAdrIds || allowedAdrIds.length === 0) return true;
    return allowedAdrIds.includes(adr.id);
  });

  for (const adr of filteredAdrs) {
    const adrMarkdown = [
      `# ADR-${adr.number}: ${adr.title}`,
      '',
      `**Status**: \`${adr.status.toUpperCase()}\` • **Date**: ${adr.createdAt ? new Date(adr.createdAt).toISOString().split('T')[0] : 'N/A'}`,
      '',
      '## Context',
      adr.context || 'No context specified.',
      '',
      '## Decision',
      adr.decision || 'No decision rationale specified.',
      '',
      '## Consequences',
      adr.consequences || 'No consequences documented.',
    ].join('\n');

    const html = renderMarkdownToHtml(adrMarkdown, model, context);
    const slug = `adr-${adr.number}-${slugify(adr.title)}`;

    const page: PublicSitePage = {
      id: `page-adr-${adr.id}`,
      slug,
      title: `ADR-${adr.number}: ${adr.title}`,
      category: 'adr',
      path: `/docs/pub/${publication.slug}/adrs/${slug}`,
      excerpt: generatePageExcerpt(adrMarkdown),
      content: adrMarkdown,
      html,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: 'Architecture Decisions', path: `/docs/pub/${publication.slug}/adrs`, slug: 'adrs' },
        { title: `ADR-${adr.number}`, path: `/docs/pub/${publication.slug}/adrs/${slug}`, slug },
      ],
      tags: ['adr', adr.status],
      readingTimeMinutes: estimateReadingTime(adrMarkdown),
      metadata: {
        adrId: adr.id,
        number: adr.number,
        status: adr.status,
      },
    };

    registerPage(page, 'Architecture Decisions (ADRs)', 'adr');
  }

  // 5. Views & Diagrams
  const views = options?.views || [];
  const allowedViewIds = publication.contentConfig.includedViewIds;
  const filteredViews = views.filter((v) => {
    if (!allowedViewIds || allowedViewIds.length === 0) return true;
    return allowedViewIds.includes(v.id);
  });

  for (const view of filteredViews) {
    const rawView = view as unknown as { nodes?: unknown[]; description?: string };
    const nodeCount = rawView.nodes?.length || 0;
    const viewMarkdown = [
      `# Diagram View: ${view.name}`,
      '',
      `**Kind**: \`${view.kind}\`${nodeCount > 0 ? ` • **Nodes**: ${nodeCount}` : ''}`,
      '',
      rawView.description || `Architectural view displaying diagram components for ${view.name}.`,
      '',
      `:::diagram[${view.id}]{title="${view.name}" kind="${view.kind}"}:::`,
    ].join('\n');

    const html = renderMarkdownToHtml(viewMarkdown, model, context);
    const slug = slugify(view.name);

    const page: PublicSitePage = {
      id: `page-view-${view.id}`,
      slug,
      title: view.name,
      category: 'view',
      path: `/docs/pub/${publication.slug}/diagrams/${slug}`,
      excerpt: generatePageExcerpt(viewMarkdown),
      content: viewMarkdown,
      html,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: 'Diagram Views', path: `/docs/pub/${publication.slug}/diagrams`, slug: 'diagrams' },
        { title: view.name, path: `/docs/pub/${publication.slug}/diagrams/${slug}`, slug },
      ],
      tags: ['view', view.kind],
      readingTimeMinutes: 1,
      diagramEmbed: {
        viewId: view.id,
        title: view.name,
        nodeCount,
        connectionCount: 0,
      },
      metadata: {
        viewId: view.id,
        kind: view.kind,
        nodeCount,
      },
    };

    registerPage(page, 'Diagrams & Architecture Views', 'view');
  }

  // 6. Execution Flows
  const flows = options?.flows || [];
  const allowedFlowIds = publication.contentConfig.includedFlowIds;
  const filteredFlows = flows.filter((f) => {
    if (!allowedFlowIds || allowedFlowIds.length === 0) return true;
    return allowedFlowIds.includes(f.id);
  });

  for (const flow of filteredFlows) {
    const stepCount = (flow as unknown as { steps?: unknown[] }).steps?.length || 0;
    const flowMarkdown = [
      `# Execution Flow: ${flow.name}`,
      '',
      `**Type**: \`${flow.type}\` • **Steps**: ${stepCount}`,
      '',
      flow.description || `End-to-end execution flow representing ${flow.name}.`,
      '',
      `:::flow[${flow.id}]{title="${flow.name}" type="${flow.type}"}:::`,
    ].join('\n');

    const html = renderMarkdownToHtml(flowMarkdown, model, context);
    const slug = slugify(flow.name);

    const page: PublicSitePage = {
      id: `page-flow-${flow.id}`,
      slug,
      title: flow.name,
      category: 'flow',
      path: `/docs/pub/${publication.slug}/flows/${slug}`,
      excerpt: generatePageExcerpt(flowMarkdown),
      content: flowMarkdown,
      html,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: 'Execution Flows', path: `/docs/pub/${publication.slug}/flows`, slug: 'flows' },
        { title: flow.name, path: `/docs/pub/${publication.slug}/flows/${slug}`, slug },
      ],
      tags: ['flow', flow.type || 'flow'],
      readingTimeMinutes: 1,
      metadata: {
        flowId: flow.id,
        type: flow.type,
      },
    };

    registerPage(page, 'Execution Flows', 'flow');
  }

  // 7. Custom Markdown Pages (if configured)
  const customPages = publication.contentConfig.customPages || [];
  for (const cp of customPages) {
    const html = renderMarkdownToHtml(cp.markdown, model, context);

    const page: PublicSitePage = {
      id: cp.id,
      slug: cp.slug,
      title: cp.title,
      category: 'custom',
      path: `/docs/pub/${publication.slug}/guides/${cp.slug}`,
      excerpt: generatePageExcerpt(cp.markdown),
      content: cp.markdown,
      html,
      breadcrumbs: [
        { title: 'Documentation', path: `/docs/pub/${publication.slug}`, slug: publication.slug },
        { title: cp.category || 'Guides', path: `/docs/pub/${publication.slug}/guides`, slug: 'guides' },
        { title: cp.title, path: `/docs/pub/${publication.slug}/guides/${cp.slug}`, slug: cp.slug },
      ],
      tags: ['guide', cp.category],
      readingTimeMinutes: estimateReadingTime(cp.markdown),
      metadata: {
        order: cp.order,
      },
    };

    registerPage(page, cp.category || 'Architecture Guides', 'custom');
  }

  // 8. Sitemap XML
  const nowIso = new Date().toISOString().split('T')[0];
  const sitemapLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url>`,
    `    <loc>${siteUrl}</loc>`,
    `    <lastmod>${nowIso}</lastmod>`,
    `    <changefreq>weekly</changefreq>`,
    `    <priority>1.0</priority>`,
    `  </url>`,
    ...pages.map(
      (p) => `  <url>
    <loc>${baseUrl.replace(/\/$/, '')}${p.path}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ),
    '</urlset>',
  ];
  const sitemapXml = sitemapLines.join('\n');

  // 9. Robots.txt
  const robotsTxt = [
    'User-agent: *',
    publication.visibility === 'public' ? 'Allow: /' : 'Disallow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n');

  // 10. Standalone HTML Export
  const bundleWithoutExport: Omit<PublicSiteBundle, 'standaloneHtmlExport'> = {
    publicationId: publication.id,
    title: publication.title,
    description: publication.description,
    version: publication.version,
    baseUrl,
    branding: publication.branding,
    navigation: navSections,
    pages,
    searchIndex,
    sitemapXml,
    robotsTxt,
    generatedAt: new Date().toISOString(),
  };

  const standaloneHtmlExport = renderStandalonePublicSiteHtml(bundleWithoutExport);

  return {
    ...bundleWithoutExport,
    standaloneHtmlExport,
  };
}

// ============================================================================
// Client-Side Search Engine
// ============================================================================

/**
 * Searches the public documentation bundle with weighted ranking.
 */
export function searchPublicSite(
  bundle: PublicSiteBundle,
  query: string,
): PublicDocSearchResult[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  const results: PublicDocSearchResult[] = [];

  for (const entry of bundle.searchIndex) {
    const titleLower = entry.title.toLowerCase();
    const snippetLower = entry.snippet.toLowerCase();
    const keywordsLower = entry.keywords.map((k) => k.toLowerCase());

    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of terms) {
      let termMatched = false;

      // Exact title match: 100 points
      if (titleLower === term) {
        score += 100;
        termMatched = true;
      } else if (titleLower.includes(term)) {
        score += 50;
        termMatched = true;
      }

      // Keywords match: 30 points
      if (keywordsLower.some((k) => k.includes(term))) {
        score += 30;
        termMatched = true;
      }

      // Snippet / content body match: 15 points
      if (snippetLower.includes(term)) {
        score += 15;
        termMatched = true;
      }

      if (termMatched) {
        matchedTerms.push(term);
      }
    }

    if (score > 0) {
      results.push({
        pageId: entry.pageId,
        title: entry.title,
        path: entry.path,
        category: entry.category,
        snippet: entry.snippet,
        score,
        matchedTerms,
      });
    }
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

// ============================================================================
// Standalone HTML Renderer
// ============================================================================

/**
 * Produces a self-contained single-page responsive HTML document
 * containing the entire public documentation site with offline search and navigation.
 */
export function renderStandalonePublicSiteHtml(bundle: Omit<PublicSiteBundle, 'standaloneHtmlExport'> | PublicSiteBundle): string {
  const navHtml = bundle.navigation
    .map((sec) => {
      const items = sec.items
        .map(
          (item) =>
            `<li><a href="#${item.id}" class="nav-link" data-page-id="${item.id}">${item.title}${item.badge ? ` <span class="badge">${item.badge}</span>` : ''}</a></li>`,
        )
        .join('');
      return `<div class="nav-section"><div class="nav-title">${sec.title}</div><ul class="nav-list">${items}</ul></div>`;
    })
    .join('');

  const pagesJson = JSON.stringify(bundle.pages).replace(/</g, '\\u003c');
  const initialPage = bundle.pages[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bundle.title} - Architecture Documentation</title>
  <style>
    :root {
      --primary: ${bundle.branding.primaryColor || '#2563eb'};
      --bg: #ffffff;
      --bg-alt: #f8fafc;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --sidebar-width: 280px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #090d16;
        --bg-alt: #131b2e;
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --border: #1e293b;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); display: flex; flex-direction: column; min-height: 100vh; line-height: 1.6; }
    header { height: 60px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: var(--bg-alt); position: sticky; top: 0; z-index: 10; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.1rem; }
    .brand-pill { background: var(--primary); color: white; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .search-box { width: 320px; }
    .search-input { width: 100%; padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.875rem; outline: none; }
    .search-input:focus { border-color: var(--primary); ring: 2px var(--primary); }
    .layout { display: flex; flex: 1; }
    aside { width: var(--sidebar-width); border-right: 1px solid var(--border); background: var(--bg-alt); padding: 20px 16px; overflow-y: auto; height: calc(100vh - 60px); position: sticky; top: 60px; }
    .nav-section { margin-bottom: 24px; }
    .nav-title { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; padding-left: 8px; }
    .nav-list { list-style: none; }
    .nav-link { display: block; padding: 6px 12px; border-radius: 6px; color: var(--text); text-decoration: none; font-size: 0.875rem; transition: background 0.15s; }
    .nav-link:hover, .nav-link.active { background: rgba(37, 99, 235, 0.1); color: var(--primary); font-weight: 600; }
    .badge { font-size: 0.7rem; background: var(--border); padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
    main { flex: 1; padding: 40px 48px; max-width: 900px; margin: 0 auto; }
    .breadcrumbs { display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px; }
    .article-header { margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    .article-title { font-size: 2.25rem; font-weight: 800; line-height: 1.25; margin-bottom: 12px; }
    .meta-bar { display: flex; gap: 16px; font-size: 0.85rem; color: var(--text-muted); }
    .content-body { font-size: 1rem; }
    .content-body h1, .content-body h2, .content-body h3 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
    .content-body p { margin-bottom: 1.2em; }
    .content-body pre { background: var(--bg-alt); border: 1px solid var(--border); padding: 16px; border-radius: 8px; overflow-x: auto; margin-bottom: 1.5em; font-family: monospace; font-size: 0.9rem; }
    .content-body table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
    .content-body th, .content-body td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
    .content-body th { background: var(--bg-alt); font-weight: 600; }
    .diagram-card { border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: var(--bg-alt); margin: 24px 0; text-align: center; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>${bundle.branding.organizationName}</span>
      <span class="brand-pill">Docs v${bundle.version}</span>
    </div>
    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="Search architecture docs..." />
    </div>
  </header>
  <div class="layout">
    <aside>
      ${navHtml}
    </aside>
    <main id="contentContainer">
      <div class="breadcrumbs" id="crumbContainer">
        ${initialPage?.breadcrumbs.map((b) => `<span>${b.title}</span>`).join(' &rsaquo; ') || 'Docs'}
      </div>
      <article>
        <header class="article-header">
          <h1 class="article-title" id="pageTitle">${initialPage?.title || bundle.title}</h1>
          <div class="meta-bar">
            <span>Reading time: ${initialPage?.readingTimeMinutes || 1} min</span>
            <span>Category: ${initialPage?.category || 'General'}</span>
          </div>
        </header>
        <div class="content-body" id="pageContent">
          ${initialPage?.html || '<p>Select a document from the navigation sidebar.</p>'}
        </div>
      </article>
    </main>
  </div>
  <script>
    const pages = ${pagesJson};
    function showPage(pageId) {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;
      document.getElementById('pageTitle').textContent = page.title;
      document.getElementById('pageContent').innerHTML = page.html;
      document.getElementById('crumbContainer').innerHTML = page.breadcrumbs.map(b => '<span>' + b.title + '</span>').join(' &rsaquo; ');
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page-id') === pageId);
      });
    }
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page-id');
        showPage(pageId);
      });
    });
  </script>
</body>
</html>`;
}
