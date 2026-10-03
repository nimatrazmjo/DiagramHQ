'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type SpofRiskSeverity,
  type StructuralRiskReport,
  type StructuralRiskOptions,
  analyzeStructuralRisks,
} from '@diagramhq/domain';

export interface CircularSpofModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  options?: StructuralRiskOptions;
  onSelectNode?: (nodeId: string) => void;
}

// ============================================================================
// Subcomponents & Badges
// ============================================================================

function SeverityBadge({ severity }: { severity: SpofRiskSeverity }) {
  const styles: Record<SpofRiskSeverity, { bg: string; text: string; label: string }> = {
    critical: { bg: '#7f1d1d', text: '#fca5a5', label: 'CRITICAL' },
    high: { bg: '#831843', text: '#fbcfe8', label: 'HIGH RISK' },
    medium: { bg: '#78350f', text: '#fde68a', label: 'MEDIUM' },
    low: { bg: '#1e3a8a', text: '#93c5fd', label: 'LOW' },
  };

  const s = styles[severity] || styles.medium;

  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: '4px',
        padding: '3px 8px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
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

function CategoryTag({ label, color }: { label: string; color?: string }) {
  return (
    <span
      style={{
        background: '#1e293b',
        color: color || '#94a3b8',
        border: '1px solid #334155',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      {label}
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
// Main Modal Component
// ============================================================================

export function CircularSpofModal({
  isOpen,
  onClose,
  model,
  options,
  onSelectNode,
}: CircularSpofModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'cycles' | 'spofs'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<SpofRiskSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const report: StructuralRiskReport = useMemo(() => {
    return analyzeStructuralRisks(model, options);
  }, [model, options]);

  // Filter cycles
  const filteredCycles = useMemo(() => {
    return report.cycles.filter((c) => {
      if (selectedSeverity !== 'all' && c.severity !== selectedSeverity) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inPath = c.pathDescription.toLowerCase().includes(q);
        const inNodes = c.nodeNames.some((n) => n.toLowerCase().includes(q));
        if (!inPath && !inNodes) return false;
      }
      return true;
    });
  }, [report, selectedSeverity, searchQuery]);

  // Filter SPOFs
  const filteredSpofs = useMemo(() => {
    return report.spofs.filter((s) => {
      if (selectedSeverity !== 'all' && s.severity !== selectedSeverity) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inName = s.targetName.toLowerCase().includes(q);
        const inRationale = s.rationale.toLowerCase().includes(q);
        const inMitigation = s.mitigation.toLowerCase().includes(q);
        const inDeps = s.dependentNames.some((d) => d.toLowerCase().includes(q));
        if (!inName && !inRationale && !inMitigation && !inDeps) return false;
      }
      return true;
    });
  }, [report, selectedSeverity, searchQuery]);

  if (!isOpen) return null;

  const scoreColor =
    report.metrics.structuralHealthScore >= 80
      ? '#10b981'
      : report.metrics.structuralHealthScore >= 60
        ? '#f59e0b'
        : '#ef4444';

  const handleCopySummary = () => {
    const summary = `DiagramHQ Structural Risk Report (${report.architectureId})
Health Score: ${report.metrics.structuralHealthScore}/100 [${report.metrics.overallRiskLevel.toUpperCase()}]
Cycles Detected: ${report.cycles.length}
SPOFs Flagged: ${report.spofs.length} (Max Fan-In: ${report.metrics.maxFanIn})
Articulation Points: ${report.metrics.articulationPointCount}

Recommendations:
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

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
      `structural-risks-${report.architectureId}-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      data-testid="circular-spof-modal"
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
          maxWidth: '1040px',
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
        {/* Modal Header */}
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
              {report.metrics.structuralHealthScore}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Circular Dependencies &amp; SPOF Detection
                </h2>
                <span
                  style={{
                    background:
                      report.metrics.overallRiskLevel === 'healthy'
                        ? '#064e3b'
                        : report.metrics.overallRiskLevel === 'warning'
                          ? '#78350f'
                          : '#7f1d1d',
                    color:
                      report.metrics.overallRiskLevel === 'healthy'
                        ? '#6ee7b7'
                        : report.metrics.overallRiskLevel === 'warning'
                          ? '#fde68a'
                          : '#fca5a5',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {report.metrics.overallRiskLevel.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Identifies dependency cycles, high fan-in bottlenecks, cut-vertex articulation points, and sole providers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopySummary}
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
              data-testid="close-spof-modal-btn"
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

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Metric Cards */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <MetricCard
              label="Structural Score"
              value={`${report.metrics.structuralHealthScore}/100`}
              sublabel={report.metrics.overallRiskLevel.toUpperCase()}
              color={scoreColor}
            />
            <MetricCard
              label="Cycles Detected"
              value={report.metrics.cycleCount}
              sublabel={report.metrics.cycleCount === 0 ? 'Clean DAG' : `${report.metrics.cycleCount} loops`}
              color={report.metrics.cycleCount === 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard
              label="SPOFs Flagged"
              value={report.metrics.spofCount}
              sublabel="Single points of failure"
              color={report.metrics.spofCount === 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard
              label="Articulation Points"
              value={report.metrics.articulationPointCount}
              sublabel="Bridge cut vertices"
              color={report.metrics.articulationPointCount === 0 ? '#10b981' : '#f59e0b'}
            />
            <MetricCard
              label="Max Fan-In"
              value={report.metrics.maxFanIn}
              sublabel="Peak in-degree"
              color={report.metrics.maxFanIn <= 2 ? '#10b981' : '#f59e0b'}
            />
            <MetricCard
              label="Critical Risks"
              value={report.metrics.criticalRisksCount}
              sublabel="Immediate attention"
              color={report.metrics.criticalRisksCount === 0 ? '#10b981' : '#ef4444'}
            />
          </div>

          {/* Recommendations Banner */}
          {report.recommendations.length > 0 && (
            <div
              style={{
                background: '#131c31',
                border: '1px solid #1e3a8a',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>
                Architectural Recommendations &amp; Mitigations
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                {report.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tab & Filter Bar */}
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
            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  background: activeTab === 'all' ? '#2563eb' : '#1e293b',
                  color: activeTab === 'all' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All Risks ({report.cycles.length + report.spofs.length})
              </button>
              <button
                onClick={() => setActiveTab('cycles')}
                style={{
                  background: activeTab === 'cycles' ? '#2563eb' : '#1e293b',
                  color: activeTab === 'cycles' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cycles ({report.cycles.length})
              </button>
              <button
                onClick={() => setActiveTab('spofs')}
                style={{
                  background: activeTab === 'spofs' ? '#2563eb' : '#1e293b',
                  color: activeTab === 'spofs' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                SPOFs ({report.spofs.length})
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedSeverity}
                onChange={(e) =>
                  setSelectedSeverity(e.target.value as SpofRiskSeverity | 'all')
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
                <option value="critical">Critical</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <input
                type="text"
                placeholder="Search risks & nodes..."
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

          {/* Cycles Section */}
          {(activeTab === 'all' || activeTab === 'cycles') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Circular Dependency Loops
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({filteredCycles.length} matching)
                </span>
              </div>

              {filteredCycles.length === 0 ? (
                <div
                  style={{
                    background: '#1e293b',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '12px',
                  }}
                >
                  {report.cycles.length === 0
                    ? 'No circular dependencies detected. Architecture forms a strict acyclic graph.'
                    : 'No cycles match the current filter.'}
                </div>
              ) : (
                filteredCycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <SeverityBadge severity={cycle.severity} />
                        <CategoryTag
                          label={cycle.isSynchronous ? 'SYNCHRONOUS RPC' : 'ASYNC / DATA'}
                          color={cycle.isSynchronous ? '#fca5a5' : '#93c5fd'}
                        />
                        <CategoryTag label={`${cycle.length} NODES`} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {cycle.pathDescription}
                        </span>
                      </div>

                      {onSelectNode && cycle.nodeIds[0] && (
                        <button
                          onClick={() => onSelectNode(cycle.nodeIds[0]!)}
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
                          Inspect Origin
                        </button>
                      )}
                    </div>

                    {/* Breaking Edge Guidance */}
                    {cycle.breakingEdgeSuggestion && (
                      <div
                        style={{
                          background: '#0f172a',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: '#93c5fd',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>Decoupling Recommendation:</span>
                        <span>{cycle.breakingEdgeSuggestion.reason}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SPOFs Section */}
          {(activeTab === 'all' || activeTab === 'spofs') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Single Points of Failure (SPOFs)
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({filteredSpofs.length} matching)
                </span>
              </div>

              {filteredSpofs.length === 0 ? (
                <div
                  style={{
                    background: '#1e293b',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '12px',
                  }}
                >
                  {report.spofs.length === 0
                    ? 'No Single Points of Failure detected. Critical nodes feature redundancy or fallbacks.'
                    : 'No SPOFs match the current filter.'}
                </div>
              ) : (
                filteredSpofs.map((spof) => (
                  <div
                    key={spof.id}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <SeverityBadge severity={spof.severity} />
                        <CategoryTag label={spof.targetKind.toUpperCase()} />
                        {spof.categories.map((cat) => (
                          <CategoryTag
                            key={cat}
                            label={cat.replace(/_/g, ' ').toUpperCase()}
                            color="#fde68a"
                          />
                        ))}
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          {spof.targetName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {`Fan-in: ${spof.inDegree} | Blast Radius: ${spof.blastRadiusCount} nodes`}
                        </span>
                      </div>

                      {onSelectNode && (
                        <button
                          onClick={() => onSelectNode(spof.targetId)}
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
                          Inspect SPOF
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {spof.rationale}
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      <strong>Dependent Services:</strong> {spof.dependentNames.join(', ') || 'None'}
                    </div>

                    {spof.mitigation && (
                      <div
                        style={{
                          background: '#0f172a',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: '#6ee7b7',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>Mitigation:</span>
                        <span>{spof.mitigation}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
