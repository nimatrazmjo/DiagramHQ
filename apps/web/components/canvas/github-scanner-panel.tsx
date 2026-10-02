'use client';

import React, { useState } from 'react';
import type {
  GitHubScanResult,
  DetectedArchitectureObject,
  DetectedConnection,
} from '@diagramhq/domain';
import { ConfidenceBadge } from './ai-confidence-badge';

export interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanRepo: (owner: string, repo: string, branch: string) => void;
  isScanning?: boolean;
}

export function GitHubConnectModal({
  isOpen,
  onClose,
  onScanRepo,
  isScanning = false,
}: GitHubConnectModalProps): React.JSX.Element | null {
  const [repoInput, setRepoInput] = useState('acme-corp/checkout-service');
  const [branch, setBranch] = useState('main');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = repoInput.trim().split('/');
    if (parts.length >= 2) {
      onScanRepo(parts[0] || 'acme', parts[1] || 'repo', branch);
    } else {
      onScanRepo('acme', repoInput.trim() || 'repo', branch);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="github-connect-modal"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐙</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Connect GitHub Repository
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="github-repo-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Repository (owner/repo or URL)
            </label>
            <input
              id="github-repo-input"
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. acme-corp/checkout-service"
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="github-branch-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Branch / Reference
            </label>
            <input
              id="github-branch-input"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScanning}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              data-testid="start-scan-button"
            >
              {isScanning ? 'Scanning Codebase...' : 'Scan Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface GitHubScanResultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: GitHubScanResult;
  onImportObjects?: (objects: DetectedArchitectureObject[], connections: DetectedConnection[]) => void;
}

export function GitHubScanResultDrawer({
  isOpen,
  onClose,
  scanResult,
  onImportObjects,
}: GitHubScanResultDrawerProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const {
    repo,
    services,
    apis,
    databases,
    queues,
    dependencies,
    detectedFrameworks,
    detectedCloudSdks,
    proposedObjects,
    summary,
  } = scanResult;

  const handleImport = () => {
    if (onImportObjects) {
      onImportObjects(proposedObjects, dependencies);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="github-scan-drawer"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🐙</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                GitHub Repository Architecture Discovery
              </h2>
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {`${repo.owner}/${repo.repo} (${repo.branch || 'main'})`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {summary}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Framework & SDK Pills */}
        <div className="px-6 py-2.5 bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Detected Ecosystem:</span>
          {detectedFrameworks.map((fw: string) => (
            <span
              key={fw}
              className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium text-[11px]"
            >
              {fw}
            </span>
          ))}
          {detectedCloudSdks.map((sdk: string) => (
            <span
              key={sdk}
              className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium text-[11px]"
            >
              ☁️ {sdk}
            </span>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Services &amp; Applications ({services.length})
            </h3>
            <div className="grid gap-3">
              {services.map((svc: DetectedArchitectureObject) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4"
                  data-testid="detected-service-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {svc.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {svc.kind}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {svc.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {svc.technologies.map((t: string) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <ConfidenceBadge confidence={svc.confidence} />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {svc.evidence[0]?.rawCitation || 'grounded'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Databases & Queues */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Databases ({databases.length})
              </h3>
              <div className="space-y-2">
                {databases.map((db: DetectedArchitectureObject) => (
                  <div
                    key={db.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {db.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {db.technologies.join(', ')}
                      </div>
                    </div>
                    <ConfidenceBadge confidence={db.confidence} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Message Queues ({queues.length})
              </h3>
              <div className="space-y-2">
                {queues.map((q: DetectedArchitectureObject) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {q.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {q.technologies.join(', ')}
                      </div>
                    </div>
                    <ConfidenceBadge confidence={q.confidence} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* APIs & Endpoints */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              APIs &amp; Route Handlers ({apis.length})
            </h3>
            <div className="grid gap-2">
              {apis.map((api: DetectedArchitectureObject) => (
                <div
                  key={api.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {api.name}
                    </span>
                    <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      {api.evidence[0]?.rawCitation}
                    </div>
                  </div>
                  <ConfidenceBadge confidence={api.confidence} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <span className="text-slate-500">
            {proposedObjects.length} proposed object(s) with {dependencies.length} connection(s) ready for model import.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              data-testid="import-detected-objects-button"
            >
              Import {proposedObjects.length} Objects to Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
