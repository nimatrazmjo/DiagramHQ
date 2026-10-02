'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type ArchitectureLintReport,
  type LintSeverity,
  type LintCategory,
  lintArchitectureModel,
} from '@diagramhq/domain';

export interface ArchitectureLintModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  onSelectTarget?: (targetId: string, targetType: 'object' | 'connection' | 'architecture') => void;
}

export function ArchitectureLintModal({
  isOpen,
  onClose,
  model,
  onSelectTarget,
}: ArchitectureLintModalProps): React.JSX.Element | null {
  const [selectedSeverity, setSelectedSeverity] = useState<LintSeverity | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LintCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reScanCounter, setReScanCounter] = useState(0);

  const report: ArchitectureLintReport = useMemo(() => {
    return lintArchitectureModel(model);
  }, [model, reScanCounter]);

  if (!isOpen) return null;

  const filteredFindings = report.findings.filter((finding) => {
    if (selectedSeverity !== 'all' && finding.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && finding.category !== selectedCategory) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = finding.targetName.toLowerCase().includes(q);
      const matchMsg = finding.message.toLowerCase().includes(q);
      const matchRule = finding.ruleName.toLowerCase().includes(q) || finding.ruleId.toLowerCase().includes(q);
      if (!matchName && !matchMsg && !matchRule) return false;
    }
    return true;
  });

  const getSeverityStyle = (severity: LintSeverity) => {
    switch (severity) {
      case 'error':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'ERROR' };
      case 'warning':
        return { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'WARNING' };
      case 'info':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'INFO' };
    }
  };

  const scoreColor =
    report.summary.healthScore >= 90
      ? '#16a34a'
      : report.summary.healthScore >= 70
        ? '#d97706'
        : '#dc2626';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="architecture-lint-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <h2
              id="architecture-lint-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}
            >
              Architecture Linting & Quality (F085)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Structural integrity, encapsulation, and C4 best practice diagnostics
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Status & Health Gauge Banner */}
          {report.summary.isClean ? (
            <div
              data-testid="lint-clean-banner"
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                  Architecture Model is 100% Clean
                </div>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
                  No structural defects, dangling connections, invalid hierarchies, or missing technology metadata detected.
                </div>
              </div>
              <div
                style={{
                  backgroundColor: '#dcfce7',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#15803d',
                }}
              >
                Score: 100 / 100
              </div>
            </div>
          ) : (
            <div
              data-testid="lint-issues-banner"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
              }}
            >
              {/* Score */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>HEALTH SCORE</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: scoreColor, marginTop: '2px' }}>
                  {report.summary.healthScore}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}> / 100</span>
                </div>
              </div>

              {/* Total Findings */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL ISSUES</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {report.summary.totalFindings}
                </div>
              </div>

              {/* Errors */}
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>ERRORS</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b', marginTop: '2px' }}>
                  {report.summary.errorCount}
                </div>
              </div>

              {/* Warnings */}
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                }}
              >
                <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>WARNINGS</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                  {report.summary.warningCount}
                </div>
              </div>

              {/* Info */}
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>INFO</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>
                  {report.summary.infoCount}
                </div>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {/* Severity Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setSelectedSeverity('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  backgroundColor: selectedSeverity === 'all' ? '#0f172a' : '#ffffff',
                  color: selectedSeverity === 'all' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                }}
              >
                All ({report.findings.length})
              </button>
              <button
                onClick={() => setSelectedSeverity('error')}
                data-testid="filter-error-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #fecaca',
                  backgroundColor: selectedSeverity === 'error' ? '#dc2626' : '#fef2f2',
                  color: selectedSeverity === 'error' ? '#ffffff' : '#991b1b',
                  cursor: 'pointer',
                }}
              >
                Errors ({report.summary.errorCount})
              </button>
              <button
                onClick={() => setSelectedSeverity('warning')}
                data-testid="filter-warning-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #fde68a',
                  backgroundColor: selectedSeverity === 'warning' ? '#d97706' : '#fffbeb',
                  color: selectedSeverity === 'warning' ? '#ffffff' : '#b45309',
                  cursor: 'pointer',
                }}
              >
                Warnings ({report.summary.warningCount})
              </button>
              <button
                onClick={() => setSelectedSeverity('info')}
                data-testid="filter-info-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #bfdbfe',
                  backgroundColor: selectedSeverity === 'info' ? '#2563eb' : '#eff6ff',
                  color: selectedSeverity === 'info' ? '#ffffff' : '#1e40af',
                  cursor: 'pointer',
                }}
              >
                Info ({report.summary.infoCount})
              </button>
            </div>

            {/* Category Filter & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as LintCategory | 'all')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Categories</option>
                <option value="structural">Structural</option>
                <option value="documentation">Documentation</option>
                <option value="coupling">Coupling</option>
                <option value="hierarchy">Hierarchy</option>
                <option value="best-practice">Best Practice</option>
              </select>

              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  width: '150px',
                }}
              />
            </div>
          </div>

          {/* Findings List */}
          {filteredFindings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              No issues match current filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredFindings.map((finding) => {
                const badge = getSeverityStyle(finding.severity);
                return (
                  <div
                    key={finding.id}
                    data-testid={`lint-finding-card-${finding.id}`}
                    style={{
                      border: `1px solid ${badge.border}`,
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Finding Top Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                          }}
                        >
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {finding.ruleName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {finding.ruleId}
                        </span>
                      </div>

                      {/* Target Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {finding.targetName}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          {finding.targetType}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                      {finding.message}
                    </div>

                    {/* Remediation & Action */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f8fafc',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        marginTop: '2px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>Remediation:</span>
                        <span>{finding.remediation}</span>
                      </div>

                      {onSelectTarget && (
                        <button
                          onClick={() => onSelectTarget(finding.targetId, finding.targetType)}
                          data-testid={`focus-target-btn-${finding.id}`}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Focus on Canvas
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Last evaluated: {new Date(report.executedAt).toLocaleTimeString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setReScanCounter((c) => c + 1)}
              data-testid="lint-rescan-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Re-scan Model
            </button>
            <button
              onClick={onClose}
              data-testid="lint-close-btn"
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid #0f172a',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
