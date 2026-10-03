'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type ArchitectureHealthReport,
  type HealthCategory,
  type HealthStatus,
  computeArchitectureHealth,
} from '@diagramhq/domain';

export interface ArchitectureHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  actualModel?: ArchitectureModel;
  baselineModel?: ArchitectureModel;
  onSelectNode?: (nodeId: string) => void;
}

// ============================================================================
// Helper Subcomponents
// ============================================================================

function StatusBadge({ status }: { status: HealthStatus }) {
  const styles: Record<HealthStatus, { bg: string; text: string; label: string }> = {
    healthy: { bg: '#064e3b', text: '#6ee7b7', label: 'HEALTHY' },
    warning: { bg: '#78350f', text: '#fde68a', label: 'WARNING' },
    critical: { bg: '#7f1d1d', text: '#fca5a5', label: 'CRITICAL' },
    unknown: { bg: '#1e293b', text: '#94a3b8', label: 'UNKNOWN' },
  };

  const s = styles[status] || styles.unknown;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.text,
        }}
      />
      {s.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  const styles: Record<'error' | 'warning' | 'info', { bg: string; text: string; label: string }> =
    {
      error: { bg: '#831843', text: '#fbcfe8', label: 'ERROR' },
      warning: { bg: '#713f12', text: '#fde047', label: 'WARNING' },
      info: { bg: '#1e3a8a', text: '#93c5fd', label: 'INFO' },
    };

  const s = styles[severity] || styles.info;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      {s.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 14px',
        minWidth: '110px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: color || '#f8fafc',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2 }}>{sublabel}</div>
      )}
    </div>
  );
}

// ============================================================================
// Main Architecture Health Modal
// ============================================================================

export function ArchitectureHealthModal({
  isOpen,
  onClose,
  model,
  actualModel,
  baselineModel,
  onSelectNode,
}: ArchitectureHealthModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning' | 'info'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const report: ArchitectureHealthReport = useMemo(() => {
    return computeArchitectureHealth(model, {
      actualModel,
      baselineModel,
    });
  }, [model, actualModel, baselineModel]);

  const filteredFindings = useMemo(() => {
    return report.findings.filter((f) => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inTitle = f.title.toLowerCase().includes(q);
        const inDetail = f.detail.toLowerCase().includes(q);
        const inTarget = f.targetName?.toLowerCase().includes(q);
        const inRemediation = f.remediation?.toLowerCase().includes(q);
        if (!inTitle && !inDetail && !inTarget && !inRemediation) return false;
      }
      return true;
    });
  }, [report, selectedCategory, selectedSeverity, searchQuery]);

  if (!isOpen) return null;

  const scoreColor =
    report.compositeScore >= 80
      ? '#10b981'
      : report.compositeScore >= 60
        ? '#f59e0b'
        : '#ef4444';

  const handleCopyReport = () => {
    const summary = `DiagramHQ Architecture Health Report (${report.architectureId})
Composite Score: ${report.compositeScore}/100 [${report.overallStatus.toUpperCase()}]
Categories:
${report.categories.map((c) => `- ${c.label}: ${c.score}/100 (${c.findingCount} findings)`).join('\n')}
Findings (${report.findings.length} total):
${report.findings.map((f) => `[${f.severity.toUpperCase()}] [${f.category}] ${f.title}: ${f.detail}`).join('\n')}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `architecture-health-${report.architectureId}-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      data-testid="architecture-health-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#111827',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#1e293b',
                border: `2px solid ${scoreColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: scoreColor,
              }}
            >
              {report.compositeScore}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Architecture Health Scorecard
                </h2>
                <StatusBadge status={report.overallStatus} />
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Comprehensive scorecard across dependencies, documentation, security, ownership, and drift
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyReport}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy Summary'}
            </button>
            <button
              onClick={handleExportJson}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export JSON
            </button>
            <button
              onClick={onClose}
              data-testid="close-modal-btn"
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: '20px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Analytics Cards */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <MetricCard
              label="Composite Score"
              value={`${report.compositeScore}/100`}
              sublabel={report.overallStatus.toUpperCase()}
              color={scoreColor}
            />
            <MetricCard
              label="Ownership Coverage"
              value={`${report.analytics.ownershipCoverage}%`}
              sublabel={`${report.analytics.ownedObjects}/${report.analytics.totalObjects} objects`}
              color={report.analytics.ownershipCoverage >= 80 ? '#10b981' : '#f59e0b'}
            />
            <MetricCard
              label="Doc Coverage"
              value={`${report.analytics.documentationCoverage}%`}
              sublabel={`${report.analytics.documentedObjects}/${report.analytics.totalObjects} objects`}
              color={report.analytics.documentationCoverage >= 80 ? '#10b981' : '#f59e0b'}
            />
            <MetricCard
              label="Dependency Cycles"
              value={report.analytics.cyclicDependencyCount}
              sublabel={`${report.analytics.dependencyCount} total links`}
              color={report.analytics.cyclicDependencyCount === 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard
              label="Security Exposures"
              value={report.analytics.securityExposureCount}
              sublabel={`Score ${report.analytics.securityScore}/100`}
              color={report.analytics.securityExposureCount === 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard
              label="Drift Items"
              value={report.analytics.driftItemCount}
              sublabel={actualModel ? 'vs actual infra' : 'clean baseline'}
              color={report.analytics.driftItemCount === 0 ? '#10b981' : '#f59e0b'}
            />
          </div>

          {/* Change Analytics Section */}
          {report.analytics.changeAnalytics.hasBaseline && (
            <div
              style={{
                background: '#131c31',
                border: '1px solid #1e3a8a',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>
                    Change Analytics & Trends
                  </span>
                  <span
                    style={{
                      background:
                        report.analytics.changeAnalytics.trend === 'improving'
                          ? '#064e3b'
                          : report.analytics.changeAnalytics.trend === 'degrading'
                            ? '#7f1d1d'
                            : '#1e293b',
                      color:
                        report.analytics.changeAnalytics.trend === 'improving'
                          ? '#6ee7b7'
                          : report.analytics.changeAnalytics.trend === 'degrading'
                            ? '#fca5a5'
                            : '#cbd5e1',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {report.analytics.changeAnalytics.trend.toUpperCase()} (
                    {report.analytics.changeAnalytics.scoreDelta >= 0 ? '+' : ''}
                    {report.analytics.changeAnalytics.scoreDelta} PTS)
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Risk Level: <strong>{report.analytics.changeAnalytics.changeRiskLevel.toUpperCase()}</strong>
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                {report.analytics.changeAnalytics.summary}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
                <span>+{report.analytics.changeAnalytics.addedObjectsCount} added objects</span>
                <span>~{report.analytics.changeAnalytics.modifiedObjectsCount} modified objects</span>
                <span>-{report.analytics.changeAnalytics.removedObjectsCount} removed objects</span>
                <span>{report.analytics.changeAnalytics.affectedObjectsCount} affected components</span>
                <span>{report.analytics.changeAnalytics.affectedFlowsCount} affected flows</span>
              </div>
            </div>
          )}

          {/* Categorized Health Cards */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: '#cbd5e1' }}>
              Categorized Health Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {report.categories.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                const catScoreColor =
                  cat.score >= 80 ? '#10b981' : cat.score >= 60 ? '#f59e0b' : '#ef4444';

                return (
                  <div
                    key={cat.category}
                    onClick={() => setSelectedCategory(isSelected ? 'all' : cat.category)}
                    style={{
                      background: isSelected ? '#1e293b' : '#0f172a',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: catScoreColor }}>
                        {cat.score}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '4px',
                        borderRadius: '2px',
                        background: '#334155',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${cat.score}%`,
                          background: catScoreColor,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                      <StatusBadge status={cat.status} />
                      <span>{cat.findingCount} finding{cat.findingCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Findings Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '6px',
              borderTop: '1px solid #1e293b',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  background: selectedCategory === 'all' ? '#2563eb' : '#1e293b',
                  color: selectedCategory === 'all' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All ({report.findings.length})
              </button>
              {report.categories.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setSelectedCategory(c.category)}
                  style={{
                    background: selectedCategory === c.category ? '#2563eb' : '#1e293b',
                    color: selectedCategory === c.category ? '#ffffff' : '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {c.category} ({c.findingCount})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedSeverity}
                onChange={(e) =>
                  setSelectedSeverity(e.target.value as 'all' | 'error' | 'warning' | 'info')
                }
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                <option value="all">All Severities</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
              </select>

              <input
                type="text"
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  width: '180px',
                }}
              />
            </div>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredFindings.length === 0 ? (
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                No findings match the selected filter.
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SeverityBadge severity={finding.severity} />
                      <span
                        style={{
                          background: '#0f172a',
                          color: '#94a3b8',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {finding.category.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                        {finding.title}
                      </span>
                      {finding.targetName && (
                        <span style={{ fontSize: '11px', color: '#60a5fa' }}>
                          Target: {finding.targetName}
                        </span>
                      )}
                    </div>

                    {finding.targetId && onSelectNode && (
                      <button
                        onClick={() => onSelectNode(finding.targetId!)}
                        style={{
                          background: '#334155',
                          color: '#cbd5e1',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect Node
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {finding.detail}
                  </div>

                  {finding.remediation && (
                    <div
                      style={{
                        background: '#0f172a',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#93c5fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>Remediation:</span>
                      <span>{finding.remediation}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
