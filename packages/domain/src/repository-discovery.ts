/**
 * DiagramHQ - Organization Repository Discovery & Scoping Engine (F074)
 *
 * Discovers and enumerates repositories across GitHub organizations or GitLab groups/namespaces,
 * enabling architects to filter, inspect, and select specific repositories to scope
 * architecture model extraction scans.
 *
 * Strict Acceptance Invariant:
 * - Discovery lists repositories with rich metadata (languages, frameworks, stars, activity).
 * - Selection strictly scopes downstream scan operations, guaranteeing unselected repositories are excluded.
 */

export type RepoProvider = 'github' | 'gitlab' | 'bitbucket';

export interface DiscoveredRepository {
  id: string;
  provider: RepoProvider;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  primaryLanguage: string;
  frameworks: string[];
  defaultBranch: string;
  isPrivate: boolean;
  isArchived: boolean;
  lastPushedAt: string;
  starsCount?: number;
  forksCount?: number;
  estimatedServicesCount?: number;
}

export interface DiscoveryFilter {
  searchQuery?: string;
  languages?: string[];
  frameworks?: string[];
  includeArchived?: boolean;
}

export interface RepoDiscoverySession {
  id: string;
  provider: RepoProvider;
  orgOrGroup: string;
  repositories: DiscoveredRepository[];
  selectedRepoIds: string[];
  createdAt: string;
}

export interface ScopedDiscoverySummary {
  totalDiscovered: number;
  totalSelected: number;
  languages: Record<string, number>;
  totalEstimatedServices: number;
  provider: RepoProvider;
  orgOrGroup: string;
}

/**
 * Filters a list of discovered repositories based on query criteria.
 */
export function filterRepositories(
  repositories: DiscoveredRepository[],
  filter: DiscoveryFilter
): DiscoveredRepository[] {
  return repositories.filter((repo) => {
    // Exclude archived by default unless explicitly included
    if (!filter.includeArchived && repo.isArchived) {
      return false;
    }

    // Search query matching against name, fullName, description, and frameworks
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.trim().toLowerCase();
      const matchesName = repo.name.toLowerCase().includes(q);
      const matchesFullName = repo.fullName.toLowerCase().includes(q);
      const matchesDesc = repo.description.toLowerCase().includes(q);
      const matchesFw = repo.frameworks.some((f) => f.toLowerCase().includes(q));

      if (!matchesName && !matchesFullName && !matchesDesc && !matchesFw) {
        return false;
      }
    }

    // Filter by programming languages
    if (filter.languages && filter.languages.length > 0) {
      const lowerLangs = filter.languages.map((l) => l.toLowerCase());
      if (!lowerLangs.includes(repo.primaryLanguage.toLowerCase())) {
        return false;
      }
    }

    // Filter by frameworks
    if (filter.frameworks && filter.frameworks.length > 0) {
      const lowerFws = filter.frameworks.map((f) => f.toLowerCase());
      const hasFw = repo.frameworks.some((f) => lowerFws.includes(f.toLowerCase()));
      if (!hasFw) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Scopes scan targets strictly to the explicitly selected repository IDs.
 * Guarantees that unselected repositories are excluded from downstream modeling scans.
 */
export function scopeScanTargets(
  allRepositories: DiscoveredRepository[],
  selectedRepoIds: string[]
): DiscoveredRepository[] {
  const selectedSet = new Set(selectedRepoIds);
  return allRepositories.filter((repo) => selectedSet.has(repo.id));
}

/**
 * Computes architectural scoping summary statistics for selected repositories.
 */
export function summarizeDiscoveryScope(
  provider: RepoProvider,
  orgOrGroup: string,
  allRepositories: DiscoveredRepository[],
  selectedRepositories: DiscoveredRepository[]
): ScopedDiscoverySummary {
  const languages: Record<string, number> = {};
  let totalEstimatedServices = 0;

  for (const repo of selectedRepositories) {
    if (repo.primaryLanguage) {
      languages[repo.primaryLanguage] = (languages[repo.primaryLanguage] || 0) + 1;
    }
    totalEstimatedServices += repo.estimatedServicesCount ?? 1;
  }

  return {
    totalDiscovered: allRepositories.length,
    totalSelected: selectedRepositories.length,
    languages,
    totalEstimatedServices,
    provider,
    orgOrGroup,
  };
}

/**
 * Creates an interactive repository discovery session.
 */
export function createDiscoverySession(
  provider: RepoProvider,
  orgOrGroup: string,
  repositories: DiscoveredRepository[],
  initialSelectedIds?: string[]
): RepoDiscoverySession {
  return {
    id: `disc-${Date.now()}`,
    provider,
    orgOrGroup,
    repositories,
    selectedRepoIds: initialSelectedIds ?? repositories.filter((r) => !r.isArchived).map((r) => r.id),
    createdAt: new Date().toISOString(),
  };
}
