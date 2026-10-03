'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type ObjectId,
  type DataLineageReport,
  type LineagePath,
  type LineageBoundaryCrossing,
  type ComplianceStandard,
  traceDataLineage,
} from '@diagramhq/domain';

export interface DataLineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  initialSourceNodeId?: ObjectId | string;
  onSelectNode?: (nodeId: string) => void;
}

type TabType = 'paths' | 'nodes' | 'crossings';

function ComplianceBadge({ standard }: { standard: ComplianceStandard }) {
  const colors: Record<ComplianceStandard, { bg: string; text: string }> = {
    PII: { bg: '#1e3a8a', text: '#93c5fd' },
    PCI: { bg: '#831843', text: '#fbcfe8' },
    HIPAA: { bg: '#14532d', text: '#86efac' },
    GDPR: { bg: '#581c87', text: '#e9d5ff' },
    SOC2: { bg: '#713f12', text: '#fde047' },
  };

  const c = colors[standard] ?? { bg: '#1e293b', text: '#cbd5e1' };

  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      {standard}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
  danger,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: danger ? '#3b1414' : accent ? '#1e3a8a33' : '#1e293b',
        border: `1px solid ${danger ? '#7f1d1d' : accent ? '#3b82f6' : '#334155'}`,
        borderRadius: '8px',
        padding: '12px 14px',
        minWidth: '95px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '18px',
          color: danger ? '#fca5a5' : accent ? '#93c5fd' : '#60a5fa',
        }}
      >
        {icon}
      </span>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: danger ? '#fca5a5' : '#e2e8f0',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function DataLineageModal({
  isOpen,
  onClose,
  model,
  initialSourceNodeId,
  onSelectNode,
}: DataLineageModalProps): React.JSX.Element | null {
  // Default to first store or first object
  const defaultSource = useMemo<string>(() => {
    if (initialSourceNodeId) return String(initialSourceNodeId);
    const storeObj = model.objects.find((o) => o.kind === 'store');
    if (storeObj) return storeObj.id as string;
    return model.objects[0] ? (model.objects[0].id as string) : '';
  }, [initialSourceNodeId, model.objects]);

  const [selectedSource, setSelectedSource] = useState<string>(defaultSource);
  const [activeTab, setActiveTab] = useState<TabType>('paths');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const report: DataLineageReport | null = useMemo(() => {
    if (!selectedSource) return null;
    try {
      return traceDataLineage(model, selectedSource as unknown as ObjectId);
    } catch {
      return null;
    }
  }, [model, selectedSource]);

  if (!isOpen) return null;

  const filterText = searchQuery.toLowerCase().trim();

  const filteredPaths = (report?.paths || []).filter(
    (p: LineagePath) =>
      !filterText ||
      p.targetNodeName.toLowerCase().includes(filterText) ||
      p.hops.some((h) => h.nodeName.toLowerCase().includes(filterText))
  );

  const filteredCrossings = (report?.boundaryCrossings || []).filter(
    (c: LineageBoundaryCrossing) =>
      !filterText ||
      c.fromNodeName.toLowerCase().includes(filterText) ||
      c.toNodeName.toLowerCase().includes(filterText) ||
      c.fromZone.toLowerCase().includes(filterText) ||
      c.toZone.toLowerCase().includes(filterText)
  );

  const totalComplianceCount = report
    ? Object.values(report.metrics.complianceZoneCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-lineage-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#38bdf8', fontSize: '26px' }}
            >
              account_tree
            </span>
            <div>
              <h2
                id="data-lineage-modal-title"
                style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
              >
                Data Lineage & Compliance Tracing
              </h2>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                End-to-end trace from source of truth datastores to consumption with compliance
                boundary crossings.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* ── Source Node Selector + Posture Banner ── */}
        <div
          style={{
            background:
              report && report.metrics.nonCompliantCrossingCount > 0
                ? '#450a0a'
                : '#0b1120',
            borderBottom: `1px solid ${
              report && report.metrics.nonCompliantCrossingCount > 0
                ? '#7f1d1d'
                : '#1e293b'
            }`,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Source of Truth:
            </span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
                cursor: 'pointer',
                maxWidth: '260px',
              }}
            >
              {model.objects.map((o) => (
                <option key={o.id as string} value={o.id as string}>
                  {o.name} ({o.kind})
                </option>
              ))}
            </select>

            {report && report.sourceComplianceZones.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {report.sourceComplianceZones.map((z) => (
                  <ComplianceBadge key={z} standard={z} />
                ))}
              </div>
            )}
          </div>

          {report && (
            <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
              {report.metrics.nonCompliantCrossingCount > 0 ? (
                <span style={{ color: '#fca5a5', fontWeight: 600 }}>
                  ⚠️ {report.metrics.nonCompliantCrossingCount} unencrypted boundary crossing(s)
                  detected!
                </span>
              ) : (
                <span style={{ color: '#86efac', fontWeight: 500 }}>
                  ✓ All cross-boundary lineage hops encrypted in transit
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── KPI Metric Cards ── */}
        {report && (
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <MetricCard
              label="Max Hops"
              value={`${report.metrics.maxHopsReached} hops`}
              icon="timeline"
              accent
            />
            <MetricCard
              label="End Consumers"
              value={report.metrics.consumerCount}
              icon="hub"
            />
            <MetricCard
              label="Nodes Reached"
              value={report.metrics.uniqueNodesReached}
              icon="dns"
            />
            <MetricCard
              label="Boundary Crossings"
              value={report.metrics.boundaryCrossingCount}
              icon="alt_route"
            />
            <MetricCard
              label="Unencrypted Crossings"
              value={report.metrics.nonCompliantCrossingCount}
              icon="warning"
              danger={report.metrics.nonCompliantCrossingCount > 0}
            />
            <MetricCard
              label="Compliance Nodes"
              value={totalComplianceCount}
              icon="verified_user"
            />
          </div>
        )}

        {/* ── Navigation Tabs + Search ── */}
        <div
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            background: '#0d1527',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'paths', label: `Lineage Paths (${report?.paths.length || 0})` },
              { id: 'nodes', label: `Nodes (${report?.uniqueNodes.length || 0})` },
              {
                id: 'crossings',
                label: `Boundary Crossings (${report?.boundaryCrossings.length || 0})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  background: activeTab === tab.id ? '#1e293b' : 'transparent',
                  color: activeTab === tab.id ? '#f1f5f9' : '#94a3b8',
                  border: activeTab === tab.id ? '1px solid #38bdf8' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lineage..."
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              width: '180px',
            }}
          />
        </div>

        {/* ── Content Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* TAB 1: LINEAGE PATHS */}
          {activeTab === 'paths' &&
            (filteredPaths.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No lineage paths found matching criteria.
              </div>
            ) : (
              filteredPaths.map((path) => (
                <div
                  key={path.pathId}
                  style={{
                    background: path.hasComplianceViolation ? '#3b1414' : '#1e293b',
                    border: `1px solid ${
                      path.hasComplianceViolation ? '#7f1d1d' : '#334155'
                    }`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          color: '#38bdf8',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {path.totalHops} HOPS
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                        {path.sourceNodeName} → {path.targetNodeName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {path.complianceZones.map((z) => (
                        <ComplianceBadge key={z} standard={z} />
                      ))}
                      {path.hasComplianceViolation && (
                        <span
                          style={{
                            background: '#dc2626',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          CROSSING VIOLATION
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hop by Hop visual chain */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto',
                      padding: '8px 4px',
                    }}
                  >
                    {path.hops.map((hop, idx) => (
                      <React.Fragment key={`${path.pathId}-${hop.nodeId}-${idx}`}>
                        {idx > 0 && (
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: '16px',
                              color: hop.isBoundaryCrossing ? '#f87171' : '#64748b',
                            }}
                          >
                            arrow_forward
                          </span>
                        )}
                        <div
                          style={{
                            background: '#0f172a',
                            border: `1px solid ${
                              hop.isBoundaryCrossing ? '#ef4444' : '#334155'
                            }`,
                            borderRadius: '6px',
                            padding: '6px 10px',
                            minWidth: '110px',
                          }}
                        >
                          <button
                            onClick={() => onSelectNode?.(hop.nodeId as string)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#38bdf8',
                              cursor: onSelectNode ? 'pointer' : 'default',
                              fontWeight: 600,
                              fontSize: '12px',
                              textAlign: 'left',
                              padding: 0,
                              display: 'block',
                            }}
                          >
                            {hop.nodeName}
                          </button>
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              marginTop: '2px',
                            }}
                          >
                            Hop {hop.hopIndex} · {hop.nodeKind}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))
            ))}

          {/* TAB 2: UNIQUE NODES */}
          {activeTab === 'nodes' &&
            report?.uniqueNodes.map((hop) => (
              <div
                key={hop.nodeId as string}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <button
                    onClick={() => onSelectNode?.(hop.nodeId as string)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: onSelectNode ? 'pointer' : 'default',
                      textAlign: 'left',
                      padding: 0,
                    }}
                  >
                    {hop.nodeName}
                  </button>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Hop {hop.hopIndex} · {hop.nodeKind}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {hop.complianceZones.map((z) => (
                    <ComplianceBadge key={z} standard={z} />
                  ))}
                  {hop.hopIndex === 0 && (
                    <span
                      style={{
                        background: '#16a34a',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                    >
                      SOURCE OF TRUTH
                    </span>
                  )}
                </div>
              </div>
            ))}

          {/* TAB 3: BOUNDARY CROSSINGS */}
          {activeTab === 'crossings' &&
            (filteredCrossings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No boundary crossings detected.
              </div>
            ) : (
              filteredCrossings.map((c, idx) => (
                <div
                  key={`${c.fromNodeId}-${c.toNodeId}-${idx}`}
                  style={{
                    background: c.isCompliant ? '#1e293b' : '#3b1414',
                    border: `1px solid ${c.isCompliant ? '#334155' : '#7f1d1d'}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {c.fromNodeName}{' '}
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                        ({c.fromZone})
                      </span>{' '}
                      → {c.toNodeName}{' '}
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                        ({c.toZone})
                      </span>
                    </div>
                    {c.warning ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#fca5a5',
                          marginTop: '4px',
                          fontWeight: 500,
                        }}
                      >
                        ⚠️ {c.warning}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#86efac',
                          marginTop: '4px',
                        }}
                      >
                        ✓ In-transit encryption verified (TLS/HTTPS)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {c.complianceStandards.map((std) => (
                      <ComplianceBadge key={std} standard={std} />
                    ))}
                    <span
                      style={{
                        background: c.isCompliant ? '#14532d' : '#dc2626',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {c.isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                    </span>
                  </div>
                </div>
              ))
            ))}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: '#0b1120',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Traced at: {report ? new Date(report.tracedAt).toLocaleTimeString() : '—'} ·{' '}
            {report?.paths.length || 0} end-to-end path(s)
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
