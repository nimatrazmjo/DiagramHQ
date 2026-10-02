/**
 * DiagramHQ - Code-to-Architecture Mapping & Traceability Engine (F075)
 *
 * Establishes bidirectional traceability linking C4 architecture model objects
 * (components, services, datastores) directly to their underlying code repositories,
 * folders, files, and line ranges.
 *
 * Strict Acceptance Invariant:
 * - Map component -> repository -> folder -> file; open-in-GitHub / open-in-GitLab.
 * - Test: a component links to its repo path and generates valid remote URLs.
 */

import type { ObjectId, ArchitectureId } from './ids';
import type { ModelObject } from './types';

export type CodeProvider = 'github' | 'gitlab' | 'bitbucket' | 'custom';

export interface CodeLocationSpec {
  repositoryUrl: string; // e.g. "https://github.com/acme-corp/order-service" or "acme-corp/order-service"
  provider: CodeProvider;
  branchOrRef?: string; // defaults to 'main'
  folderPath?: string; // e.g. "packages/orders"
  filePath?: string; // e.g. "src/controllers/order.controller.ts"
  lineStart?: number;
  lineEnd?: number;
  commitSha?: string;
}

export interface CodeMapping {
  id: string;
  objectId: ObjectId;
  architectureId: ArchitectureId;
  location: CodeLocationSpec;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalizes a repository string (URL, slug, or SSH URI) into standard { owner, repo, baseHost }
 */
export function normalizeRepoCoordinates(
  rawUrlOrSlug: string,
  provider: CodeProvider
): { owner: string; repo: string; host: string } {
  let cleaned = rawUrlOrSlug.trim();

  // Strip trailing .git
  if (cleaned.endsWith('.git')) {
    cleaned = cleaned.slice(0, -4);
  }

  // Handle SSH format: git@github.com:owner/repo
  if (cleaned.startsWith('git@')) {
    const parts = cleaned.slice(4).split(':');
    const host = parts[0] || (provider === 'gitlab' ? 'gitlab.com' : 'github.com');
    const path = parts[1] || '';
    const slashIdx = path.lastIndexOf('/');
    const owner = slashIdx > -1 ? path.slice(0, slashIdx) : 'owner';
    const repo = slashIdx > -1 ? path.slice(slashIdx + 1) : path;
    return { owner, repo, host };
  }

  // Handle HTTP/HTTPS format: https://github.com/owner/repo
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      const host = url.host;
      const pathname = url.pathname.replace(/^\/+/, '');
      const slashIdx = pathname.lastIndexOf('/');
      const owner = slashIdx > -1 ? pathname.slice(0, slashIdx) : 'owner';
      const repo = slashIdx > -1 ? pathname.slice(slashIdx + 1) : pathname;
      return { owner, repo, host };
    } catch {
      // Fallback to slug parsing
    }
  }

  // Handle slug format: "owner/repo" or "group/subgroup/repo"
  const defaultHost = provider === 'gitlab' ? 'gitlab.com' : 'github.com';
  const slashIdx = cleaned.lastIndexOf('/');
  if (slashIdx > -1) {
    const owner = cleaned.slice(0, slashIdx);
    const repo = cleaned.slice(slashIdx + 1);
    return { owner, repo, host: defaultHost };
  }

  return { owner: 'acme-corp', repo: cleaned || 'repo', host: defaultHost };
}

/**
 * Generates canonical remote deep link ("Open in GitHub" or "Open in GitLab")
 * linking directly to repository root, directory folder, file, or line range.
 */
export function generateRemoteCodeUrl(location: CodeLocationSpec): string {
  const { provider, branchOrRef, folderPath, filePath, lineStart, lineEnd } = location;
  const ref = branchOrRef?.trim() || 'main';
  const { owner, repo, host } = normalizeRepoCoordinates(location.repositoryUrl, provider);
  const baseUrl = `https://${host}/${owner}/${repo}`;

  if (provider === 'gitlab') {
    // GitLab URL syntax: /-/blob/ref/path or /-/tree/ref/path
    if (filePath) {
      const cleanPath = filePath.replace(/^\/+/, '');
      let url = `${baseUrl}/-/blob/${ref}/${cleanPath}`;
      if (lineStart !== undefined) {
        url += `#L${lineStart}`;
        if (lineEnd !== undefined && lineEnd > lineStart) {
          url += `-${lineEnd}`;
        }
      }
      return url;
    }

    if (folderPath) {
      const cleanFolder = folderPath.replace(/^\/+/, '');
      return `${baseUrl}/-/tree/${ref}/${cleanFolder}`;
    }

    return `${baseUrl}/-/tree/${ref}`;
  }

  // Default to GitHub format
  if (filePath) {
    const cleanPath = filePath.replace(/^\/+/, '');
    let url = `${baseUrl}/blob/${ref}/${cleanPath}`;
    if (lineStart !== undefined) {
      url += `#L${lineStart}`;
      if (lineEnd !== undefined && lineEnd > lineStart) {
        url += `-L${lineEnd}`;
      }
    }
    return url;
  }

  if (folderPath) {
    const cleanFolder = folderPath.replace(/^\/+/, '');
    return `${baseUrl}/tree/${ref}/${cleanFolder}`;
  }

  return `${baseUrl}/tree/${ref}`;
}

/**
 * Validates a CodeMapping for required attributes.
 */
export function validateCodeMapping(mapping: CodeMapping): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!mapping.objectId) {
    errors.push('objectId is required');
  }
  if (!mapping.location.repositoryUrl?.trim()) {
    errors.push('repositoryUrl is required');
  }
  if (mapping.location.lineStart !== undefined && mapping.location.lineStart < 1) {
    errors.push('lineStart must be greater than or equal to 1');
  }
  if (
    mapping.location.lineStart !== undefined &&
    mapping.location.lineEnd !== undefined &&
    mapping.location.lineEnd < mapping.location.lineStart
  ) {
    errors.push('lineEnd must be greater than or equal to lineStart');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a new code mapping for an architecture object.
 */
export function createCodeMapping(params: {
  objectId: ObjectId;
  architectureId: ArchitectureId;
  location: CodeLocationSpec;
}): CodeMapping {
  const now = new Date().toISOString();
  return {
    id: `cmap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    objectId: params.objectId,
    architectureId: params.architectureId,
    location: {
      ...params.location,
      branchOrRef: params.location.branchOrRef || 'main',
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Updates an existing code mapping with partial location updates.
 */
export function updateCodeMapping(
  existing: CodeMapping,
  updates: Partial<CodeLocationSpec>
): CodeMapping {
  return {
    ...existing,
    location: {
      ...existing.location,
      ...updates,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Attaches code mapping metadata to a ModelObject without violating pure model invariants.
 */
export function attachCodeMappingToObject(
  object: ModelObject,
  mapping: CodeMapping
): ModelObject {
  const remoteUrl = generateRemoteCodeUrl(mapping.location);

  return {
    ...object,
    metadata: {
      ...(object.metadata || {}),
      codeMapping: {
        id: mapping.id,
        provider: mapping.location.provider,
        repositoryUrl: mapping.location.repositoryUrl,
        branchOrRef: mapping.location.branchOrRef || 'main',
        folderPath: mapping.location.folderPath,
        filePath: mapping.location.filePath,
        lineStart: mapping.location.lineStart,
        lineEnd: mapping.location.lineEnd,
        remoteUrl,
      },
    },
    updatedAt: new Date(),
  };
}

/**
 * Retrieves the code mapping details from a ModelObject if configured.
 */
export function getCodeMappingFromObject(object: ModelObject): (CodeLocationSpec & { remoteUrl: string }) | null {
  const meta = object.metadata as Record<string, unknown> | undefined;
  if (!meta || !meta['codeMapping']) {
    return null;
  }
  return meta['codeMapping'] as CodeLocationSpec & { remoteUrl: string };
}
