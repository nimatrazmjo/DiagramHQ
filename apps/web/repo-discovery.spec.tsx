import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type DiscoveredRepository,
  scopeScanTargets,
  filterRepositories,
} from '@diagramhq/domain';
import { RepoDiscoveryModal } from './components/canvas/repo-discovery-panel';

describe('Repository Discovery and Scoping (F074)', () => {
  const mockRepositories: DiscoveredRepository[] = [
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
  ];

  it('renders RepoDiscoveryModal with discovered repositories, filters, and controls', () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <RepoDiscoveryModal
        isOpen={true}
        onClose={onClose}
        repositories={mockRepositories}
        initialProvider="github"
        initialOrg="acme-corp"
        onLaunchScan={onLaunch}
      />
    );

    expect(html).toContain('Organization Repository Discovery');
    expect(html).toContain('order-service');
    expect(html).toContain('inventory-api');
    expect(html).toContain('customer-portal');
    expect(html).toContain('TypeScript');
    expect(html).toContain('Go');
    expect(html).toContain('Launch Scoped Scan (3)');
    expect(html).toContain('data-testid="repo-discovery-modal"');
    expect(html).toContain('data-testid="repo-search-input"');
    expect(html).toContain('data-testid="language-filter"');
  });

  it('strictly scopes scan targets to user-selected repositories', () => {
    const selectedIds = ['repo-1'];
    const scoped = scopeScanTargets(mockRepositories, selectedIds);

    expect(scoped.length).toBe(1);
    expect(scoped[0]?.name).toBe('order-service');
    expect(scoped.some((r) => r.id === 'repo-2')).toBe(false);
    expect(scoped.some((r) => r.id === 'repo-3')).toBe(false);
  });

  it('filters repositories by language and query in integration context', () => {
    const tsRepos = filterRepositories(mockRepositories, { languages: ['TypeScript'] });
    expect(tsRepos.length).toBe(2);

    const goRepos = filterRepositories(mockRepositories, { searchQuery: 'inventory' });
    expect(goRepos.length).toBe(1);
    expect(goRepos[0]?.name).toBe('inventory-api');
  });

  it('returns null when modal is closed', () => {
    const html = renderToString(
      <RepoDiscoveryModal
        isOpen={false}
        onClose={() => {}}
        repositories={mockRepositories}
      />
    );
    expect(html).toBe('');
  });
});
