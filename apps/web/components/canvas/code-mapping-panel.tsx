'use client';

import React, { useState, useMemo } from 'react';
import {
  type CodeLocationSpec,
  type CodeProvider,
  type ModelObject,
  generateRemoteCodeUrl,
  getCodeMappingFromObject,
} from '@diagramhq/domain';

export interface OpenInRepoButtonProps {
  location: CodeLocationSpec;
  label?: string;
  className?: string;
}

export function OpenInRepoButton({
  location,
  label,
  className = '',
}: OpenInRepoButtonProps): React.JSX.Element {
  const url = useMemo(() => generateRemoteCodeUrl(location), [location]);
  const defaultLabel = location.provider === 'gitlab' ? 'Open in GitLab' : 'Open in GitHub';
  const icon = location.provider === 'gitlab' ? '🦊' : '🐙';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${className}`}
      data-testid="open-in-repo-button"
    >
      <span>{icon}</span>
      <span>{label || defaultLabel}</span>
      <span className="text-[10px] text-slate-400">↗</span>
    </a>
  );
}

export interface CodeMappingBadgeProps {
  location: CodeLocationSpec;
}

export function CodeMappingBadge({ location }: CodeMappingBadgeProps): React.JSX.Element {
  const url = useMemo(() => generateRemoteCodeUrl(location), [location]);
  const icon = location.provider === 'gitlab' ? '🦊' : '🐙';
  const displayTarget = location.filePath || location.folderPath || location.repositoryUrl;
  const lineSuffix =
    location.lineStart !== undefined
      ? location.lineEnd !== undefined && location.lineEnd > location.lineStart
        ? `:${location.lineStart}-${location.lineEnd}`
        : `:${location.lineStart}`
      : '';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors"
      data-testid="code-mapping-badge"
    >
      <span>{icon}</span>
      <span className="truncate max-w-[200px]">
        {`${displayTarget}${lineSuffix}`}
      </span>
      <span className="text-[10px] text-slate-400">↗</span>
    </a>
  );
}

export interface CodeMappingEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  object: ModelObject;
  initialMapping?: CodeLocationSpec;
  onSaveMapping?: (location: CodeLocationSpec) => void;
}

export function CodeMappingEditorDrawer({
  isOpen,
  onClose,
  object,
  initialMapping,
  onSaveMapping,
}: CodeMappingEditorDrawerProps): React.JSX.Element | null {
  const existingMapping = useMemo(() => {
    return initialMapping || getCodeMappingFromObject(object) || undefined;
  }, [initialMapping, object]);

  const [provider, setProvider] = useState<CodeProvider>(existingMapping?.provider || 'github');
  const [repositoryUrl, setRepositoryUrl] = useState(existingMapping?.repositoryUrl || 'acme-corp/service');
  const [branchOrRef, setBranchOrRef] = useState(existingMapping?.branchOrRef || 'main');
  const [folderPath, setFolderPath] = useState(existingMapping?.folderPath || '');
  const [filePath, setFilePath] = useState(existingMapping?.filePath || '');
  const [lineStart, setLineStart] = useState<string>(
    existingMapping?.lineStart !== undefined ? String(existingMapping.lineStart) : ''
  );
  const [lineEnd, setLineEnd] = useState<string>(
    existingMapping?.lineEnd !== undefined ? String(existingMapping.lineEnd) : ''
  );

  const currentLocationSpec: CodeLocationSpec = useMemo(() => {
    return {
      provider,
      repositoryUrl,
      branchOrRef: branchOrRef || 'main',
      folderPath: folderPath.trim() || undefined,
      filePath: filePath.trim() || undefined,
      lineStart: lineStart.trim() ? parseInt(lineStart, 10) : undefined,
      lineEnd: lineEnd.trim() ? parseInt(lineEnd, 10) : undefined,
    };
  }, [provider, repositoryUrl, branchOrRef, folderPath, filePath, lineStart, lineEnd]);

  const previewUrl = useMemo(() => {
    return generateRemoteCodeUrl(currentLocationSpec);
  }, [currentLocationSpec]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveMapping) {
      onSaveMapping(currentLocationSpec);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="code-mapping-editor-drawer"
    >
      <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔗</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Code-to-Architecture Mapping
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {`Bind architectural component "${object.name}" directly to source code.`}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mapping-provider-select"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Code Provider
              </label>
              <select
                id="mapping-provider-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value as CodeProvider)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                data-testid="provider-select"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="mapping-ref-input"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Branch / Git Ref
              </label>
              <input
                id="mapping-ref-input"
                type="text"
                value={branchOrRef}
                onChange={(e) => setBranchOrRef(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                data-testid="ref-input"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="mapping-repo-input"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Repository URL or Slug
            </label>
            <input
              id="mapping-repo-input"
              type="text"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="e.g. acme-corp/order-service or https://github.com/..."
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
              data-testid="repo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mapping-folder-input"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Directory / Package Folder
              </label>
              <input
                id="mapping-folder-input"
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="services/order-service"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                data-testid="folder-input"
              />
            </div>

            <div>
              <label
                htmlFor="mapping-file-input"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Source File Path
              </label>
              <input
                id="mapping-file-input"
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="src/orders/order.controller.ts"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                data-testid="file-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mapping-line-start-input"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Line Start (optional)
              </label>
              <input
                id="mapping-line-start-input"
                type="number"
                min="1"
                value={lineStart}
                onChange={(e) => setLineStart(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                data-testid="line-start-input"
              />
            </div>

            <div>
              <label
                htmlFor="mapping-line-end-input"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Line End (optional)
              </label>
              <input
                id="mapping-line-end-input"
                type="number"
                min="1"
                value={lineEnd}
                onChange={(e) => setLineEnd(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                data-testid="line-end-input"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Computed Remote Traceability Link
            </span>
            <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 break-all" data-testid="preview-url">
              {previewUrl}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <OpenInRepoButton location={currentLocationSpec} />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                data-testid="save-mapping-button"
              >
                Save Code Mapping
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
