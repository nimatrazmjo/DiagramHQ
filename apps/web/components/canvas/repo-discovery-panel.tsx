'use client';

import React, { useState, useMemo } from 'react';
import {
  type DiscoveredRepository,
  type RepoProvider,
  filterRepositories,
  scopeScanTargets,
  summarizeDiscoveryScope,
} from '@diagramhq/domain';

export interface RepoDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: DiscoveredRepository[];
  initialProvider?: RepoProvider;
  initialOrg?: string;
  onLaunchScan?: (scopedRepositories: DiscoveredRepository[]) => void;
}

export function RepoDiscoveryModal({
  isOpen,
  onClose,
  repositories,
  initialProvider = 'github',
  initialOrg = 'acme-corp',
  onLaunchScan,
}: RepoDiscoveryModalProps): React.JSX.Element | null {
  const [provider, setProvider] = useState<RepoProvider>(initialProvider);
  const [org, setOrg] = useState(initialOrg);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>(() =>
    repositories.filter((r) => !r.isArchived).map((r) => r.id)
  );

  // Available languages across repositories
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    repositories.forEach((r) => {
      if (r.primaryLanguage) set.add(r.primaryLanguage);
    });
    return Array.from(set).sort();
  }, [repositories]);

  // Filtered repositories based on search and language
  const filteredRepositories = useMemo(() => {
    return filterRepositories(repositories, {
      searchQuery,
      languages: selectedLanguage === 'all' ? undefined : [selectedLanguage],
      includeArchived: false,
    });
  }, [repositories, searchQuery, selectedLanguage]);

  // Scoped scan target repositories
  const scopedRepositories = useMemo(() => {
    return scopeScanTargets(repositories, selectedRepoIds);
  }, [repositories, selectedRepoIds]);

  // Scoping summary statistics
  const summary = useMemo(() => {
    return summarizeDiscoveryScope(provider, org, repositories, scopedRepositories);
  }, [provider, org, repositories, scopedRepositories]);

  if (!isOpen) return null;

  const toggleRepoSelection = (repoId: string) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const handleSelectAll = () => {
    setSelectedRepoIds(filteredRepositories.map((r) => r.id));
  };

  const handleDeselectAll = () => {
    setSelectedRepoIds([]);
  };

  const handleLaunch = () => {
    if (onLaunchScan) {
      onLaunchScan(scopedRepositories);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="repo-discovery-modal"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider === 'github' ? '🐙' : '🦊'}</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Organization Repository Discovery &amp; Scoping
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enumerate repositories across your organization and select which services to model.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as RepoProvider)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              data-testid="provider-select"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Organization / Group"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono w-44"
              data-testid="org-input"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 md:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories, frameworks..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="repo-search-input"
            />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              data-testid="language-filter"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              data-testid="select-all-button"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              data-testid="deselect-all-button"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5" data-testid="repo-list">
          {filteredRepositories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No repositories found matching your filter criteria.
            </div>
          ) : (
            filteredRepositories.map((repo) => {
              const isSelected = selectedRepoIds.includes(repo.id);
              return (
                <div
                  key={repo.id}
                  onClick={() => toggleRepoSelection(repo.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  data-testid={`repo-card-${repo.id}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {repo.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {repo.primaryLanguage}
                        </span>
                        {repo.isPrivate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {repo.description}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {repo.frameworks.map((fw) => (
                          <span
                            key={fw}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            {fw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400 font-mono shrink-0">
                    {repo.starsCount !== undefined && (
                      <span className="flex items-center gap-1">
                        ⭐ {repo.starsCount}
                      </span>
                    )}
                    <span>{repo.defaultBranch}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Scoped Summary Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <div className="space-y-0.5">
            <div className="font-medium text-slate-800 dark:text-slate-200" data-testid="scope-summary">
              {`${summary.totalSelected} of ${summary.totalDiscovered} repositories scoped for architecture modeling`}
            </div>
            <div className="text-[11px] text-slate-500">
              Estimated ~{summary.totalEstimatedServices} services across {Object.keys(summary.languages).length} language(s)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={scopedRepositories.length === 0}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="launch-scan-button"
            >
              {`Launch Scoped Scan (${scopedRepositories.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
