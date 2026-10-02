'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type BlastRadiusReport,
  type ImpactedNode,
  type ObjectId,
  computeBlastRadius,
} from '@diagramhq/domain';

export interface BlastRadiusModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  targetNodeId?: ObjectId;
  onSelectNode?: (nodeId: string) => void;
}

const SEVERITY_COLORS = {
  critical: { bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', badge: '#dc2626' },
  high: { bg: '#431407', border: '#7c2d12', text: '#fdba74', badge: '#ea580c' },
  medium: { bg: '#422006', border: '#78350f', text: '#fde68a', badge: '#d97706' },
  low: { bg: '#052e16', border: '#14532d', text: '#86efac', badge: '#16a34a' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.low;
  return (
    <span
      style={{
        background: colors.badge,
        color: '#fff',
        borderRadius: '4px',
        padding: '3px 9px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {severity}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: number | string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        background: danger ? '#3b1414' : '#1e293b',
        border: `1px solid ${danger ? '#7f1d1d' : '#334155'}`,
        borderRadius: '8px',
        padding: '12px 14px',
        minWidth: '90px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '18px', color: danger ? '#fca5a5' : '#60a5fa' }}
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

function ImpactedNodeCard({
  node,
  onSelectNode,
}: {
  node: ImpactedNode;
  onSelectNode?: (nodeId: string) => void;
}) {
  const kindIcon: Record<string, string> = {
    application: 'api',
    system: 'hub',
    store: 'database',
    actor: 'person',
    component: 'widgets',
    group: 'folder',
  };

  return (
    <div
      style={{
        background: '#1e293b',
        border: `1px solid ${node.isCustomerFacing ? '#854d0e' : '#334155'}`,
        borderRadius: '8px',
        padding: '11px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '18px', color: node.isCustomerFacing ? '#fbbf24' : '#60a5fa', flexShrink: 0 }}
      >
        {kindIcon[node.kind] ?? 'device_hub'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          onClick={() => onSelectNode?.(node.id as string)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: onSelectNode ? 'pointer' : 'default',
            color: '#e2e8f0',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          {node.name}
        </button>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          {node.kind}
          {node.team && <span style={{ marginLeft: '8px', color: '#94a3b8' }}>@ {node.team}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {node.isCustomerFacing && (
          <span
            style={{
              background: '#78350f',
              color: '#fbbf24',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            CUSTOMER
          </span>
        )}
        {!node.hasFallback && (
          <span
            style={{
              background: '#450a0a',
              color: '#fca5a5',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            NO FALLBACK
          </span>
        )}
        <span
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
          }}
        >
          hop {node.hopCount}
        </span>
      </div>
    </div>
  );
}

export function BlastRadiusModal({
  isOpen,
  onClose,
  model,
  targetNodeId,
  onSelectNode,
}: BlastRadiusModalProps): React.JSX.Element | null {
  // If no targetNodeId, default to first non-actor node
  const defaultTarget = useMemo(
    () =>
      targetNodeId ??
      (model.objects.find((o) => o.kind !== 'actor')?.id as ObjectId | undefined) ??
      model.objects[0]?.id,
    [targetNodeId, model.objects]
  );

  const [selectedTarget, setSelectedTarget] = useState<string>(defaultTarget as string ?? '');

  const report: BlastRadiusReport | null = useMemo(() => {
    if (!selectedTarget) return null;
    return computeBlastRadius(model, selectedTarget as unknown as ObjectId);
  }, [model, selectedTarget]);

  if (!isOpen) return null;

  const severityColors =
    SEVERITY_COLORS[report?.metrics.severityScore ?? 'low'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blast-radius-modal-title"
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
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
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
              style={{ color: '#f87171', fontSize: '22px' }}
            >
              radar
            </span>
            <h2
              id="blast-radius-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
            >
              Blast-Radius Analysis
            </h2>
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

        {/* ── Target Node Selector + Severity Banner ── */}
        {report && (
          <div
            style={{
              background: severityColors.bg,
              borderBottom: `1px solid ${severityColors.border}`,
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                Failing node:
              </span>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  maxWidth: '200px',
                }}
              >
                {model.objects.map((o) => (
                  <option key={o.id as string} value={o.id as string}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Severity:</span>
              <SeverityBadge severity={report.metrics.severityScore} />
            </div>
            {report.metrics.hasCriticalPath && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ color: '#fca5a5', fontSize: '16px' }}
                >
                  warning
                </span>
                <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>
                  Critical path with no fallback detected
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Metrics KPI Row ── */}
        {report && (
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #1e293b',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <MetricCard label="Services" value={report.metrics.impactedServiceCount} icon="api" />
              <MetricCard label="Databases" value={report.metrics.impactedDatabaseCount} icon="database" />
              <MetricCard label="Flows" value={report.metrics.impactedFlowCount} icon="alt_route" />
              <MetricCard
                label="Customer Facing"
                value={report.metrics.customerFacingCount}
                icon="person"
                danger={report.metrics.customerFacingCount > 0}
              />
              <MetricCard label="Teams" value={report.metrics.teamCount} icon="group" />
              <MetricCard label="Max Hops" value={report.metrics.maxHops} icon="timeline" />
            </div>
          </div>
        )}

        {/* ── Impacted Nodes List ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {!report || report.impactedNodes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '36px', display: 'block', marginBottom: '10px', color: '#334155' }}
              >
                check_circle
              </span>
              No upstream dependents found — isolated impact.
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                {report.impactedNodes.length} upstream node
                {report.impactedNodes.length !== 1 ? 's' : ''} impacted by failure of{' '}
                <strong style={{ color: '#94a3b8' }}>{report.targetNodeName}</strong>
              </div>
              {report.impactedNodes
                .sort((a, b) => a.hopCount - b.hopCount)
                .map((node) => (
                  <ImpactedNodeCard
                    key={node.id as string}
                    node={node}
                    onSelectNode={onSelectNode}
                  />
                ))}
            </>
          )}
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
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {report
              ? `${report.impactedFlows.length} flow${report.impactedFlows.length !== 1 ? 's' : ''} disrupted`
              : '—'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 16px',
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
