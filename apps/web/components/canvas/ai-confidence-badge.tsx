'use client';

import React, { useState } from 'react';
import type {
  AIEvidence,
  ConfidenceAssessment,
  ConfidenceTier,
  GroundedAssertion,
  GroundedDependency,
} from '@diagramhq/domain';

export interface ConfidenceBadgeProps {
  confidence: ConfidenceAssessment;
  showPercent?: boolean;
  onClick?: () => void;
}

export function ConfidenceBadge({
  confidence,
  showPercent = true,
  onClick,
}: ConfidenceBadgeProps): React.JSX.Element {
  const { score, tier, isLowConfidence } = confidence;
  const percent = Math.round(score * 100);

  const colors: Record<ConfidenceTier, { bg: string; text: string; border: string }> = {
    high: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-500/30',
    },
    medium: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500/30',
    },
    low: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-500/30',
    },
  };

  const current = colors[tier] ?? colors.medium;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${current.bg} ${current.text} ${current.border} ${
        onClick ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
      }`}
      data-testid="confidence-badge"
      data-tier={tier}
      data-low-confidence={isLowConfidence}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          tier === 'high'
            ? 'bg-emerald-500'
            : tier === 'medium'
              ? 'bg-amber-500'
              : 'bg-rose-500 animate-pulse'
        }`}
      />
      <span>
        {isLowConfidence ? 'Flagged Low Confidence' : `${tier.toUpperCase()}`}
      </span>
      {showPercent && (
        <span className="opacity-75 font-mono text-[11px]">({percent}%)</span>
      )}
    </button>
  );
}

export interface AIEvidenceCardProps {
  evidence: AIEvidence;
}

export function AIEvidenceCard({ evidence }: AIEvidenceCardProps): React.JSX.Element {
  const { sourceType, location, description, rawCitation, strength } = evidence;
  const strengthPercent = Math.round(strength * 100);

  return (
    <div
      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs"
      data-testid="ai-evidence-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {sourceType.replace(/_/g, ' ').toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
          <span>Strength:</span>
          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
            {strengthPercent}%
          </span>
        </div>
      </div>

      <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-200/80 dark:border-slate-800 break-all select-all">
        {rawCitation}
      </div>

      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>

      {location?.snippet && (
        <pre className="p-2 rounded bg-slate-950 text-slate-200 text-[10px] font-mono overflow-x-auto">
          <code>{location.snippet}</code>
        </pre>
      )}
    </div>
  );
}

export interface AIEvidenceInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  groundedDependencies?: GroundedDependency[];
  groundedAssertions?: GroundedAssertion[];
  onVerifyItem?: (id: string) => void;
}

export function AIEvidenceInspector({
  isOpen,
  onClose,
  groundedDependencies = [],
  groundedAssertions = [],
  onVerifyItem,
}: AIEvidenceInspectorProps): React.JSX.Element | null {
  const [filter, setFilter] = useState<'all' | 'flagged' | 'high'>('all');

  if (!isOpen) return null;

  const totalItems = groundedDependencies.length + groundedAssertions.length;
  const lowConfidenceCount =
    groundedDependencies.filter((d) => d.confidence.isLowConfidence).length +
    groundedAssertions.filter((a) => a.confidence.isLowConfidence).length;

  const filteredDependencies = groundedDependencies.filter((d) => {
    if (filter === 'flagged') return d.confidence.isLowConfidence;
    if (filter === 'high') return d.confidence.tier === 'high';
    return true;
  });

  const filteredAssertions = groundedAssertions.filter((a) => {
    if (filter === 'flagged') return a.confidence.isLowConfidence;
    if (filter === 'high') return a.confidence.tier === 'high';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="ai-evidence-inspector-modal"
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>AI Evidence & Grounding Inspector</span>
              {lowConfidenceCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {lowConfidenceCount} Flagged
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspecting grounded code citations and calibrated confidence scores for AI-generated architecture claims.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filter Bar & Summary */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Filter:</span>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({totalItems})
            </button>
            <button
              type="button"
              onClick={() => setFilter('flagged')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'flagged'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Flagged Low Confidence ({lowConfidenceCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('high')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'high'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              High Confidence
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredDependencies.length === 0 && filteredAssertions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No architectural items match the current filter.
            </div>
          ) : (
            <>
              {filteredDependencies.map((dep) => (
                <div
                  key={dep.connection.id}
                  className={`p-4 rounded-xl border transition-all ${
                    dep.confidence.isLowConfidence
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                  data-testid="grounded-dependency-item"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          Dependency
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {dep.connection.label || 'Generated Dependency'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Source: {dep.sourceObjectId} → Target: {dep.targetObjectId}
                      </p>
                    </div>
                    <ConfidenceBadge confidence={dep.confidence} />
                  </div>

                  {dep.confidence.isLowConfidence && (
                    <div className="mb-3 p-3 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>⚠️ Low Confidence Warning</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {dep.confidence.reasons.map((reason: string, idx: number) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                      <p className="font-medium pt-1 text-[11px] opacity-90">
                        {dep.confidence.recommendation}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Supporting Evidence ({dep.evidence.length})
                    </h4>
                    <div className="grid gap-2">
                      {dep.evidence.map((ev: AIEvidence) => (
                        <AIEvidenceCard key={ev.id} evidence={ev} />
                      ))}
                    </div>
                  </div>

                  {dep.confidence.isLowConfidence && onVerifyItem && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onVerifyItem(dep.connection.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                      >
                        Verify & Acknowledge
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredAssertions.map((assert) => (
                <div
                  key={assert.id}
                  className={`p-4 rounded-xl border ${
                    assert.confidence.isLowConfidence
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                  data-testid="grounded-assertion-item"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase">
                          {assert.kind.toUpperCase()}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {assert.claim}
                        </h3>
                      </div>
                    </div>
                    <ConfidenceBadge confidence={assert.confidence} />
                  </div>

                  {assert.confidence.isLowConfidence && (
                    <div className="mb-3 p-3 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                      <div className="font-semibold">⚠️ Flagged for Low Confidence</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {assert.confidence.reasons.map((reason: string, idx: number) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Evidence ({assert.evidence.length})
                    </h4>
                    <div className="grid gap-2">
                      {assert.evidence.map((ev: AIEvidence) => (
                        <AIEvidenceCard key={ev.id} evidence={ev} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <span className="text-slate-500">
            Grounding invariant: DiagramHQ guarantees all AI architectural claims are anchored to verified sources.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
