'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type SecurityArchitectureReport,
  type ExposureSeverity,
  analyzeSecurityArchitecture,
} from '@diagramhq/domain';


export interface SecurityArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  onSelectNode?: (nodeId: string) => void;
}

type TabType =
  | 'exposures'
  | 'boundaries'
  | 'endpoints'
  | 'encryption'
  | 'compliance'
  | 'connections';

const DEFAULT_SEVERITY_CONFIG = {
  bg: '#052e16',
  border: '#14532d',
  text: '#86efac',
  badge: '#16a34a',
  label: 'LOW',
};

const SEVERITY_CONFIG: Record<
  ExposureSeverity,
  { bg: string; border: string; text: string; badge: string; label: string }
> = {
  critical: {
    bg: '#450a0a',
    border: '#7f1d1d',
    text: '#fca5a5',
    badge: '#dc2626',
    label: 'CRITICAL',
  },
  high: {
    bg: '#431407',
    border: '#7c2d12',
    text: '#fdba74',
    badge: '#ea580c',
    label: 'HIGH',
  },
  medium: {
    bg: '#422006',
    border: '#78350f',
    text: '#fde68a',
    badge: '#d97706',
    label: 'MEDIUM',
  },
  low: DEFAULT_SEVERITY_CONFIG,
};

const DEFAULT_TRUST_COLOR = { bg: '#172554', text: '#93c5fd', border: '#1e3a8a' };

const TRUST_LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  untrusted: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  dmz: { bg: '#431407', text: '#fdba74', border: '#7c2d12' },
  trusted: DEFAULT_TRUST_COLOR,
  restricted: { bg: '#3b0764', text: '#d8b4fe', border: '#6b21a8' },
  critical: { bg: '#4c0519', text: '#fecdd3', border: '#9f1239' },
};

function SeverityBadge({ severity }: { severity: ExposureSeverity }) {
  const cfg = SEVERITY_CONFIG[severity] ?? DEFAULT_SEVERITY_CONFIG;

  return (
    <span
      style={{
        background: cfg.badge,
        color: '#fff',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {cfg.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
  danger,
  accent,
  score,
}: {
  label: string;
  value: number | string;
  icon: string;
  danger?: boolean;
  accent?: boolean;
  score?: boolean;
}) {
  const scoreColor =
    typeof value === 'number'
      ? value >= 80
        ? '#4ade80'
        : value >= 50
        ? '#fbbf24'
        : '#f87171'
      : '#e2e8f0';

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
          color: score ? scoreColor : danger ? '#fca5a5' : accent ? '#93c5fd' : '#60a5fa',
        }}
      >
        {icon}
      </span>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: score ? scoreColor : danger ? '#fca5a5' : '#e2e8f0',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function SecurityArchitectureModal({
  isOpen,
  onClose,
  model,
  onSelectNode,
}: SecurityArchitectureModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabType>('exposures');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const report: SecurityArchitectureReport = useMemo(() => {
    return analyzeSecurityArchitecture(model);
  }, [model]);

  if (!isOpen) return null;

  const scoreBadgeColor =
    report.metrics.securityScore >= 80
      ? '#16a34a'
      : report.metrics.securityScore >= 50
      ? '#d97706'
      : '#dc2626';

  const filterText = searchQuery.toLowerCase().trim();

  // Filtered lists
  const filteredExposures = report.exposures.filter(
    (e) =>
      !filterText ||
      e.title.toLowerCase().includes(filterText) ||
      e.targetName.toLowerCase().includes(filterText) ||
      e.description.toLowerCase().includes(filterText) ||
      e.remediation.toLowerCase().includes(filterText)
  );

  const filteredBoundaries = report.boundaries.filter(
    (b) =>
      !filterText ||
      b.name.toLowerCase().includes(filterText) ||
      b.zone.toLowerCase().includes(filterText) ||
      b.level.toLowerCase().includes(filterText)
  );

  const filteredEndpoints = report.publicEndpoints.filter(
    (p) =>
      !filterText ||
      p.nodeName.toLowerCase().includes(filterText) ||
      (p.endpoint && p.endpoint.toLowerCase().includes(filterText)) ||
      (p.authScheme && p.authScheme.toLowerCase().includes(filterText))
  );

  const filteredEncryption = report.encryption.filter(
    (enc) =>
      !filterText ||
      enc.nodeName.toLowerCase().includes(filterText) ||
      (enc.algorithm && enc.algorithm.toLowerCase().includes(filterText)) ||
      enc.sensitiveTypes.some((t) => t.toLowerCase().includes(filterText))
  );

  const filteredCompliance = report.complianceZones.filter(
    (c) =>
      !filterText ||
      c.standard.toLowerCase().includes(filterText) ||
      c.name.toLowerCase().includes(filterText) ||
      c.description.toLowerCase().includes(filterText)
  );

  const filteredConnections = report.crossBoundaryConnections.filter(
    (c) =>
      !filterText ||
      c.sourceName.toLowerCase().includes(filterText) ||
      c.targetName.toLowerCase().includes(filterText) ||
      c.sourceBoundary.toLowerCase().includes(filterText) ||
      c.targetBoundary.toLowerCase().includes(filterText)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-architecture-modal-title"
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
              security
            </span>
            <div>
              <h2
                id="security-architecture-modal-title"
                style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
              >
                Security Architecture & Governance
              </h2>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Trust boundaries, public ingress auth, encryption at rest/in-transit, secrets, and
                compliance zones.
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

        {/* ── Security Posture Banner ── */}
        <div
          style={{
            background:
              report.metrics.criticalExposures > 0
                ? '#450a0a'
                : report.metrics.highExposures > 0
                ? '#431407'
                : '#052e16',
            borderBottom: `1px solid ${
              report.metrics.criticalExposures > 0
                ? '#7f1d1d'
                : report.metrics.highExposures > 0
                ? '#7c2d12'
                : '#14532d'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                background: scoreBadgeColor,
                color: '#fff',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              SCORE: {report.metrics.securityScore}/100
            </span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
              {report.metrics.criticalExposures > 0
                ? `${report.metrics.criticalExposures} CRITICAL security exposure(s) detected — immediate remediation required.`
                : report.metrics.highExposures > 0
                ? `${report.metrics.highExposures} HIGH risk security exposure(s) detected.`
                : report.metrics.totalExposures > 0
                ? `${report.metrics.totalExposures} security finding(s) detected.`
                : 'Architecture fully compliant with standard trust boundary and encryption policies.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {report.metrics.criticalExposures > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {report.metrics.criticalExposures} CRITICAL
              </span>
            )}
            {report.metrics.highExposures > 0 && (
              <span
                style={{
                  background: '#ea580c',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {report.metrics.highExposures} HIGH
              </span>
            )}
          </div>
        </div>

        {/* ── KPI Metric Cards ── */}
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
            label="Security Score"
            value={`${report.metrics.securityScore}%`}
            icon="verified_user"
            score
          />
          <MetricCard
            label="Trust Boundaries"
            value={report.metrics.trustBoundaryCount}
            icon="shield"
            accent
          />
          <MetricCard
            label="Public Ingress"
            value={report.metrics.publicEndpointCount}
            icon="public"
            danger={report.metrics.unsecuredPublicEndpointCount > 0}
          />
          <MetricCard
            label="Sensitive Stores"
            value={report.metrics.sensitiveStoreCount}
            icon="database"
            danger={report.metrics.unencryptedStoreCount > 0}
          />
          <MetricCard
            label="Cross-Boundary Links"
            value={report.metrics.crossBoundaryConnectionCount}
            icon="alt_route"
            danger={report.metrics.unencryptedTransitCount > 0}
          />
          <MetricCard
            label="Exposures"
            value={report.metrics.totalExposures}
            icon="warning"
            danger={report.metrics.totalExposures > 0}
          />
        </div>

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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'exposures', label: `Exposures (${report.exposures.length})` },
              { id: 'boundaries', label: `Boundaries (${report.boundaries.length})` },
              { id: 'endpoints', label: `Endpoints (${report.publicEndpoints.length})` },
              { id: 'encryption', label: `Encryption (${report.encryption.length})` },
              { id: 'compliance', label: `Compliance (${report.complianceZones.length})` },
              {
                id: 'connections',
                label: `Cross-Boundary (${report.crossBoundaryConnections.length})`,
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
                  padding: '5px 11px',
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
            placeholder="Search security items..."
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

        {/* ── Tab Content Panel ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* TAB 1: EXPOSURES */}
          {activeTab === 'exposures' &&
            (filteredExposures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '36px', color: '#16a34a', display: 'block', marginBottom: '8px' }}
                >
                  verified
                </span>
                No security exposures found matching criteria.
              </div>
            ) : (
              filteredExposures.map((exp) => {
                const cfg = SEVERITY_CONFIG[exp.severity] ?? DEFAULT_SEVERITY_CONFIG;
                return (

                  <div
                    key={exp.id}
                    style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SeverityBadge severity={exp.severity} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                          {exp.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Target:{' '}
                        <button
                          onClick={() => onSelectNode?.(exp.targetId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: onSelectNode ? 'pointer' : 'default',
                            fontWeight: 600,
                            padding: 0,
                            fontSize: '12px',
                          }}
                        >
                          {exp.targetName}
                        </button>
                      </span>
                    </div>


                    <div style={{ fontSize: '12px', color: cfg.text }}>{exp.description}</div>

                    <div
                      style={{
                        background: '#0f172a88',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#94a3b8',
                      }}
                    >
                      <strong style={{ color: '#38bdf8' }}>Remediation: </strong>
                      {exp.remediation}
                    </div>

                    {exp.complianceImpact && exp.complianceImpact.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Impacts:</span>
                        {exp.complianceImpact.map((std) => (
                          <span
                            key={std}
                            style={{
                              background: '#312e81',
                              color: '#c7d2fe',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          >
                            {std}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ))}

          {/* TAB 2: TRUST BOUNDARIES */}
          {activeTab === 'boundaries' &&
            filteredBoundaries.map((b) => {
              const colors = TRUST_LEVEL_COLORS[b.level] ?? DEFAULT_TRUST_COLOR;
              return (

                <div
                  key={b.id}
                  style={{
                    background: '#1e293b',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                        {b.name}
                      </span>
                      <span
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {b.level}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {b.description}
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {b.objectIds.length} component(s)
                  </span>
                </div>
              );
            })}

          {/* TAB 3: PUBLIC ENDPOINTS */}
          {activeTab === 'endpoints' &&
            filteredEndpoints.map((ep) => (
              <div
                key={ep.nodeId as string}
                style={{
                  background: ep.isSecured ? '#1e293b' : '#450a0a',
                  border: `1px solid ${ep.isSecured ? '#334155' : '#7f1d1d'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {ep.nodeName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>({ep.nodeKind})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                    Auth Scheme: <strong style={{ color: '#e2e8f0' }}>{ep.authScheme || 'NONE'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ep.isSecured ? (
                    <span
                      style={{
                        background: '#14532d',
                        color: '#86efac',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      SECURED
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      UNAUTHENTICATED
                    </span>
                  )}
                </div>
              </div>
            ))}

          {/* TAB 4: DATA ENCRYPTION */}
          {activeTab === 'encryption' &&
            filteredEncryption.map((enc) => (
              <div
                key={enc.nodeId as string}
                style={{
                  background: enc.isExposed ? '#450a0a' : '#1e293b',
                  border: `1px solid ${enc.isExposed ? '#7f1d1d' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {enc.nodeName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>({enc.nodeKind})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                    At Rest:{' '}
                    <strong style={{ color: enc.atRest ? '#4ade80' : '#f87171' }}>
                      {enc.atRest ? `Encrypted (${enc.algorithm || 'AES-256'})` : 'UNENCRYPTED'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {enc.sensitiveTypes.map((t) => (
                    <span
                      key={t}
                      style={{
                        background: '#1e3a8a',
                        color: '#93c5fd',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {enc.isExposed && (
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      EXPOSED STORE
                    </span>
                  )}
                </div>
              </div>
            ))}

          {/* TAB 5: COMPLIANCE ZONES */}
          {activeTab === 'compliance' &&
            filteredCompliance.map((zone) => (
              <div
                key={zone.standard}
                style={{
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#1d4ed8',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      {zone.standard}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                      {zone.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    {zone.description}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                    }}
                  >
                    {zone.objectIds.length} Entities
                  </span>
                  <span
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                    }}
                  >
                    {zone.sensitiveStoreCount} Stores
                  </span>
                </div>
              </div>
            ))}

          {/* TAB 6: CROSS-BOUNDARY CONNECTIONS */}
          {activeTab === 'connections' &&
            filteredConnections.map((conn) => (
              <div
                key={conn.connectionId as string}
                style={{
                  background: conn.risk !== 'none' ? '#3b1414' : '#1e293b',
                  border: `1px solid ${conn.risk !== 'none' ? '#7f1d1d' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                    {conn.sourceName}{' '}
                    <span style={{ color: '#64748b', fontSize: '12px' }}>({conn.sourceBoundary})</span>{' '}
                    → {conn.targetName}{' '}
                    <span style={{ color: '#64748b', fontSize: '12px' }}>({conn.targetBoundary})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                    In-Transit: {conn.inTransitEncryption ? 'Encrypted (TLS)' : 'PLAINTEXT'} ·
                    Auth: {conn.authEnforced ? 'Authenticated' : 'UNAUTHENTICATED'}
                  </div>
                </div>

                {conn.risk !== 'none' && <SeverityBadge severity={conn.risk} />}
              </div>
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
            Analyzed at: {new Date(report.analyzedAt).toLocaleTimeString()} ·{' '}
            {report.boundaries.length} boundary zones evaluated
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
