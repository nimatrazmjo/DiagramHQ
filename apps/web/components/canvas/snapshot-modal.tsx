'use client';

import React from 'react';
import type { FullArchitectureSnapshot, SnapshotStateDiff } from '@diagramhq/domain';

export interface SnapshotDetailsModalProps {
  snapshot: FullArchitectureSnapshot;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (snapshot: FullArchitectureSnapshot) => void;
  className?: string;
}

export function SnapshotDetailsModal({
  snapshot,
  isOpen,
  onClose,
  onRestore,
  className = '',
}: SnapshotDetailsModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const state = snapshot.state;

  return (
    <div
      data-testid="snapshot-modal-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        data-testid="snapshot-details-modal"
        aria-label="Architecture Snapshot Details"
        className={`w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-xl">
                lock
              </span>
              <h3 className="text-base font-bold text-white">
                {`${snapshot.versionNumber} · ${snapshot.label}`}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Captured by <span className="text-slate-200">{snapshot.createdBy}</span> on{' '}
              {new Date(snapshot.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            data-testid="snapshot-modal-close"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* 6 Dimensions Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 my-5">
          <div
            data-testid="metric-objects"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {state.objects.length}
            </div>
            <div className="text-[11px] text-slate-400">Objects</div>
          </div>

          <div
            data-testid="metric-connections"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {state.connections.length}
            </div>
            <div className="text-[11px] text-slate-400">Connections</div>
          </div>

          <div
            data-testid="metric-views"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {state.views.length}
            </div>
            <div className="text-[11px] text-slate-400">Views</div>
          </div>

          <div
            data-testid="metric-flows"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {state.flows.length}
            </div>
            <div className="text-[11px] text-slate-400">Flows</div>
          </div>

          <div
            data-testid="metric-docs"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {state.documentation.pages.length}
            </div>
            <div className="text-[11px] text-slate-400">Doc Pages</div>
          </div>

          <div
            data-testid="metric-metadata"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
          >
            <div className="text-lg font-bold text-white">
              {Object.keys(state.metadata).length}
            </div>
            <div className="text-[11px] text-slate-400">Metadata Keys</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="material-symbols-outlined text-[15px] text-emerald-400">
              verified
            </span>
            <span>Immutable · Frozen snapshot</span>
          </div>

          {onRestore && (
            <button
              type="button"
              data-testid="snapshot-modal-restore-btn"
              onClick={() => onRestore(snapshot)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">restore</span>
              <span>Restore This Snapshot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface SnapshotDiffModalProps {
  diff: SnapshotStateDiff;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SnapshotDiffModal({
  diff,
  isOpen,
  onClose,
  className = '',
}: SnapshotDiffModalProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div
      data-testid="snapshot-diff-modal"
      className={`fixed top-14 right-4 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 z-50 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h4 className="font-bold text-white">Snapshot Comparison Diff</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div className="space-y-2.5 mt-3">
        <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Objects:</span>
          <span className="font-mono text-emerald-400">{`+${diff.objects.added}`}</span>
          <span className="font-mono text-amber-400">{`~${diff.objects.modified}`}</span>
          <span className="font-mono text-rose-400">{`-${diff.objects.removed}`}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Connections:</span>
          <span className="font-mono text-emerald-400">{`+${diff.connections.added}`}</span>
          <span className="font-mono text-amber-400">{`~${diff.connections.modified}`}</span>
          <span className="font-mono text-rose-400">{`-${diff.connections.removed}`}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Views:</span>
          <span className="font-mono text-emerald-400">{`+${diff.views.added}`}</span>
          <span className="font-mono text-amber-400">{`~${diff.views.modified}`}</span>
          <span className="font-mono text-rose-400">{`-${diff.views.removed}`}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Flows:</span>
          <span className="font-mono text-emerald-400">{`+${diff.flows.added}`}</span>
          <span className="font-mono text-amber-400">{`~${diff.flows.modified}`}</span>
          <span className="font-mono text-rose-400">{`-${diff.flows.removed}`}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-slate-400">Doc Pages:</span>
          <span className="font-mono text-emerald-400">{`+${diff.docPages.added}`}</span>
          <span className="font-mono text-amber-400">{`~${diff.docPages.modified}`}</span>
          <span className="font-mono text-rose-400">{`-${diff.docPages.removed}`}</span>
        </div>
      </div>
    </div>
  );
}
