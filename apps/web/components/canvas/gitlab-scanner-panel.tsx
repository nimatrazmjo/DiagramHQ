'use client';

import React, { useState } from 'react';
import type {
  GitLabScanResult,
  DetectedArchitectureObject,
  DetectedConnection,
} from '@diagramhq/domain';
import { ConfidenceBadge } from './ai-confidence-badge';

export interface GitLabConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanProject: (namespace: string, project: string, ref: string) => void;
  isScanning?: boolean;
}

export function GitLabConnectModal({
  isOpen,
  onClose,
  onScanProject,
  isScanning = false,
}: GitLabConnectModalProps): React.JSX.Element | null {
  const [projectInput, setProjectInput] = useState('acme-corp/platform/checkout-service');
  const [ref, setRef] = useState('main');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = projectInput.trim().split('/');
    if (parts.length >= 2) {
      const project = parts.pop() || 'project';
      const namespace = parts.join('/');
      onScanProject(namespace, project, ref);
    } else {
      onScanProject('acme-corp', projectInput.trim() || 'project', ref);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="gitlab-connect-modal"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦊</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Connect GitLab Project
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
              htmlFor="gitlab-project-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              GitLab Project Path (namespace/project or URL)
            </label>
            <input
              id="gitlab-project-input"
              type="text"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              placeholder="e.g. acme-corp/platform/checkout-service"
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="gitlab-ref-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Branch / Tag / Ref
            </label>
            <input
              id="gitlab-ref-input"
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
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
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
              data-testid="start-gitlab-scan-button"
            >
              {isScanning ? 'Scanning Codebase...' : 'Scan GitLab Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface GitLabScanResultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: GitLabScanResult;
  onImportObjects?: (objects: DetectedArchitectureObject[], connections: DetectedConnection[]) => void;
}

export function GitLabScanResultDrawer({
  isOpen,
  onClose,
  scanResult,
  onImportObjects,
}: GitLabScanResultDrawerProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const {
    project,
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
      data-testid="gitlab-scan-drawer"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🦊</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                GitLab Project Architecture Discovery
              </h2>
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {`${project.namespace}/${project.project} (${project.ref || 'main'})`}
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
              className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium text-[11px]"
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {svc.technologies.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                    <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
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
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              data-testid="import-gitlab-objects-button"
            >
              Import {proposedObjects.length} Objects to Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
