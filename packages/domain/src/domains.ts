/**
 * DDD Domains & Bounded Contexts (F113).
 *
 * Implements Domain-Driven Design (DDD) strategic design primitives:
 * - Domain & Bounded Context definitions with hierarchical nesting
 * - Object domain assignment and detachment
 * - Domain-scoped queries and filtering with support for nested contexts
 * - Cycle prevention across nested domain hierarchies
 */

import { createId, type ArchitectureId, type DomainId } from './ids';

export interface Domain {
  readonly id: DomainId;
  readonly architectureId: ArchitectureId;
  name: string;
  slug: string;
  description?: string | null;
  parentDomainId?: DomainId | null;
  color?: string | null;
  owner?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainParams {
  id?: DomainId;
  architectureId: ArchitectureId;
  name: string;
  slug?: string;
  description?: string | null;
  parentDomainId?: DomainId | null;
  color?: string | null;
  owner?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DomainTreeNode {
  readonly domain: Domain;
  readonly children: DomainTreeNode[];
}

export interface FilterObjectsByDomainOptions {
  readonly includeNestedDomains?: boolean;
  readonly domains?: readonly Domain[];
}

/**
 * Converts a human-readable domain name into a clean URL/identifier slug.
 */
export function slugifyDomainName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a new Domain or Bounded Context (F113).
 */
export function createDomain(params: CreateDomainParams): Domain {
  if (!params.name || !params.name.trim()) {
    throw new Error('createDomain: Domain name cannot be empty.');
  }

  const now = new Date();
  const slug = params.slug?.trim() || slugifyDomainName(params.name);

  return {
    id: params.id || createId('dom'),
    architectureId: params.architectureId,
    name: params.name.trim(),
    slug,
    description: params.description ?? null,
    parentDomainId: params.parentDomainId ?? null,
    color: params.color ?? null,
    owner: params.owner ?? null,
    metadata: params.metadata ? { ...params.metadata } : {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Nests a domain under a parent domain (e.g. Bounded Context under a Core Domain).
 * Throws an error if cycle or invalid hierarchy is detected.
 */
export function nestDomain(
  domainId: DomainId,
  parentDomainId: DomainId | null,
  allDomains: readonly Domain[],
): Domain {
  const target = allDomains.find((d) => d.id === domainId);
  if (!target) {
    throw new Error(`nestDomain: Domain "${domainId}" not found.`);
  }

  if (parentDomainId === null) {
    return {
      ...target,
      parentDomainId: null,
      updatedAt: new Date(),
    };
  }

  if (domainId === parentDomainId) {
    throw new Error(`nestDomain: Domain "${domainId}" cannot be its own parent.`);
  }

  const parent = allDomains.find((d) => d.id === parentDomainId);
  if (!parent) {
    throw new Error(`nestDomain: Parent domain "${parentDomainId}" not found.`);
  }

  // Cycle check: verify target is not an ancestor of proposed parent
  let currentParentId: DomainId | null | undefined = parent.parentDomainId;
  const visited = new Set<string>([parent.id]);

  while (currentParentId) {
    if (currentParentId === domainId) {
      throw new Error(
        `nestDomain: Cycle detected. Domain "${domainId}" is already an ancestor of "${parentDomainId}".`,
      );
    }
    if (visited.has(currentParentId)) {
      throw new Error(`nestDomain: Existing cycle detected at "${currentParentId}".`);
    }
    visited.add(currentParentId);

    const ancestor = allDomains.find((d) => d.id === currentParentId);
    currentParentId = ancestor?.parentDomainId;
  }

  return {
    ...target,
    parentDomainId,
    updatedAt: new Date(),
  };
}

/**
 * Finds a domain by ID, name, or slug.
 */
export function findDomainBySelector(
  selector: string,
  domains: readonly Domain[],
): Domain | undefined {
  if (!selector) return undefined;
  const normalized = selector.trim().toLowerCase();

  return domains.find(
    (d) =>
      d.id === selector ||
      d.slug.toLowerCase() === normalized ||
      d.name.toLowerCase() === normalized,
  );
}

/**
 * Retrieves all descendant domain IDs under a given domain ID.
 */
export function getDomainDescendantIds(
  rootDomainId: DomainId,
  allDomains: readonly Domain[],
): DomainId[] {
  const descendants: DomainId[] = [];
  const queue: DomainId[] = [rootDomainId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const directChildren = allDomains.filter((d) => d.parentDomainId === currentId);
    for (const child of directChildren) {
      if (!descendants.includes(child.id)) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendants;
}

/**
 * Assigns an architecture object to a domain or bounded context (F113).
 */
export function assignObjectToDomain<T extends object>(
  object: T,
  domain: Domain | string | null,
): T & { metadata: Record<string, unknown> } {
  const existingMeta =
    'metadata' in object && object.metadata && typeof object.metadata === 'object'
      ? { ...(object.metadata as Record<string, unknown>) }
      : {};

  if (!domain) {
    delete existingMeta.domain;
    delete existingMeta.domainId;
    delete existingMeta.boundedContext;
    return {
      ...object,
      metadata: existingMeta,
    };
  }

  if (typeof domain === 'string') {
    existingMeta.domain = domain;
    if (domain.startsWith('dom_')) {
      existingMeta.domainId = domain;
    }
  } else {
    existingMeta.domain = domain.name;
    existingMeta.domainId = domain.id;
    existingMeta.domainSlug = domain.slug;
    if (domain.parentDomainId) {
      existingMeta.boundedContext = domain.name;
    }
  }

  return {
    ...object,
    metadata: existingMeta,
  };
}

/**
 * Removes domain assignment from an architecture object.
 */
export function removeObjectFromDomain<T extends object>(
  object: T,
): T & { metadata: Record<string, unknown> } {
  return assignObjectToDomain(object, null);
}

/**
 * Filters objects belonging to a specified domain or bounded context (F113).
 * Supports exact match, slug/name match, and recursive inclusion of nested subdomains.
 */
export function filterObjectsByDomain<T extends object>(
  objects: readonly T[],
  domainSelector: string,
  options?: FilterObjectsByDomainOptions,
): T[] {
  if (!domainSelector || !domainSelector.trim()) {
    return [...objects];
  }

  const normalizedSelector = domainSelector.trim().toLowerCase();
  const allowedMatchValues = new Set<string>([normalizedSelector]);

  if (options?.domains) {
    const matchedDomain = findDomainBySelector(domainSelector, options.domains);
    if (matchedDomain) {
      allowedMatchValues.add(matchedDomain.id.toLowerCase());
      allowedMatchValues.add(matchedDomain.name.toLowerCase());
      allowedMatchValues.add(matchedDomain.slug.toLowerCase());

      if (options.includeNestedDomains) {
        const descendantIds = getDomainDescendantIds(matchedDomain.id, options.domains);
        for (const childId of descendantIds) {
          const childDomain = options.domains.find((d) => d.id === childId);
          if (childDomain) {
            allowedMatchValues.add(childDomain.id.toLowerCase());
            allowedMatchValues.add(childDomain.name.toLowerCase());
            allowedMatchValues.add(childDomain.slug.toLowerCase());
          }
        }
      }
    }
  }

  return objects.filter((obj) => {
    const meta =
      'metadata' in obj && obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as Record<string, unknown>)
        : undefined;
    if (!meta) return false;

    const domainVal = meta.domain != null ? String(meta.domain).trim().toLowerCase() : '';
    const domainIdVal = meta.domainId != null ? String(meta.domainId).trim().toLowerCase() : '';
    const slugVal = meta.domainSlug != null ? String(meta.domainSlug).trim().toLowerCase() : '';
    const contextVal = meta.boundedContext != null ? String(meta.boundedContext).trim().toLowerCase() : '';

    return (
      allowedMatchValues.has(domainVal) ||
      allowedMatchValues.has(domainIdVal) ||
      allowedMatchValues.has(slugVal) ||
      allowedMatchValues.has(contextVal)
    );
  });
}

/**
 * Builds a hierarchical tree of domains and nested bounded contexts.
 */
export function getDomainHierarchy(allDomains: readonly Domain[]): DomainTreeNode[] {
  const rootDomains = allDomains.filter((d) => !d.parentDomainId);

  function buildNode(domain: Domain): DomainTreeNode {
    const children = allDomains
      .filter((d) => d.parentDomainId === domain.id)
      .map(buildNode);
    return { domain, children };
  }

  return rootDomains.map(buildNode);
}
