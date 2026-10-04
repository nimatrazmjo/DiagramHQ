'use client';

import React, { useState } from 'react';
import type { ArchitectureBranch } from '@diagramhq/domain';

export interface BranchBadgeProps {
  currentBranch: ArchitectureBranch;
  onClick?: () => void;
}

export function BranchBadge({ currentBranch, onClick }: BranchBadgeProps) {
  const isMain = currentBranch.name === 'main';

  return (
    <button
      type="button"
      data-testid="branch-badge"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors shadow-sm"
      aria-label="Current Branch"
    >
      <span className="material-symbols-outlined text-sm text-cyan-400">
        fork_right
      </span>
      <span data-testid="branch-badge-name" className="font-mono font-semibold text-slate-100">{`${currentBranch.name}`}</span>
      {isMain ? (
        <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
          default
        </span>
      ) : (
        <span className="text-[11px] text-slate-400">
          {currentBranch.parentBranchId ? 'feature' : 'isolated'}
        </span>
      )}
    </button>
  );
}

export interface BranchSelectorProps {
  branches: ArchitectureBranch[];
  currentBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onCreateBranch?: (name: string, description?: string) => void;
  onClose?: () => void;
}

export function BranchSelector({
  branches,
  currentBranchId,
  onSelectBranch,
  onCreateBranch,
  onClose,
}: BranchSelectorProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      setError('Branch name cannot be empty');
      return;
    }
    if (branches.some((b) => b.name === newBranchName.trim())) {
      setError(`Branch '${newBranchName.trim()}' already exists`);
      return;
    }
    setError(null);
    onCreateBranch?.(newBranchName.trim(), newBranchDesc.trim() || undefined);
    setNewBranchName('');
    setNewBranchDesc('');
    setIsCreating(false);
  };

  return (
    <div
      data-testid="branch-selector"
      className="w-80 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-4 text-xs text-slate-200 backdrop-blur-md"
      role="dialog"
      aria-label="Branch Switcher"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
          <span className="material-symbols-outlined text-base text-cyan-400">
            account_tree
          </span>
          <span>Switch Architecture Branch</span>
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="branch-selector-close"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Branch List */}
      <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {branches.map((b) => {
          const isActive = b.id === currentBranchId;
          return (
            <button
              key={b.id}
              type="button"
              data-testid={`branch-item-${b.name}`}
              onClick={() => onSelectBranch(b.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-slate-100">{`${b.name}`}</span>
                  {b.name === 'main' && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      default
                    </span>
                  )}
                </div>
                {b.description && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {b.description}
                  </span>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                  <span>{`${b.state.objects.length} objects`}</span>
                  <span>•</span>
                  <span>{`${b.state.connections.length} links`}</span>
                  <span>•</span>
                  <span>{`${b.state.adrs.length} ADRs`}</span>
                </div>
              </div>
              {isActive && (
                <span className="material-symbols-outlined text-base text-cyan-400">
                  check
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Creation form or trigger button */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        {isCreating ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              type="text"
              data-testid="branch-name-input"
              placeholder="Branch name (e.g. feat/billing)"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <input
              type="text"
              data-testid="branch-desc-input"
              placeholder="Description (optional)"
              value={newBranchDesc}
              onChange={(e) => setNewBranchDesc(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {error && <div data-testid="branch-create-error" className="text-[11px] text-rose-400">{error}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                data-testid="branch-create-cancel-btn"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="branch-create-submit-btn"
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                Create Branch
              </button>
            </div>
          </form>
        ) : (
          onCreateBranch && (
            <button
              type="button"
              data-testid="branch-create-toggle-btn"
              onClick={() => setIsCreating(true)}
              className="w-full py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-cyan-400">
                add
              </span>
              <span>Create New Branch</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
