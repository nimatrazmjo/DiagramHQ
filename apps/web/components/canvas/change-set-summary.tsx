'use client';

import React, { useState } from 'react';
import type { ArchitectureChangeSet, ChangeEntityKind } from '@diagramhq/domain';

export interface ImpactAnalysisBadgeProps {
  changeSet: ArchitectureChangeSet;
  onClick?: () => void;
}

export function ImpactAnalysisBadge({ changeSet, onClick }: ImpactAnalysisBadgeProps) {
  const { counts } = changeSet.affected;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors shadow-sm"
      aria-label="Impact Analysis Summary"
    >
      <span className="material-symbols-outlined text-sm text-amber-400">
        crisis_alert
      </span>
      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span className="text-emerald-400">{`${changeSet.changes.totalDirectChanges} changes`}</span>
        <span className="text-slate-500">•</span>
        <span className="text-cyan-400">{`${counts.objects} objs`}</span>
        <span className="text-slate-500">•</span>
        <span className="text-purple-400">{`${counts.flows} flows`}</span>
        <span className="text-slate-500">•</span>
        <span className="text-amber-400">{`${counts.teams} teams`}</span>
      </div>
    </button>
  );
}

export interface ChangeSetSummaryProps {
  changeSet: ArchitectureChangeSet;
  onClose?: () => void;
  onOpenPr?: () => void;
}

export function ChangeSetSummary({
  changeSet,
  onClose,
  onOpenPr,
}: ChangeSetSummaryProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'impact'>('changes');
  const { changes, affected } = changeSet;

  const renderIcon = (kind: ChangeEntityKind) => {
    return kind === 'object' ? 'deployed_code' : 'linear_scale';
  };

  return (
    <div
      className="w-96 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-4 text-xs text-slate-200 backdrop-blur-md"
      role="dialog"
      aria-label="Architecture Change Set"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <span className="material-symbols-outlined text-base text-cyan-400">
              published_with_changes
            </span>
            <span>{changeSet.title}</span>
          </div>
          {changeSet.description && (
            <span className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">
              {changeSet.description}
            </span>
          )}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-3 p-1 rounded-lg bg-slate-950/60 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('changes')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'changes'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {`Direct Changes (${changes.totalDirectChanges})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('impact')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'impact'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {`Impact Analysis (${affected.counts.objects + affected.counts.flows + affected.counts.teams})`}
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-3 max-h-72 overflow-y-auto pr-1">
        {activeTab === 'changes' ? (
          <div className="space-y-3">
            {/* Added */}
            {changes.added.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span>+</span>
                  <span>{`Added (${changes.added.length})`}</span>
                </div>
                {changes.added.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-emerald-950/40"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span className="material-symbols-outlined text-sm text-slate-400">
                        {renderIcon(item.kind)}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.details && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modified */}
            {changes.modified.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <span>~</span>
                  <span>{`Modified (${changes.modified.length})`}</span>
                </div>
                {changes.modified.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-amber-950/40"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span className="material-symbols-outlined text-sm text-slate-400">
                        {renderIcon(item.kind)}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.details && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Removed */}
            {changes.removed.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                  <span>-</span>
                  <span>{`Removed (${changes.removed.length})`}</span>
                </div>
                {changes.removed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-rose-950/40"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span className="material-symbols-outlined text-sm text-slate-400">
                        {renderIcon(item.kind)}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.details && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Affected Objects */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-cyan-400 flex items-center justify-between">
                <span>Affected Architecture Objects</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {`${affected.counts.objects}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-2 rounded bg-slate-950/40 border border-slate-800">
                {affected.affectedObjectIds.map((id) => (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded text-[11px] bg-cyan-950/60 border border-cyan-800/40 text-cyan-200 font-mono"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            {/* Affected Flows */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-purple-400 flex items-center justify-between">
                <span>Affected Business Flows</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {`${affected.counts.flows}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-2 rounded bg-slate-950/40 border border-slate-800">
                {affected.affectedFlowIds.length === 0 ? (
                  <span className="text-[11px] text-slate-500">None affected</span>
                ) : (
                  affected.affectedFlowIds.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded text-[11px] bg-purple-950/60 border border-purple-800/40 text-purple-200 font-mono"
                    >
                      {id}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Affected Teams */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                <span>Stakeholder Teams Impacted</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {`${affected.counts.teams}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-2 rounded bg-slate-950/40 border border-slate-800">
                {affected.affectedTeamIds.length === 0 ? (
                  <span className="text-[11px] text-slate-500">None affected</span>
                ) : (
                  affected.affectedTeamIds.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded text-[11px] bg-amber-950/60 border border-amber-800/40 text-amber-200 font-mono"
                    >
                      {id}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {onOpenPr && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onOpenPr}
            className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              merge_type
            </span>
            <span>Create Pull Request</span>
          </button>
        </div>
      )}
    </div>
  );
}
