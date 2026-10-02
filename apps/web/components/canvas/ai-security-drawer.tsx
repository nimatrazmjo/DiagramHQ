'use client';

import React from 'react';
import type {
  AISecurityReport,
  SecurityFinding,
  SecuritySeverity,
} from '@diagramhq/domain';

export interface SecurityScoreGaugeProps {
  score: number;
}

export function SecurityScoreGauge({ score }: SecurityScoreGaugeProps) {
  let color = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
  let label = 'Strong Security Posture';

  if (score < 50) {
    color = 'text-rose-400 border-rose-500/50 bg-rose-950/40';
    label = 'Critical Security Vulnerabilities';
  } else if (score < 80) {
    color = 'text-amber-400 border-amber-500/50 bg-amber-950/40';
    label = 'Moderate Risk - Remediation Required';
  }

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between ${color}`}>
      <div className="space-y-0.5">
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold opacity-80">
          Architecture Security Rating
        </span>
        <h3 className="text-sm font-bold text-white">{label}</h3>
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-black">{score}</span>
        <span className="text-xs opacity-70">/ 100</span>
      </div>
    </div>
  );
}

export interface SecurityFindingCardProps {
  finding: SecurityFinding;
  onSelectEntity?: (id: string) => void;
}

export function SecurityFindingCard({
  finding,
  onSelectEntity,
}: SecurityFindingCardProps) {
  const severityStyles: Record<SecuritySeverity, { badge: string; text: string; icon: string }> = {
    critical: {
      badge: 'bg-rose-950/80 border-rose-800 text-rose-300',
      text: 'CRITICAL',
      icon: 'gpp_bad',
    },
    high: {
      badge: 'bg-orange-950/80 border-orange-800 text-orange-300',
      text: 'HIGH',
      icon: 'warning',
    },
    medium: {
      badge: 'bg-amber-950/80 border-amber-800 text-amber-300',
      text: 'MEDIUM',
      icon: 'info',
    },
    low: {
      badge: 'bg-slate-900 border-slate-800 text-slate-300',
      text: 'LOW',
      icon: 'verified_user',
    },
  };

  const style = severityStyles[finding.severity] || severityStyles.low;

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border flex items-center gap-1 ${style.badge}`}
            >
              <span className="material-symbols-outlined text-xs">{style.icon}</span>
              <span>{style.text}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">{finding.id}</span>
          </div>
          <h4 className="text-xs font-bold text-white mt-1.5">{finding.title}</h4>
        </div>
      </div>

      <p className="text-slate-300 text-[11px] leading-relaxed">
        {finding.description}
      </p>

      {/* Affected Entities */}
      {(finding.affectedObjectIds.length > 0 || finding.affectedConnectionIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {finding.affectedObjectIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectEntity?.(id)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] font-mono text-cyan-300 transition-colors"
            >
              obj:{id}
            </button>
          ))}
          {finding.affectedConnectionIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectEntity?.(id)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-500 text-[10px] font-mono text-amber-300 transition-colors"
            >
              conn:{id}
            </button>
          ))}
        </div>
      )}

      {/* Remediation */}
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-850 text-[11px] space-y-1">
        <span className="font-semibold text-emerald-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">shield</span>
          Recommended Remediation:
        </span>
        <p className="text-slate-300 text-[11px] leading-relaxed pl-4">
          {finding.remediation}
        </p>
      </div>
    </div>
  );
}

export interface AISecurityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report?: AISecurityReport | null;
  onSelectEntity?: (entityId: string) => void;
}

export function AISecurityDrawer({
  isOpen,
  onClose,
  report,
  onSelectEntity,
}: AISecurityDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100"
      role="region"
      aria-label="AI Architecture Security Review Drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-cyan-400 text-2xl">
            security
          </span>
          <div>
            <h2 className="text-base font-bold text-white">
              AI Security Review &amp; Audit
            </h2>
            <p className="text-xs text-slate-400">
              Automated perimeter, PII privacy, and authentication review
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close Security Drawer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {report ? (
          <>
            {/* Score & Summary */}
            <SecurityScoreGauge score={report.score} />

            {/* Findings Summary Pills */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
                <div className="text-sm font-bold">{report.summary.critical}</div>
                <div className="text-[9px] uppercase">Critical</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-950/40 border border-orange-800 text-orange-300">
                <div className="text-sm font-bold">{report.summary.high}</div>
                <div className="text-[9px] uppercase">High</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300">
                <div className="text-sm font-bold">{report.summary.medium}</div>
                <div className="text-[9px] uppercase">Medium</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <div className="text-sm font-bold">{report.summary.total}</div>
                <div className="text-[9px] uppercase">Total</div>
              </div>
            </div>

            {/* AI Narrative Section */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-base">
                  auto_awesome
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Security Narrative
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                {report.narrative.executiveSummary}
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-rose-400">Perimeter Ingress: </span>
                  <span className="text-slate-300">{report.narrative.perimeterRisks}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-amber-400">PII &amp; Privacy: </span>
                  <span className="text-slate-300">{report.narrative.piiPrivacyRisks}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="font-semibold text-cyan-400">Authentication: </span>
                  <span className="text-slate-300">{report.narrative.authenticationRisks}</span>
                </div>
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Security Findings ({report.findings.length})
                </h4>
              </div>

              {report.findings.length > 0 ? (
                report.findings.map((finding) => (
                  <SecurityFindingCard
                    key={finding.id}
                    finding={finding}
                    onSelectEntity={onSelectEntity}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-emerald-400 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  <span className="material-symbols-outlined text-3xl mb-1">
                    check_circle
                  </span>
                  <p className="font-semibold">No Security Vulnerabilities Detected</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Architecture complies with standard gateway isolation, encryption, and authentication rules.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
              policy
            </span>
            <p className="text-sm font-medium">Ready to audit architecture security</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Run security analysis to detect unauthenticated public ingress, unencrypted PII paths, and missing auth boundaries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
