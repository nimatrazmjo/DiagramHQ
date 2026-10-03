/**
 * DiagramHQ - Architecture Documentation Domain Engine (F092)
 *
 * Model-first architecture documentation engine transforming architecture models
 * into structured, living documentation:
 * - Architecture doc tree (`buildArchitectureDocTree`): hierarchical navigation tree
 *   respecting parent-child container relationships, depths, paths, and connection counts.
 * - Object documentation page generator (`generateObjectDocPage`): compiles rich,
 *   grounded doc pages from object metadata, inbound caller connections, outbound
 *   dependencies, contained hierarchy, associated views, flows, and ADRs.
 * - Architecture overview documentation generator (`generateArchitectureOverviewDocPage`):
 *   system-level documentation page synthesizing high-level architecture stats,
 *   technologies, and subsystem hierarchy.
 * - Markdown synthesis (`renderDocPageToMarkdown`): serializes documentation pages
 *   to clean, professional GitHub Flavored Markdown with tables and matrices.
 * - Doc catalog export (`exportArchitectureDocsAsCatalog`): compiles the entire tree
 *   and all doc pages for downstream portals or public documentation generators.
 */

import type {
  ArchitectureModel,
  ConnectionKind,
  Flow,
  FlowType,
  FlowWithSteps,
  ModelObject,
  ObjectKind,
  View,
  ViewKind,
} from './types';
import type { ConnectionId, FlowId, ObjectId, ViewId } from './ids';
import type { ArchitectureDecisionRecord } from './adrs';
import type { Team, ObjectOwnership } from './teams';
import type { ObjectMetadataSchema } from './object-metadata';

// ============================================================================
// Core Documentation Types
// ============================================================================

export interface DocBreadcrumb {
  readonly id: string;
  readonly objectId?: ObjectId;
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly kind: ObjectKind | 'architecture';
}

export interface DocTreeNode {
  readonly id: string;
  readonly objectId?: ObjectId;
  readonly slug: string;
  readonly path: string;
  readonly title: string;
  readonly kind: ObjectKind | 'architecture';
  readonly description?: string;
  readonly technology?: string;
  readonly owner?: string;
  readonly status?: string;
  readonly depth: number;
  readonly inboundCount: number;
  readonly outboundCount: number;
  readonly children: DocTreeNode[];
}

export interface ArchitectureDocTree {
  readonly root: DocTreeNode;
  readonly totalNodes: number;
  readonly totalObjects: number;
  readonly maxDepth: number;
  readonly generatedAt: string;
}

export interface DocInboundConnection {
  readonly connectionId: ConnectionId;
  readonly sourceId: ObjectId;
  readonly sourceName: string;
  readonly sourceKind: ObjectKind;
  readonly label?: string;
  readonly description?: string;
  readonly kind: ConnectionKind;
  readonly protocol?: string;
  readonly technology?: string;
}

export interface DocOutboundConnection {
  readonly connectionId: ConnectionId;
  readonly targetId: ObjectId;
  readonly targetName: string;
  readonly targetKind: ObjectKind;
  readonly label?: string;
  readonly description?: string;
  readonly kind: ConnectionKind;
  readonly protocol?: string;
  readonly technology?: string;
}

export interface DocChildObject {
  readonly objectId: ObjectId;
  readonly name: string;
  readonly kind: ObjectKind;
  readonly description?: string;
  readonly technology?: string;
  readonly status?: string;
}

export interface DocAssociatedView {
  readonly viewId: ViewId;
  readonly name: string;
  readonly kind: ViewKind;
}

export interface DocAssociatedFlow {
  readonly flowId: FlowId;
  readonly name: string;
  readonly type?: FlowType;
  readonly description?: string;
  readonly role: 'actor' | 'source' | 'target' | 'participant';
}

export interface DocAssociatedAdr {
  readonly adrId: string;
  readonly number: number;
  readonly title: string;
  readonly status: string;
  readonly date?: string;
}

export interface ArchitectureDocSection {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface ObjectDocMetadata {
  readonly owner?: string;
  readonly team?: string;
  readonly technology?: string;
  readonly status: string;
  readonly environment?: string;
  readonly domain?: string;
  readonly criticality?: string;
  readonly dataClassification?: string;
  readonly repositoryUrl?: string;
  readonly documentationUrl?: string;
  readonly sla?: string;
  readonly rto?: string;
  readonly rpo?: string;
  readonly tags: string[];
  readonly compliance: string[];
  readonly customFields: Record<string, string | number | boolean>;
}

export interface ObjectDocPage {
  readonly id: string;
  readonly objectId?: ObjectId;
  readonly slug: string;
  readonly path: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly kind: ObjectKind | 'architecture';
  readonly description: string;
  readonly parent?: {
    readonly id: ObjectId;
    readonly name: string;
    readonly kind: ObjectKind;
  };
  readonly breadcrumbs: DocBreadcrumb[];
  readonly metadata: ObjectDocMetadata;
  readonly inboundConnections: DocInboundConnection[];
  readonly outboundConnections: DocOutboundConnection[];
  readonly children: DocChildObject[];
  readonly associatedViews: DocAssociatedView[];
  readonly associatedFlows: DocAssociatedFlow[];
  readonly associatedAdrs: DocAssociatedAdr[];
  readonly sections: ArchitectureDocSection[];
  readonly markdown: string;
  readonly generatedAt: string;
}

export interface DocTreeOptions {
  readonly rootTitle?: string;
  readonly includeOrphans?: boolean;
}

export interface DocGenerationContext {
  readonly views?: View[];
  readonly flows?: Flow[];
  readonly flowsWithSteps?: FlowWithSteps[];
  readonly adrs?: ArchitectureDecisionRecord[];
  readonly teams?: Team[];
  readonly ownerships?: ObjectOwnership[];
  readonly metadataMap?: Record<string, ObjectMetadataSchema>;
}

export interface ArchitectureDocCatalog {
  readonly architectureId: string;
  readonly architectureName: string;
  readonly tree: ArchitectureDocTree;
  readonly overviewPage: ObjectDocPage;
  readonly objectPages: ObjectDocPage[];
  readonly generatedAt: string;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export function slugifyDocName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'doc';
}

function extractMetadataField<T = string>(
  raw: Record<string, unknown> | undefined,
  field: string,
): T | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const val = raw[field];
  return val !== undefined && val !== null ? (val as T) : undefined;
}

// ============================================================================
// Architecture Doc Tree Builder
// ============================================================================

/**
 * Builds a hierarchical navigation tree of all architecture objects.
 * Top-level objects are placed directly under the Architecture root node,
 * while child objects (via `parentId`) are nested recursively under their parents.
 */
export function buildArchitectureDocTree(
  model: ArchitectureModel,
  options?: DocTreeOptions,
): ArchitectureDocTree {
  const rootTitle = options?.rootTitle || model.architecture.name || 'Architecture';
  const rootSlug = slugifyDocName(rootTitle);
  const rootPath = `/docs/${rootSlug}`;

  // Pre-index objects and connections
  const objectMap = new Map<ObjectId, ModelObject>();
  const childrenMap = new Map<ObjectId, ModelObject[]>();
  const inboundCountMap = new Map<ObjectId, number>();
  const outboundCountMap = new Map<ObjectId, number>();

  for (const obj of model.objects) {
    objectMap.set(obj.id, obj);
    inboundCountMap.set(obj.id, 0);
    outboundCountMap.set(obj.id, 0);
  }

  for (const conn of model.connections) {
    if (inboundCountMap.has(conn.targetObjectId)) {
      inboundCountMap.set(
        conn.targetObjectId,
        (inboundCountMap.get(conn.targetObjectId) || 0) + 1,
      );
    }
    if (outboundCountMap.has(conn.sourceObjectId)) {
      outboundCountMap.set(
        conn.sourceObjectId,
        (outboundCountMap.get(conn.sourceObjectId) || 0) + 1,
      );
    }
  }

  const topLevelObjects: ModelObject[] = [];

  for (const obj of model.objects) {
    if (!obj.parentId || !objectMap.has(obj.parentId)) {
      topLevelObjects.push(obj);
    } else {
      const list = childrenMap.get(obj.parentId) || [];
      list.push(obj);
      childrenMap.set(obj.parentId, list);
    }
  }

  let totalNodes = 1; // root node
  let maxDepth = 0;

  function buildNode(
    obj: ModelObject,
    parentPath: string,
    currentDepth: number,
    visited: Set<ObjectId>,
  ): DocTreeNode {
    totalNodes++;
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(obj.id);

    const slug = slugifyDocName(obj.name);
    const path = `${parentPath}/${slug}`;
    const rawMeta = obj.metadata as Record<string, unknown> | undefined;

    const rawChildren = childrenMap.get(obj.id) || [];
    // Cycle breaker: ignore child if already in ancestor visited chain
    const validChildren = rawChildren.filter((c) => !nextVisited.has(c.id));

    const children = validChildren.map((child) =>
      buildNode(child, path, currentDepth + 1, nextVisited),
    );

    return {
      id: `doc-${obj.id}`,
      objectId: obj.id,
      slug,
      path,
      title: obj.name,
      kind: obj.kind,
      description: obj.description || undefined,
      technology: extractMetadataField<string>(rawMeta, 'technology'),
      owner: extractMetadataField<string>(rawMeta, 'owner') || extractMetadataField<string>(rawMeta, 'team'),
      status: extractMetadataField<string>(rawMeta, 'status') || extractMetadataField<string>(rawMeta, 'lifecycle') || 'active',
      depth: currentDepth,
      inboundCount: inboundCountMap.get(obj.id) || 0,
      outboundCount: outboundCountMap.get(obj.id) || 0,
      children,
    };
  }

  const rootChildren = topLevelObjects.map((obj) =>
    buildNode(obj, rootPath, 1, new Set()),
  );

  const root: DocTreeNode = {
    id: 'architecture-root',
    slug: rootSlug,
    path: rootPath,
    title: rootTitle,
    kind: 'architecture',
    description: model.architecture.description || undefined,
    depth: 0,
    inboundCount: 0,
    outboundCount: 0,
    children: rootChildren,
  };

  return {
    root,
    totalNodes,
    totalObjects: model.objects.length,
    maxDepth,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Finds a tree node by object ID or node ID in an ArchitectureDocTree.
 */
export function findDocTreeNode(
  tree: ArchitectureDocTree,
  objectIdOrId: string,
): DocTreeNode | undefined {
  function search(node: DocTreeNode): DocTreeNode | undefined {
    if (node.id === objectIdOrId || node.objectId === objectIdOrId) {
      return node;
    }
    for (const child of node.children) {
      const found = search(child);
      if (found) return found;
    }
    return undefined;
  }
  return search(tree.root);
}

/**
 * Flattens the entire doc tree into a linear list of nodes with their depths and paths.
 */
export function flattenDocTree(tree: ArchitectureDocTree): DocTreeNode[] {
  const result: DocTreeNode[] = [];
  function traverse(node: DocTreeNode) {
    result.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }
  traverse(tree.root);
  return result;
}

/**
 * Computes the breadcrumb trail from the architecture root to a given object.
 */
export function getDocBreadcrumbs(
  tree: ArchitectureDocTree,
  objectId: ObjectId,
): DocBreadcrumb[] {
  const path: DocBreadcrumb[] = [];

  function findPath(node: DocTreeNode): boolean {
    path.push({
      id: node.id,
      objectId: node.objectId,
      title: node.title,
      slug: node.slug,
      path: node.path,
      kind: node.kind,
    });

    if (node.objectId === objectId) {
      return true;
    }

    for (const child of node.children) {
      if (findPath(child)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  findPath(tree.root);
  return path;
}

/**
 * Searches the doc tree by title, description, technology, or tag.
 */
export function searchDocTree(
  tree: ArchitectureDocTree,
  query: string,
): DocTreeNode[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return flattenDocTree(tree);

  const flat = flattenDocTree(tree);
  return flat.filter((node) => {
    return (
      node.title.toLowerCase().includes(cleanQuery) ||
      (node.description && node.description.toLowerCase().includes(cleanQuery)) ||
      (node.technology && node.technology.toLowerCase().includes(cleanQuery)) ||
      (node.owner && node.owner.toLowerCase().includes(cleanQuery)) ||
      node.kind.toLowerCase().includes(cleanQuery)
    );
  });
}

// ============================================================================
// Object Documentation Page Generator
// ============================================================================

/**
 * Generates a comprehensive, living documentation page for any architecture object
 * from its metadata and connection graph.
 */
export function generateObjectDocPage(
  objectId: ObjectId,
  model: ArchitectureModel,
  context?: DocGenerationContext,
): ObjectDocPage {
  const obj = model.objects.find((o) => o.id === objectId);
  if (!obj) {
    throw new Error(`Cannot generate documentation page: object '${objectId}' not found in model.`);
  }

  const rawMeta = (obj.metadata || {}) as Record<string, unknown>;
  const explicitMeta = context?.metadataMap?.[objectId];

  // Resolve Parent Object
  let parentInfo: { id: ObjectId; name: string; kind: ObjectKind } | undefined = undefined;
  if (obj.parentId) {
    const parentObj = model.objects.find((o) => o.id === obj.parentId);
    if (parentObj) {
      parentInfo = {
        id: parentObj.id,
        name: parentObj.name,
        kind: parentObj.kind,
      };
    }
  }

  // Build Breadcrumbs
  const tree = buildArchitectureDocTree(model);
  const breadcrumbs = getDocBreadcrumbs(tree, objectId);

  // Resolve Team / Ownership
  let resolvedOwner =
    explicitMeta?.owner ||
    extractMetadataField<string>(rawMeta, 'owner') ||
    explicitMeta?.team ||
    extractMetadataField<string>(rawMeta, 'team');

  let resolvedTeam =
    explicitMeta?.team ||
    extractMetadataField<string>(rawMeta, 'team');

  if (context?.ownerships && context.teams) {
    const ownership = context.ownerships.find((own) => own.objectId === objectId);
    if (ownership) {
      const primaryTeam = context.teams.find((t) => t.id === ownership.primaryTeamId);
      if (primaryTeam) {
        resolvedTeam = primaryTeam.name;
        if (!resolvedOwner) resolvedOwner = primaryTeam.name;
      }
    }
  }

  // Parse Metadata
  const tagsRaw = explicitMeta?.tags || rawMeta['tags'];
  const tags: string[] = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : [];

  const complianceRaw = explicitMeta?.compliance || rawMeta['compliance'];
  const compliance: string[] = Array.isArray(complianceRaw)
    ? complianceRaw.map(String)
    : [];

  const customFields: Record<string, string | number | boolean> = {};
  const standardKeys = new Set([
    'name',
    'description',
    'caption',
    'owner',
    'team',
    'technology',
    'status',
    'environment',
    'domain',
    'criticality',
    'dataClassification',
    'compliance',
    'tags',
    'repository',
    'repositoryUrl',
    'documentation',
    'documentationUrl',
    'sla',
    'rto',
    'rpo',
    'lifecycle',
    'version',
  ]);

  for (const [key, val] of Object.entries(rawMeta)) {
    if (!standardKeys.has(key) && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) {
      customFields[key] = val;
    }
  }

  const metadata: ObjectDocMetadata = {
    owner: resolvedOwner,
    team: resolvedTeam,
    technology: explicitMeta?.technology || extractMetadataField<string>(rawMeta, 'technology'),
    status:
      explicitMeta?.status ||
      extractMetadataField<string>(rawMeta, 'status') ||
      extractMetadataField<string>(rawMeta, 'lifecycle') ||
      'active',
    environment: explicitMeta?.environment || extractMetadataField<string>(rawMeta, 'environment'),
    domain: explicitMeta?.domain || extractMetadataField<string>(rawMeta, 'domain'),
    criticality: explicitMeta?.criticality || extractMetadataField<string>(rawMeta, 'criticality'),
    dataClassification:
      explicitMeta?.dataClassification ||
      extractMetadataField<string>(rawMeta, 'dataClassification'),
    repositoryUrl:
      explicitMeta?.repository ||
      extractMetadataField<string>(rawMeta, 'repository') ||
      extractMetadataField<string>(rawMeta, 'repositoryUrl'),
    documentationUrl:
      explicitMeta?.documentation ||
      extractMetadataField<string>(rawMeta, 'documentation') ||
      extractMetadataField<string>(rawMeta, 'documentationUrl'),
    sla: explicitMeta?.sla || extractMetadataField<string>(rawMeta, 'sla'),
    rto: explicitMeta?.rto || extractMetadataField<string>(rawMeta, 'rto'),
    rpo: explicitMeta?.rpo || extractMetadataField<string>(rawMeta, 'rpo'),
    tags,
    compliance,
    customFields,
  };

  // Resolve Inbound Connections (Who calls this object)
  const inboundConnections: DocInboundConnection[] = [];
  for (const conn of model.connections) {
    if (conn.targetObjectId === objectId) {
      const source = model.objects.find((o) => o.id === conn.sourceObjectId);
      if (source) {
        const cMeta = (conn.metadata || {}) as Record<string, unknown>;
        inboundConnections.push({
          connectionId: conn.id,
          sourceId: source.id,
          sourceName: source.name,
          sourceKind: source.kind,
          label: conn.label || undefined,
          description: conn.description || undefined,
          kind: conn.kind,
          protocol: extractMetadataField<string>(cMeta, 'protocol'),
          technology: extractMetadataField<string>(cMeta, 'technology'),
        });
      }
    }
  }

  // Resolve Outbound Connections (What this object depends on)
  const outboundConnections: DocOutboundConnection[] = [];
  for (const conn of model.connections) {
    if (conn.sourceObjectId === objectId) {
      const target = model.objects.find((o) => o.id === conn.targetObjectId);
      if (target) {
        const cMeta = (conn.metadata || {}) as Record<string, unknown>;
        outboundConnections.push({
          connectionId: conn.id,
          targetId: target.id,
          targetName: target.name,
          targetKind: target.kind,
          label: conn.label || undefined,
          description: conn.description || undefined,
          kind: conn.kind,
          protocol: extractMetadataField<string>(cMeta, 'protocol'),
          technology: extractMetadataField<string>(cMeta, 'technology'),
        });
      }
    }
  }

  // Resolve Contained Children
  const children: DocChildObject[] = model.objects
    .filter((o) => o.parentId === objectId)
    .map((c) => {
      const cMeta = (c.metadata || {}) as Record<string, unknown>;
      return {
        objectId: c.id,
        name: c.name,
        kind: c.kind,
        description: c.description || undefined,
        technology: extractMetadataField<string>(cMeta, 'technology'),
        status: extractMetadataField<string>(cMeta, 'status') || extractMetadataField<string>(cMeta, 'lifecycle') || 'active',
      };
    });

  // Resolve Associated Views
  const associatedViews: DocAssociatedView[] = [];
  if (context?.views) {
    for (const v of context.views) {
      // In general, a view might show this object; if filters are present, check inclusion
      associatedViews.push({
        viewId: v.id,
        name: v.name,
        kind: v.kind,
      });
    }
  }

  // Resolve Associated Flows
  const associatedFlows: DocAssociatedFlow[] = [];
  if (context?.flows) {
    for (const f of context.flows) {
      let role: DocAssociatedFlow['role'] | undefined = undefined;
      if (f.actorId === objectId) {
        role = 'actor';
      }
      if (role) {
        associatedFlows.push({
          flowId: f.id,
          name: f.name,
          type: f.type,
          description: f.description || undefined,
          role,
        });
      }
    }
  }

  if (context?.flowsWithSteps) {
    for (const flowWithSteps of context.flowsWithSteps) {
      const alreadyAdded = associatedFlows.some((af) => af.flowId === flowWithSteps.id);
      if (!alreadyAdded) {
        let isParticipant = false;
        if (flowWithSteps.actorId === objectId) {
          isParticipant = true;
        } else {
          for (const step of flowWithSteps.steps) {
            const stepConn = model.connections.find((c) => c.id === step.connectionId);
            if (stepConn && (stepConn.sourceObjectId === objectId || stepConn.targetObjectId === objectId)) {
              isParticipant = true;
              break;
            }
          }
        }
        if (isParticipant) {
          associatedFlows.push({
            flowId: flowWithSteps.id,
            name: flowWithSteps.name,
            type: flowWithSteps.type,
            description: flowWithSteps.description || undefined,
            role: flowWithSteps.actorId === objectId ? 'actor' : 'participant',
          });
        }
      }
    }
  }

  // Resolve Associated ADRs
  const associatedAdrs: DocAssociatedAdr[] = [];
  if (context?.adrs) {
    for (const adr of context.adrs) {
      const matches = adr.attachments.some(
        (att) => att.targetType === 'object' && att.targetId === objectId,
      );
      if (matches) {
        associatedAdrs.push({
          adrId: adr.id,
          number: adr.number,
          title: adr.title,
          status: adr.status,
          date: adr.createdAt ? new Date(adr.createdAt).toISOString().split('T')[0] : undefined,
        });
      }
    }
  }

  // Synthesize Document Sections
  const sections: ArchitectureDocSection[] = [];

  // 1. Overview Section
  sections.push({
    id: 'overview',
    title: 'Overview',
    content: obj.description || `${obj.name} is a ${obj.kind} in the ${model.architecture.name} architecture.`,
  });

  // 2. Ownership & Governance Section
  const governanceItems: string[] = [];
  if (metadata.team) governanceItems.push(`- **Owning Team**: ${metadata.team}`);
  if (metadata.owner && metadata.owner !== metadata.team) governanceItems.push(`- **Owner / Contact**: ${metadata.owner}`);
  if (metadata.repositoryUrl) governanceItems.push(`- **Source Repository**: [${metadata.repositoryUrl}](${metadata.repositoryUrl})`);
  if (metadata.documentationUrl) governanceItems.push(`- **External Docs**: [${metadata.documentationUrl}](${metadata.documentationUrl})`);
  if (metadata.status) governanceItems.push(`- **Lifecycle Status**: \`${metadata.status}\``);
  if (metadata.domain) governanceItems.push(`- **Business Domain**: ${metadata.domain}`);

  sections.push({
    id: 'governance',
    title: 'Ownership & Governance',
    content: governanceItems.length > 0 ? governanceItems.join('\n') : 'No explicit team or repository governance defined.',
  });

  // 3. Technical Specifications
  const techItems: string[] = [];
  if (metadata.technology) techItems.push(`- **Technology Stack**: \`${metadata.technology}\``);
  if (metadata.environment) techItems.push(`- **Environment**: ${metadata.environment}`);
  if (metadata.criticality) techItems.push(`- **Criticality Level**: \`${metadata.criticality.toUpperCase()}\``);
  if (metadata.dataClassification) techItems.push(`- **Data Classification**: \`${metadata.dataClassification}\``);
  if (metadata.tags.length > 0) techItems.push(`- **Tags**: ${metadata.tags.map((t) => `\`${t}\``).join(', ')}`);

  sections.push({
    id: 'technical',
    title: 'Technical Specifications',
    content: techItems.length > 0 ? techItems.join('\n') : 'No technical specifications recorded.',
  });

  // 4. Inbound Interfaces Section
  if (inboundConnections.length > 0) {
    const tableHeader = '| Caller | Kind | Interface / Action | Protocol | Technology |\n| :--- | :--- | :--- | :--- | :--- |';
    const rows = inboundConnections.map((c) => {
      const action = c.label || c.description || 'Calls';
      const proto = c.protocol || c.kind || 'sync';
      const tech = c.technology || '-';
      return `| **${c.sourceName}** | \`${c.sourceKind}\` | ${action} | \`${proto}\` | ${tech} |`;
    });
    sections.push({
      id: 'inbound',
      title: 'Inbound Integrations (Callers)',
      content: `${inboundConnections.length} upstream system(s) call into **${obj.name}**:\n\n${tableHeader}\n${rows.join('\n')}`,
    });
  } else {
    sections.push({
      id: 'inbound',
      title: 'Inbound Integrations (Callers)',
      content: `No inbound upstream connections recorded for this ${obj.kind}.`,
    });
  }

  // 5. Outbound Dependencies Section
  if (outboundConnections.length > 0) {
    const tableHeader = '| Dependency | Kind | Action / Description | Protocol | Technology |\n| :--- | :--- | :--- | :--- | :--- |';
    const rows = outboundConnections.map((c) => {
      const action = c.label || c.description || 'Uses';
      const proto = c.protocol || c.kind || 'sync';
      const tech = c.technology || '-';
      return `| **${c.targetName}** | \`${c.targetKind}\` | ${action} | \`${proto}\` | ${tech} |`;
    });
    sections.push({
      id: 'outbound',
      title: 'Outbound Dependencies',
      content: `**${obj.name}** relies on ${outboundConnections.length} downstream component(s) or datastore(s):\n\n${tableHeader}\n${rows.join('\n')}`,
    });
  } else {
    sections.push({
      id: 'outbound',
      title: 'Outbound Dependencies',
      content: `No outbound downstream dependencies recorded for this ${obj.kind}.`,
    });
  }

  // 6. Contained Subcomponents Section (if any)
  if (children.length > 0) {
    const tableHeader = '| Subcomponent | Kind | Technology | Status | Description |\n| :--- | :--- | :--- | :--- | :--- |';
    const rows = children.map((c) => {
      return `| **${c.name}** | \`${c.kind}\` | ${c.technology || '-'} | \`${c.status || 'active'}\` | ${c.description || '-'} |`;
    });
    sections.push({
      id: 'children',
      title: 'Contained Components & Subsystems',
      content: `**${obj.name}** encapsulates ${children.length} child component(s):\n\n${tableHeader}\n${rows.join('\n')}`,
    });
  }

  // 7. Operations & Resilience Section
  const opsItems: string[] = [];
  if (metadata.sla) opsItems.push(`- **SLA Commitment**: ${metadata.sla}`);
  if (metadata.rto) opsItems.push(`- **Recovery Time Objective (RTO)**: ${metadata.rto}`);
  if (metadata.rpo) opsItems.push(`- **Recovery Point Objective (RPO)**: ${metadata.rpo}`);
  if (metadata.compliance.length > 0) opsItems.push(`- **Compliance Profiles**: ${metadata.compliance.join(', ')}`);

  if (opsItems.length > 0) {
    sections.push({
      id: 'operations',
      title: 'Operations & Resilience',
      content: opsItems.join('\n'),
    });
  }

  const slug = slugifyDocName(obj.name);
  const lastCrumb = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : undefined;
  const path = lastCrumb ? lastCrumb.path : `/docs/${slug}`;

  const docPage: ObjectDocPage = {
    id: `doc-${obj.id}`,
    objectId: obj.id,
    slug,
    path,
    title: obj.name,
    subtitle: `${obj.kind.toUpperCase()}${metadata.technology ? ` • ${metadata.technology}` : ''}`,
    kind: obj.kind,
    description: obj.description || `${obj.name} (${obj.kind})`,
    parent: parentInfo,
    breadcrumbs,
    metadata,
    inboundConnections,
    outboundConnections,
    children,
    associatedViews,
    associatedFlows,
    associatedAdrs,
    sections,
    markdown: '',
    generatedAt: new Date().toISOString(),
  };

  // Compile final markdown
  return {
    ...docPage,
    markdown: renderDocPageToMarkdown(docPage),
  };
}

// ============================================================================
// Architecture Overview Doc Page Generator
// ============================================================================

/**
 * Generates an overarching architecture documentation page summarizing
 * all systems, tech stack, and primary connections.
 */
export function generateArchitectureOverviewDocPage(
  model: ArchitectureModel,
  context?: DocGenerationContext,
): ObjectDocPage {
  const tree = buildArchitectureDocTree(model);
  const totalObjects = model.objects.length;
  const totalConnections = model.connections.length;

  const kindCounts: Record<string, number> = {};
  for (const obj of model.objects) {
    kindCounts[obj.kind] = (kindCounts[obj.kind] || 0) + 1;
  }

  const techSet = new Set<string>();
  for (const obj of model.objects) {
    const raw = obj.metadata as Record<string, unknown> | undefined;
    const tech = extractMetadataField<string>(raw, 'technology');
    if (tech) techSet.add(tech);
  }

  const sections: ArchitectureDocSection[] = [];

  // 1. Overview
  sections.push({
    id: 'overview',
    title: 'Architecture Overview',
    content:
      model.architecture.description ||
      `Official system architecture documentation for **${model.architecture.name}**.\n\n` +
      `This model documents **${totalObjects}** architecture entities and **${totalConnections}** integrations.`,
  });

  // 2. Metrics & Breakdown
  const metricLines = Object.entries(kindCounts).map(
    ([kind, count]) => `- **${kind.charAt(0).toUpperCase() + kind.slice(1)}s**: ${count}`,
  );
  sections.push({
    id: 'metrics',
    title: 'Entity Breakdown',
    content: metricLines.join('\n'),
  });

  // 3. Technologies
  if (techSet.size > 0) {
    const techList = Array.from(techSet).sort();
    sections.push({
      id: 'technologies',
      title: 'Technology Stack',
      content: techList.map((t) => `- \`${t}\``).join('\n'),
    });
  }

  // 4. Subsystem Tree Summary
  const topLevel = tree.root.children;
  if (topLevel.length > 0) {
    const treeLines = topLevel.map((c) => {
      const childCount = c.children.length;
      const childNote = childCount > 0 ? ` (${childCount} subcomponents)` : '';
      return `- **[${c.title}](${c.path})** (\`${c.kind}\`)${childNote}`;
    });
    sections.push({
      id: 'subsystems',
      title: 'Top-Level Subsystems',
      content: treeLines.join('\n'),
    });
  }

  const slug = tree.root.slug;
  const path = tree.root.path;

  const docPage: ObjectDocPage = {
    id: 'doc-overview',
    slug,
    path,
    title: model.architecture.name,
    subtitle: `Architecture Overview • ${totalObjects} Entities`,
    kind: 'architecture',
    description: model.architecture.description || `Overview of ${model.architecture.name}`,
    breadcrumbs: [
      {
        id: tree.root.id,
        title: tree.root.title,
        slug: tree.root.slug,
        path: tree.root.path,
        kind: 'architecture',
      },
    ],
    metadata: {
      status: 'active',
      tags: ['architecture-overview', 'root-spec'],
      compliance: [],
      customFields: {
        totalObjects,
        totalConnections,
        totalViews: context?.views?.length || 0,
        totalFlows: context?.flows?.length || 0,
      },
    },
    inboundConnections: [],
    outboundConnections: [],
    children: topLevel.map((n) => ({
      objectId: n.objectId || ('' as ObjectId),
      name: n.title,
      kind: (n.kind === 'architecture' ? 'system' : n.kind) as ObjectKind,
      description: n.description,
      technology: n.technology,
      status: n.status,
    })),
    associatedViews: (context?.views || []).map((v) => ({
      viewId: v.id,
      name: v.name,
      kind: v.kind,
    })),
    associatedFlows: (context?.flows || []).map((f) => ({
      flowId: f.id,
      name: f.name,
      type: f.type,
      description: f.description || undefined,
      role: 'participant',
    })),
    associatedAdrs: (context?.adrs || []).map((a) => ({
      adrId: a.id,
      number: a.number,
      title: a.title,
      status: a.status,
      date: a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : undefined,
    })),
    sections,
    markdown: '',
    generatedAt: new Date().toISOString(),
  };

  return {
    ...docPage,
    markdown: renderDocPageToMarkdown(docPage),
  };
}

// ============================================================================
// Markdown Renderer
// ============================================================================

/**
 * Renders a structured ObjectDocPage into clean, standardized Markdown.
 */
export function renderDocPageToMarkdown(doc: ObjectDocPage): string {
  const lines: string[] = [];

  // Header Title
  lines.push(`# ${doc.title}`);
  if (doc.subtitle) {
    lines.push(`> *${doc.subtitle}*`);
  }
  lines.push('');

  // Metadata badges / summary
  const badgeParts: string[] = [];
  badgeParts.push(`**Kind:** \`${doc.kind}\``);
  if (doc.metadata.status) {
    badgeParts.push(`**Status:** \`${doc.metadata.status}\``);
  }
  if (doc.metadata.technology) {
    badgeParts.push(`**Technology:** \`${doc.metadata.technology}\``);
  }
  if (doc.metadata.team) {
    badgeParts.push(`**Team:** ${doc.metadata.team}`);
  }
  if (doc.metadata.criticality) {
    badgeParts.push(`**Criticality:** \`${doc.metadata.criticality.toUpperCase()}\``);
  }
  lines.push(badgeParts.join(' | '));
  lines.push('');

  // Render Sections
  for (const section of doc.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  // Associated Architecture Decision Records (ADRs)
  if (doc.associatedAdrs.length > 0) {
    lines.push('## Architectural Decision Records (ADRs)');
    lines.push('');
    const adrTable = '| ADR # | Title | Status | Date |\n| :--- | :--- | :--- | :--- |';
    const rows = doc.associatedAdrs.map(
      (a) => `| **ADR-${String(a.number).padStart(3, '0')}** | ${a.title} | \`${a.status}\` | ${a.date || '-'} |`,
    );
    lines.push(`${adrTable}\n${rows.join('\n')}`);
    lines.push('');
  }

  // Associated Execution Flows
  if (doc.associatedFlows.length > 0) {
    lines.push('## Associated Execution Flows');
    lines.push('');
    const flowTable = '| Flow Name | Flow Type | Role | Description |\n| :--- | :--- | :--- | :--- |';
    const rows = doc.associatedFlows.map(
      (f) => `| **${f.name}** | \`${f.type || 'flow'}\` | \`${f.role}\` | ${f.description || '-'} |`,
    );
    lines.push(`${flowTable}\n${rows.join('\n')}`);
    lines.push('');
  }

  // Footer metadata
  lines.push('---');
  lines.push(`*Generated by DiagramHQ Architecture Documentation Engine on ${doc.generatedAt.split('T')[0]}*`);

  return lines.join('\n');
}

// ============================================================================
// Documentation Catalog Generator
// ============================================================================

/**
 * Compiles doc pages for every object in the model into a dictionary Map.
 */
export function generateArchitectureDocPages(
  model: ArchitectureModel,
  context?: DocGenerationContext,
): Map<ObjectId, ObjectDocPage> {
  const pages = new Map<ObjectId, ObjectDocPage>();
  for (const obj of model.objects) {
    const page = generateObjectDocPage(obj.id, model, context);
    pages.set(obj.id, page);
  }
  return pages;
}

/**
 * Compiles the entire doc tree, all object doc pages, and the root overview page
 * into a single unified ArchitectureDocCatalog.
 */
export function exportArchitectureDocsAsCatalog(
  model: ArchitectureModel,
  context?: DocGenerationContext,
): ArchitectureDocCatalog {
  const tree = buildArchitectureDocTree(model);
  const overviewPage = generateArchitectureOverviewDocPage(model, context);
  const objectPages = model.objects.map((obj) => generateObjectDocPage(obj.id, model, context));

  return {
    architectureId: model.architecture.id,
    architectureName: model.architecture.name,
    tree,
    overviewPage,
    objectPages,
    generatedAt: new Date().toISOString(),
  };
}
