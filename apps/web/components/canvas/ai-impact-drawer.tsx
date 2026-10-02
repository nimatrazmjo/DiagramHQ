'use client';

import React from 'react';
import type {
  ArchitecturalImpact,
  AIImpactNarrative,
  ImpactRiskLevel,
} from '@diagramhq/domain';

export interface ImpactMetricsBadgeProps {
  riskLevel: ImpactRiskLevel;
  totalBlastRadius: number;
}

export function ImpactMetricsBadge({
  riskLevel,
  totalBlastRadius,
}: ImpactMetricsBadgeProps) {
  const styles: Record<ImpactRiskLevel, { badge: string; text: string; icon: string }> = {
    low: {
      badge: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
      text: 'Low Risk',
      icon: 'verified_user',
    },
    medium: {
      badge: 'bg-amber-950/80 border-amber-800 text-amber-300',
      text: 'Medium Risk',
      icon: 'warning',
    },
    high: {
      badge: 'bg-orange-950/80 border-orange-800 text-orange-300',
      text: 'High Risk',
      icon: 'priority_high',
    },
    critical: {
      badge: 'bg-rose-950/80 border-rose-800 text-rose-300 animate-pulse',
      text: 'Critical Blast Radius',
      icon: 'gpp_bad',
    },
  };

  const style = styles[riskLevel] || styles.low;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${style.badge}`}
    >
      <span className="material-symbols-outlined text-sm">{style.icon}</span>
      <span>{style.text}</span>
      <span className="font-mono text-[10px] ml-1 opacity-80">
        {`(${totalBlastRadius} affected)`}
      </span>
    </div>
  );
}

export interface AIImpactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  impact?: ArchitecturalImpact | null;
  narrative?: AIImpactNarrative | null;
  onSelectEntity?: (entityId: string) => void;
}

export function AIImpactDrawer({
  isOpen,
  onClose,
  impact,
  narrative,
  onSelectEntity,
}: AIImpactDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100"
      role="region"
      aria-label="AI Impact Analysis Drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-cyan-400 text-2xl">
            radar
          </span>
          <div>
            <h2 className="text-base font-bold text-white">
              AI Impact & Blast Radius Analysis
            </h2>
            <p className="text-xs text-slate-400">
              Grounded architectural dependency and risk narration
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close Impact Drawer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {impact && narrative ? (
          <>
            {/* Target & Risk Banner */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
                    Target Component
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {impact.targetObject.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {impact.targetObject.id} · Kind: {impact.targetObject.kind}
                  </span>
                </div>
                <ImpactMetricsBadge
                  riskLevel={impact.riskLevel}
                  totalBlastRadius={impact.metrics.totalBlastRadiusCount}
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <div className="text-cyan-400 font-bold text-sm">
                    {impact.metrics.directDependentsCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Direct Deps</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <div className="text-purple-400 font-bold text-sm">
                    {impact.metrics.indirectDependentsCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Indirect Deps</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <div className="text-amber-400 font-bold text-sm">
                    {impact.metrics.affectedFlowsCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Flows</div>
                </div>
              </div>
            </div>

            {/* AI Narrative Breakdown */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-base">
                  auto_awesome
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Synthesized Narrative
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                {narrative.executiveSummary}
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-cyan-400">Blast Radius: </span>
                  <span className="text-slate-300">{narrative.breakdown.blastRadiusAnalysis}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-amber-400">Flow Disruptions: </span>
                  <span className="text-slate-300">{narrative.breakdown.flowDisruptions}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-emerald-400">Team Stakeholders: </span>
                  <span className="text-slate-300">{narrative.breakdown.teamStakeholders}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-rose-400">Critical Path Risks: </span>
                  <span className="text-slate-300">{narrative.breakdown.criticalPathRisks}</span>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="pt-2 border-t border-slate-850 space-y-1.5">
                <span className="text-[11px] font-semibold text-white">Recommended Safeguards:</span>
                <ul className="space-y-1">
                  {narrative.recommendedActions.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                      <span className="material-symbols-outlined text-xs text-cyan-400 shrink-0 mt-0.5">
                        check
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Direct & Indirect Dependents List */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Impacted Entity Catalog
              </h4>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">Direct Dependents:</div>
                <div className="flex flex-wrap gap-1.5">
                  {impact.directDependents.length > 0 ? (
                    impact.directDependents.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => onSelectEntity?.(dep.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs text-slate-200 transition-colors"
                      >
                        {dep.name} <span className="text-[9px] font-mono text-slate-500">[{dep.id}]</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-400 pt-2">Indirect Dependents:</div>
                <div className="flex flex-wrap gap-1.5">
                  {impact.indirectDependents.length > 0 ? (
                    impact.indirectDependents.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => onSelectEntity?.(dep.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-purple-500 text-xs text-slate-200 transition-colors"
                      >
                        {dep.name} <span className="text-[9px] font-mono text-slate-500">[{dep.id}]</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
              troubleshoot
            </span>
            <p className="text-sm font-medium">Select an object to analyze blast radius</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click any architecture node on the canvas to compute direct/indirect dependencies, affected flows, and AI risk narrative.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
