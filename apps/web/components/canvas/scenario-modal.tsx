'use client';

import React, { useState } from 'react';
import type {
  ArchitectureScenario,
  ScenarioComparison,
  ScenarioStatus,
} from '@diagramhq/domain';

export interface ScenarioBadgeProps {
  scenario: ArchitectureScenario;
  onClick?: () => void;
}

export function ScenarioBadge({ scenario, onClick }: ScenarioBadgeProps) {
  const statusColors: Record<ScenarioStatus, string> = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    active: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    promoted: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    archived: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors shadow-sm text-xs"
      aria-label="Scenario Details"
    >
      <span className="material-symbols-outlined text-sm text-indigo-400">
        science
      </span>
      <span className="font-semibold text-white truncate max-w-[150px]">
        {scenario.name}
      </span>
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${
          statusColors[scenario.status] || statusColors.draft
        }`}
      >
        {scenario.status}
      </span>
      {scenario.simulatedMetrics?.costDeltaPercent !== undefined && (
        <span
          className={`text-[10px] font-mono font-medium ${
            scenario.simulatedMetrics.costDeltaPercent <= 0
              ? 'text-emerald-400'
              : 'text-rose-400'
          }`}
        >
          {`${scenario.simulatedMetrics.costDeltaPercent > 0 ? '+' : ''}${
            scenario.simulatedMetrics.costDeltaPercent
          }% cost`}
        </span>
      )}
    </button>
  );
}

export interface ScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ArchitectureScenario;
  comparison: ScenarioComparison;
  onPromote?: (scenario: ArchitectureScenario) => void;
}

export function ScenarioComparisonModal({
  isOpen,
  onClose,
  scenario,
  comparison,
  onPromote,
}: ScenarioComparisonModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'objects' | 'connections'>('summary');

  if (!isOpen) return null;

  const { summary, addedObjects, modifiedObjects, removedObjects, addedConnections, removedConnections } = comparison;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scenario Comparison"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">
              science
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {`Hypothetical Scenario: ${scenario.name}`}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {scenario.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing what-if proposal against base architecture without mutating main
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Scenario Modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Hypothesis banner */}
        <div className="px-6 py-3 bg-indigo-950/40 border-b border-indigo-900/40 flex items-start gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-sm mt-0.5">
            lightbulb
          </span>
          <div className="text-xs text-indigo-200">
            <span className="font-semibold text-indigo-100">Hypothesis: </span>
            {scenario.hypothesis}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/50 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-indigo-400 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Summary & Impact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('objects')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'objects'
                ? 'border-indigo-400 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {`Objects (${summary.addedObjectsCount + summary.modifiedObjectsCount + summary.removedObjectsCount})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'connections'
                ? 'border-indigo-400 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {`Connections (${summary.addedConnectionsCount + summary.removedConnectionsCount})`}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'summary' && (
            <>
              {/* Stat Counters */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xl font-bold text-emerald-400">
                    {`+${summary.addedObjectsCount}`}
                  </div>
                  <div className="text-[11px] text-slate-400">Added Objects</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xl font-bold text-amber-400">
                    {`~${summary.modifiedObjectsCount}`}
                  </div>
                  <div className="text-[11px] text-slate-400">Modified Objects</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xl font-bold text-rose-400">
                    {`-${summary.removedObjectsCount}`}
                  </div>
                  <div className="text-[11px] text-slate-400">Removed Objects</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xl font-bold text-cyan-400">
                    {summary.unchangedObjectsCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Unchanged Objects</div>
                </div>
              </div>

              {/* Simulated Metrics Card */}
              {comparison.simulatedMetrics && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Simulated Operational Impact
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {comparison.simulatedMetrics.costDeltaPercent !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-emerald-400">
                          payments
                        </span>
                        <div>
                          <div className="text-xs text-slate-400">Est. Cloud Cost</div>
                          <div className="text-sm font-bold text-emerald-400 font-mono">
                            {`${comparison.simulatedMetrics.costDeltaPercent > 0 ? '+' : ''}${
                              comparison.simulatedMetrics.costDeltaPercent
                            }%`}
                          </div>
                        </div>
                      </div>
                    )}
                    {comparison.simulatedMetrics.latencyDeltaMs !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-indigo-400">
                          speed
                        </span>
                        <div>
                          <div className="text-xs text-slate-400">Est. Latency Delta</div>
                          <div className="text-sm font-bold text-indigo-300 font-mono">
                            {`${comparison.simulatedMetrics.latencyDeltaMs > 0 ? '+' : ''}${
                              comparison.simulatedMetrics.latencyDeltaMs
                            }ms`}
                          </div>
                        </div>
                      </div>
                    )}
                    {comparison.simulatedMetrics.riskScore && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-amber-400">
                          shield
                        </span>
                        <div>
                          <div className="text-xs text-slate-400">Risk Assessment</div>
                          <div className="text-sm font-bold uppercase text-amber-300 font-mono">
                            {comparison.simulatedMetrics.riskScore}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {comparison.simulatedMetrics.notes && (
                    <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      {comparison.simulatedMetrics.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Isolation Notice */}
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-cyan-400">
                  lock
                </span>
                <span>
                  All changes shown are hypothetical simulations. The live production model and main branch remain completely unaffected.
                </span>
              </div>
            </>
          )}

          {activeTab === 'objects' && (
            <div className="space-y-4">
              {addedObjects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    Hypothetically Added ({addedObjects.length})
                  </h4>
                  <div className="space-y-1.5">
                    {addedObjects.map((obj) => (
                      <div
                        key={obj.id}
                        className="px-3 py-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-300">{obj.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({obj.kind})</span>
                        </div>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-900 text-emerald-200">
                          +NEW
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modifiedObjects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    Hypothetically Modified ({modifiedObjects.length})
                  </h4>
                  <div className="space-y-1.5">
                    {modifiedObjects.map((m) => (
                      <div
                        key={m.hypothetical.id}
                        className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-300">
                            {m.hypothetical.name}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            Fields: {m.changedFields.join(', ')}
                          </span>
                        </div>
                        {m.base.name !== m.hypothetical.name && (
                          <div className="text-slate-400 text-[11px]">
                            Renamed from <span className="line-through">{m.base.name}</span> to{' '}
                            <span className="text-white font-medium">{m.hypothetical.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {removedObjects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    Hypothetically Removed ({removedObjects.length})
                  </h4>
                  <div className="space-y-1.5">
                    {removedObjects.map((obj) => (
                      <div
                        key={obj.id}
                        className="px-3 py-2 bg-rose-950/20 border border-rose-900/40 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-rose-300 line-through">
                          {obj.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-900 text-rose-200">
                          -REMOVED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addedObjects.length === 0 && modifiedObjects.length === 0 && removedObjects.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  No object changes in this hypothetical scenario.
                </p>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-4">
              {addedConnections.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    Hypothetically Added Connections ({addedConnections.length})
                  </h4>
                  <div className="space-y-1.5">
                    {addedConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="px-3 py-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-emerald-300">
                          {conn.label || 'Connection'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {conn.sourceObjectId} → {conn.targetObjectId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {removedConnections.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    Hypothetically Removed Connections ({removedConnections.length})
                  </h4>
                  <div className="space-y-1.5">
                    {removedConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="px-3 py-2 bg-rose-950/20 border border-rose-900/40 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-rose-300 line-through">
                          {conn.label || 'Connection'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {conn.sourceObjectId} → {conn.targetObjectId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addedConnections.length === 0 && removedConnections.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  No connection changes in this hypothetical scenario.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400">
            Status: <span className="text-indigo-400 font-semibold">{scenario.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Close
            </button>
            {onPromote && scenario.status !== 'promoted' && (
              <button
                type="button"
                onClick={() => onPromote(scenario)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">fork_right</span>
                Promote to Branch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
