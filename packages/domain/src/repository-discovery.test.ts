import { describe, it, expect } from 'vitest';
import {
  filterRepositories,
  scopeScanTargets,
  summarizeDiscoveryScope,
  createDiscoverySession,
  type DiscoveredRepository,
} from './repository-discovery';

describe('Repository Discovery & Scan Scoping (F074)', () => {
  const mockOrgRepositories: DiscoveredRepository[] = [
    {
      id: 'repo-1',
      provider: 'github',
      owner: 'acme-corp',
      name: 'order-service',
      fullName: 'acme-corp/order-service',
      description: 'Handles order processing and payment orchestration',
      primaryLanguage: 'TypeScript',
      frameworks: ['NestJS', 'Express'],
      defaultBranch: 'main',
      isPrivate: true,
      isArchived: false,
      lastPushedAt: '2026-10-01T12:00:00Z',
      starsCount: 42,
      forksCount: 5,
      estimatedServicesCount: 2,
    },
    {
      id: 'repo-2',
      provider: 'github',
      owner: 'acme-corp',
      name: 'inventory-api',
      fullName: 'acme-corp/inventory-api',
      description: 'Tracks product warehouse stock and inventory levels',
      primaryLanguage: 'Go',
      frameworks: ['Gin', 'gRPC'],
      defaultBranch: 'main',
      isPrivate: true,
      isArchived: false,
      lastPushedAt: '2026-09-28T09:30:00Z',
      starsCount: 15,
      forksCount: 2,
      estimatedServicesCount: 1,
    },
    {
      id: 'repo-3',
      provider: 'github',
      owner: 'acme-corp',
      name: 'customer-portal',
      fullName: 'acme-corp/customer-portal',
      description: 'Customer facing Next.js web application frontend',
      primaryLanguage: 'TypeScript',
      frameworks: ['Next.js', 'React'],
      defaultBranch: 'main',
      isPrivate: false,
      isArchived: false,
      lastPushedAt: '2026-10-02T08:15:00Z',
      starsCount: 88,
      forksCount: 12,
      estimatedServicesCount: 1,
    },
    {
      id: 'repo-4',
      provider: 'github',
      owner: 'acme-corp',
      name: 'legacy-billing-v1',
      fullName: 'acme-corp/legacy-billing-v1',
      description: 'Deprecated monolithic billing system',
      primaryLanguage: 'Java',
      frameworks: ['Spring Boot'],
      defaultBranch: 'master',
      isPrivate: true,
      isArchived: true,
      lastPushedAt: '2024-01-10T10:00:00Z',
      starsCount: 8,
      forksCount: 1,
      estimatedServicesCount: 1,
    },
    {
      id: 'repo-5',
      provider: 'github',
      owner: 'acme-corp',
      name: 'analytics-pipeline',
      fullName: 'acme-corp/analytics-pipeline',
      description: 'Python Kafka event streams and ETL pipeline',
      primaryLanguage: 'Python',
      frameworks: ['FastAPI', 'Kafka'],
      defaultBranch: 'main',
      isPrivate: true,
      isArchived: false,
      lastPushedAt: '2026-09-30T16:45:00Z',
      starsCount: 24,
      forksCount: 4,
      estimatedServicesCount: 3,
    },
  ];

  it('acceptance test: discovery lists repos and selection strictly scopes the scan', () => {
    // 1. Discovery lists all org repos
    expect(mockOrgRepositories.length).toBe(5);

    // 2. Select a subset of repos to model
    const selectedIds = ['repo-1', 'repo-3'];
    const scopedScanTargets = scopeScanTargets(mockOrgRepositories, selectedIds);

    // 3. Selection strictly scopes the scan
    expect(scopedScanTargets.length).toBe(2);
    expect(scopedScanTargets.map((r) => r.id)).toEqual(['repo-1', 'repo-3']);
    expect(scopedScanTargets.map((r) => r.name)).toEqual(['order-service', 'customer-portal']);

    // 4. Verify unselected repos are excluded
    expect(scopedScanTargets.some((r) => r.id === 'repo-2')).toBe(false);
    expect(scopedScanTargets.some((r) => r.id === 'repo-4')).toBe(false);
    expect(scopedScanTargets.some((r) => r.id === 'repo-5')).toBe(false);
  });

  it('filters repositories by text query, language, and archived status', () => {
    // Excludes archived by default
    const unarchived = filterRepositories(mockOrgRepositories, {});
    expect(unarchived.length).toBe(4);
    expect(unarchived.some((r) => r.isArchived)).toBe(false);

    // Search query matching
    const searchResult = filterRepositories(mockOrgRepositories, { searchQuery: 'billing', includeArchived: true });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0]?.name).toBe('legacy-billing-v1');

    // Language filtering
    const tsRepos = filterRepositories(mockOrgRepositories, { languages: ['TypeScript'] });
    expect(tsRepos.length).toBe(2);
    expect(tsRepos.every((r) => r.primaryLanguage === 'TypeScript')).toBe(true);

    // Framework filtering
    const fastApiRepos = filterRepositories(mockOrgRepositories, { frameworks: ['FastAPI'] });
    expect(fastApiRepos.length).toBe(1);
    expect(fastApiRepos[0]?.name).toBe('analytics-pipeline');
  });

  it('summarizes discovery scope accurately for targeted modeling', () => {
    const selected = scopeScanTargets(mockOrgRepositories, ['repo-1', 'repo-2', 'repo-5']);
    const summary = summarizeDiscoveryScope('github', 'acme-corp', mockOrgRepositories, selected);

    expect(summary.totalDiscovered).toBe(5);
    expect(summary.totalSelected).toBe(3);
    expect(summary.languages['TypeScript']).toBe(1);
    expect(summary.languages['Go']).toBe(1);
    expect(summary.languages['Python']).toBe(1);
    expect(summary.totalEstimatedServices).toBe(6); // 2 + 1 + 3
    expect(summary.provider).toBe('github');
    expect(summary.orgOrGroup).toBe('acme-corp');
  });

  it('creates an interactive discovery session with active repos preselected', () => {
    const session = createDiscoverySession('github', 'acme-corp', mockOrgRepositories);

    expect(session.provider).toBe('github');
    expect(session.orgOrGroup).toBe('acme-corp');
    expect(session.repositories.length).toBe(5);
    // Unarchived repos should be initially selected (4 of 5)
    expect(session.selectedRepoIds.length).toBe(4);
    expect(session.selectedRepoIds).not.toContain('repo-4');
  });

  it('handles empty selection gracefully', () => {
    const emptyScope = scopeScanTargets(mockOrgRepositories, []);
    expect(emptyScope.length).toBe(0);

    const summary = summarizeDiscoveryScope('github', 'acme-corp', mockOrgRepositories, emptyScope);
    expect(summary.totalSelected).toBe(0);
    expect(summary.totalEstimatedServices).toBe(0);
  });
});
