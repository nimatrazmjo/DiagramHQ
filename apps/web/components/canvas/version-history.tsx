'use client';

import React from 'react';
import type { LiveArchitectureVersion, NumberedSnapshot } from '@diagramhq/domain';

export interface SnapshotBadgeProps {
  snapshot: NumberedSnapshot;
  className?: string;
}

export function SnapshotBadge({
  snapshot,
  className = '',
}: SnapshotBadgeProps): JSX.Element {
  return (
    <span
      data-testid="snapshot-badge"
      data-version-number={snapshot.versionNumber}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${className}`}
    >
      <span className="material-symbols-outlined text-[13px]">lock</span>
      <span className="font-bold">{snapshot.versionNumber}</span>
      <span className="opacity-75">{snapshot.label}</span>
    </span>
  );
}

export interface VersionTimelineProps {
  liveVersion: LiveArchitectureVersion;
  snapshots: NumberedSnapshot[];
  onSelectSnapshot?: (snapshot: NumberedSnapshot) => void;
  onCreateSnapshot?: () => void;
  onRestoreSnapshot?: (snapshot: NumberedSnapshot) => void;
  className?: string;
}

export function VersionTimeline({
  liveVersion,
  snapshots,
  onSelectSnapshot,
  onCreateSnapshot,
  onRestoreSnapshot,
  className = '',
}: VersionTimelineProps): JSX.Element {
  return (
    <div
      data-testid="version-timeline"
      className={`bg-slate-900 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-200 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed text-lg">
            history
          </span>
          <h3 className="font-bold text-white text-sm">Version History</h3>
        </div>
        {onCreateSnapshot && (
          <button
            type="button"
            data-testid="create-snapshot-btn"
            onClick={onCreateSnapshot}
            className="px-2.5 py-1 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 text-xs"
          >
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
            <span>Create Snapshot</span>
          </button>
        )}
      </div>

      {/* Live Version Node */}
      <div className="mt-4 space-y-3">
        <div
          data-testid="live-version-item"
          className="p-3 rounded-xl bg-slate-950 border border-blue-500/40 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{liveVersion.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono uppercase">
                  Live Editable
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {`${liveVersion.objects.length} objects · ${liveVersion.connections.length} connections`}
              </p>
            </div>
          </div>
        </div>

        {/* Snapshots List */}
        <div className="space-y-2 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Immutable Releases
          </h4>

          {snapshots.length === 0 ? (
            <p
              data-testid="snapshots-empty"
              className="text-slate-500 text-[11px] py-2 italic text-center"
            >
              No snapshots created yet.
            </p>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                data-testid="snapshot-item"
                data-snapshot-id={snap.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-500 text-base">
                    lock
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-300 text-xs font-mono">
                        {snap.versionNumber}
                      </span>
                      <span className="text-white font-medium">{snap.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {`By ${snap.createdBy} · ${snap.snapshotData.objects.length} objects captured`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onSelectSnapshot && (
                    <button
                      type="button"
                      data-testid={`view-snapshot-${snap.versionNumber}`}
                      onClick={() => onSelectSnapshot(snap)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition-colors"
                    >
                      View
                    </button>
                  )}
                  {onRestoreSnapshot && (
                    <button
                      type="button"
                      data-testid={`restore-snapshot-${snap.versionNumber}`}
                      onClick={() => onRestoreSnapshot(snap)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
