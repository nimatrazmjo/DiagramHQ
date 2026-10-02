'use client';

import React from 'react';
import type {
  ArchitectureReviewReport,
  ReviewVerdict,
  ReviewChecklistItem,
  ArchitectureReviewViolation,
} from '@diagramhq/domain';

export interface ReviewVerdictBadgeProps {
  verdict: ReviewVerdict;
  className?: string;
}

export function ReviewVerdictBadge({ verdict, className = '' }: ReviewVerdictBadgeProps) {
  const configs: Record<
    ReviewVerdict,
    { label: string; bg: string; text: string; border: string; icon: string }
  > = {
    APPROVE: {
      label: 'APPROVED',
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-400',
      border: 'border-emerald-800',
      icon: 'check_circle',
    },
    REQUEST_CHANGES: {
      label: 'REQUEST CHANGES',
      bg: 'bg-rose-950/80',
      text: 'text-rose-400',
      border: 'border-rose-800',
      icon: 'cancel',
    },
    COMMENT: {
      label: 'COMMENT',
      bg: 'bg-amber-950/80',
      text: 'text-amber-400',
      border: 'border-amber-800',
      icon: 'chat_bubble',
    },
  };

  const c = configs[verdict] || configs.COMMENT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      <span className="material-symbols-outlined text-sm">{c.icon}</span>
      {c.label}
    </span>
  );
}

export interface ArchitectureReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: ArchitectureReviewReport | null;
  onRerunReview?: () => void;
  onSelectEntity?: (id: string) => void;
}

export function ArchitectureReviewModal({
  isOpen,
  onClose,
  report,
  onRerunReview,
  onSelectEntity,
}: ArchitectureReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Architecture Review Dialog"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">
              rule_settings
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white">
                  AI Architecture Review Agent
                </h2>
                {report && <ReviewVerdictBadge verdict={report.verdict} />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-merge checklist: cyclic call chains, ownership, external dependencies, backup/DR, and PII governance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRerunReview && (
              <button
                type="button"
                onClick={onRerunReview}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Re-run Review
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close Review Dialog"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {report ? (
            <>
              {/* Verdict Summary Card */}
              <div
                className={`p-4 rounded-xl border ${
                  report.verdict === 'REQUEST_CHANGES'
                    ? 'border-rose-800 bg-rose-950/30'
                    : 'border-emerald-800 bg-emerald-950/30'
                } space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Review Summary
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(report.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {report.summary}
                </p>
              </div>

              {/* Pre-merge Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                    Pre-Merge Governance Checklist
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {report.checklist.filter((c) => c.status === 'PASS').length} of{' '}
                    {report.checklist.length} Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {report.checklist.map((item: ReviewChecklistItem) => {
                    const isPass = item.status === 'PASS';
                    return (
                      <div
                        key={item.ruleId}
                        className={`p-4 rounded-xl border ${
                          isPass
                            ? 'border-slate-800 bg-slate-950/60'
                            : 'border-rose-900/60 bg-rose-950/20'
                        } flex items-start justify-between gap-4`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`material-symbols-outlined text-base ${
                                isPass ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPass ? 'check_circle' : 'cancel'}
                            </span>
                            <h4 className="text-xs font-bold text-white">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {item.description}
                          </p>
                          <div
                            className={`text-xs mt-1.5 font-mono ${
                              isPass ? 'text-slate-400' : 'text-rose-300'
                            }`}
                          >
                            {item.details}
                          </div>
                          {item.affectedEntityIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.affectedEntityIds.map((entityId) => (
                                <button
                                  key={entityId}
                                  type="button"
                                  onClick={() => onSelectEntity?.(entityId)}
                                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-indigo-400 text-[10px] font-mono text-indigo-300 transition-colors"
                                >
                                  {entityId}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                            isPass
                              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                              : 'bg-rose-950 border-rose-800 text-rose-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actionable Violations & Remediation */}
              {report.violations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                    Blocking Violations ({report.violations.length})
                  </h3>
                  <div className="space-y-3">
                    {report.violations.map(
                      (violation: ArchitectureReviewViolation, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-rose-900/60 bg-slate-950 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              {violation.severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {violation.ruleId}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-white">
                            {violation.message}
                          </p>
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                            <span className="font-mono text-indigo-400 font-bold block uppercase text-[10px]">
                              Required Remediation:
                            </span>
                            <p>{violation.remediation}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              No active architecture review report available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {report?.verdict === 'REQUEST_CHANGES'
              ? 'Merge is blocked pending architecture changes.'
              : 'Architecture review verified: ready for merge.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
