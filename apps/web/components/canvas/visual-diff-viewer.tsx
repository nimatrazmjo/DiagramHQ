'use client';

import React, { useState } from 'react';
import type {
  VisualArchitectureDiffResult,
  DiffChangeType,
  ObjectDiffItem,
  ConnectionDiffItem,
} from '@diagramhq/domain';

export interface DiffLegendProps {
  diff: VisualArchitectureDiffResult;
  selectedFilter?: DiffChangeType | 'all';
  onFilterChange?: (filter: DiffChangeType | 'all') => void;
}

export function DiffLegend({
  diff,
  selectedFilter = 'all',
  onFilterChange,
}: DiffLegendProps) {
  const { counts, colors } = diff;

  const items: Array<{
    key: DiffChangeType;
    label: string;
    count: number;
    prefix: string;
    color: string;
  }> = [
    { key: 'added', label: 'Added', count: counts.added, prefix: '+', color: colors.added },
    { key: 'modified', label: 'Modified', count: counts.modified, prefix: '~', color: colors.modified },
    { key: 'removed', label: 'Removed', count: counts.removed, prefix: '-', color: colors.removed },
    { key: 'moved', label: 'Moved', count: counts.moved, prefix: '↕', color: colors.moved },
  ];

  return (
    <div
      className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm text-xs shadow-md"
      role="region"
      aria-label="Diff Legend"
    >
      <button
        type="button"
        onClick={() => onFilterChange?.('all')}
        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
          selectedFilter === 'all'
            ? 'bg-slate-800 text-white'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        {`All (${diff.counts.totalChanges})`}
      </button>

      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onFilterChange?.(item.key)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            selectedFilter === item.key
              ? 'bg-slate-800 text-white ring-1 ring-slate-600'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
          <span className="font-mono text-[10px] text-slate-400">
            {`${item.prefix}${item.count}`}
          </span>
        </button>
      ))}
    </div>
  );
}

export interface VisualDiffViewerProps {
  diff: VisualArchitectureDiffResult;
  sourceLabel?: string;
  targetLabel?: string;
  onClose?: () => void;
  onSelectEntity?: (id: string) => void;
}

export function VisualDiffViewer({
  diff,
  sourceLabel = 'Base Version',
  targetLabel = 'Target Version',
  onClose,
  onSelectEntity,
}: VisualDiffViewerProps) {
  const [filter, setFilter] = useState<DiffChangeType | 'all'>('all');

  const filteredObjects = diff.objects.filter(
    (o) => o.changeType !== 'unchanged' && (filter === 'all' || o.changeType === filter)
  );

  const filteredConnections = diff.connections.filter(
    (c) => c.changeType !== 'unchanged' && (filter === 'all' || c.changeType === filter)
  );

  return (
    <div
      className="w-96 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-4 text-xs text-slate-200 backdrop-blur-md"
      role="dialog"
      aria-label="Visual Architecture Diff"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <span className="material-symbols-outlined text-base text-cyan-400">
              difference
            </span>
            <span>Architecture Diff</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {`${sourceLabel} → ${targetLabel}`}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Filter Legend */}
      <div className="mt-3">
        <DiffLegend
          diff={diff}
          selectedFilter={filter}
          onFilterChange={(f) => setFilter(f)}
        />
      </div>

      {/* Changes List */}
      <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredObjects.length === 0 && filteredConnections.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            No changes found in this filter category
          </div>
        ) : (
          <>
            {filteredObjects.map((obj: ObjectDiffItem) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => onSelectEntity?.(obj.id)}
                className="w-full flex flex-col p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-slate-100">
                    <span className="material-symbols-outlined text-sm text-slate-400">
                      deployed_code
                    </span>
                    <span className="truncate max-w-[180px]">{obj.name}</span>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-950"
                    style={{ backgroundColor: obj.color }}
                  >
                    {obj.changeType}
                  </span>
                </div>

                {obj.changeType === 'moved' && obj.previousPosition && obj.currentPosition && (
                  <div className="mt-1 font-mono text-[10px] text-purple-300">
                    {`Position: (${obj.previousPosition.x}, ${obj.previousPosition.y}) → (${obj.currentPosition.x}, ${obj.currentPosition.y})`}
                  </div>
                )}

                {obj.changeType === 'modified' && obj.fieldChanges.length > 0 && (
                  <div className="mt-1 text-[11px] text-amber-300/90 space-y-0.5">
                    {obj.fieldChanges.map((fc, i) => (
                      <div key={i} className="truncate">
                        {`${fc.field}: ${String(fc.from)} → ${String(fc.to)}`}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}

            {filteredConnections.map((conn: ConnectionDiffItem) => (
              <button
                key={conn.id}
                type="button"
                onClick={() => onSelectEntity?.(conn.id)}
                className="w-full flex flex-col p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-slate-100">
                    <span className="material-symbols-outlined text-sm text-slate-400">
                      linear_scale
                    </span>
                    <span className="truncate max-w-[180px]">
                      {conn.label || 'Connection'}
                    </span>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-950"
                    style={{ backgroundColor: conn.color }}
                  >
                    {conn.changeType}
                  </span>
                </div>

                {conn.changeType === 'modified' && conn.fieldChanges.length > 0 && (
                  <div className="mt-1 text-[11px] text-amber-300/90 space-y-0.5">
                    {conn.fieldChanges.map((fc, i) => (
                      <div key={i} className="truncate">
                        {`${fc.field}: ${String(fc.from)} → ${String(fc.to)}`}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
