'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type ObjectId,
  type NodeSimulationStatus,
  type SimulatedNodeImpact,
  type FailureSimulationReport,
  simulateFailure,
  getAffectedConnections,
} from '@diagramhq/domain';

export interface FailureSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  initialDownedNodeIds?: (ObjectId | string)[];
  onSelectNode?: (nodeId: string) => void;
}

const STATUS_COLORS: Record<
  NodeSimulationStatus,
  { bg: string; border: string; text: string; badge: string; label: string }
> = {
  down: {
    bg: '#450a0a',
    border: '#7f1d1d',
    text: '#fca5a5',
    badge: '#dc2626',
    label: 'DOWN',
  },
  degraded: {
    bg: '#431407',
    border: '#7c2d12',
    text: '#fdba74',
    badge: '#ea580c',
    label: 'DEGRADED',
  },
  fallback: {
    bg: '#172554',
    border: '#1e3a8a',
    text: '#93c5fd',
    badge: '#2563eb',
    label: 'FALLBACK ACTIVE',
  },
  healthy: {
    bg: '#052e16',
    border: '#14532d',
    text: '#86efac',
    badge: '#16a34a',
    label: 'HEALTHY',
  },
};

const SEVERITY_COLORS = {
  critical: { bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', badge: '#dc2626' },
  high: { bg: '#431407', border: '#7c2d12', text: '#fdba74', badge: '#ea580c' },
  medium: { bg: '#422006', border: '#78350f', text: '#fde68a', badge: '#d97706' },
  low: { bg: '#052e16', border: '#14532d', text: '#86efac', badge: '#16a34a' },
};

function StatusBadge({ status }: { status: NodeSimulationStatus }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.healthy;
  return (
    <span
      style={{
        background: cfg.badge,
        color: '#fff',
        borderRadius: '4px',
        padding: '3px 8px',
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

function SimulatedNodeCard({
  impact,
  onToggleDown,
  onSelectNode,
}: {
  impact: SimulatedNodeImpact;
  onToggleDown: (nodeId: string) => void;
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

  const statusCfg = STATUS_COLORS[impact.status] ?? STATUS_COLORS.healthy;

  return (
    <div
      style={{
        background: statusCfg.bg,
        border: `1px solid ${statusCfg.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: statusCfg.text, flexShrink: 0 }}
      >
        {kindIcon[impact.nodeKind] ?? 'device_hub'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onSelectNode?.(impact.nodeId as string)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: onSelectNode ? 'pointer' : 'default',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {impact.nodeName}
          </button>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>({impact.nodeKind})</span>
        </div>
        <div style={{ fontSize: '12px', color: statusCfg.text, marginTop: '3px' }}>
          {impact.reason}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {impact.hasFallback ? (
          <span
            style={{
              background: '#1e3a8a',
              color: '#93c5fd',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            FALLBACK READY
          </span>
        ) : (
          impact.status !== 'healthy' && (
            <span
              style={{
                background: '#450a0a',
                color: '#fca5a5',
                borderRadius: '4px',
                padding: '2px 7px',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              NO FALLBACK
            </span>
          )
        )}

        <StatusBadge status={impact.status} />

        {impact.hopCount >= 0 && (
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
            {impact.hopCount === 0 ? 'origin' : `+${impact.hopCount} hop`}
          </span>
        )}

        <button
          onClick={() => onToggleDown(impact.nodeId as string)}
          title={impact.isDirectlyDowned ? 'Restore node' : 'Simulate outage on node'}
          style={{
            background: impact.isDirectlyDowned ? '#166534' : '#7f1d1d',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: '4px',
          }}
        >
          {impact.isDirectlyDowned ? 'Restore' : 'Mark Down'}
        </button>
      </div>
    </div>
  );
}

export function FailureSimulationModal({
  isOpen,
  onClose,
  model,
  initialDownedNodeIds,
  onSelectNode,
}: FailureSimulationModalProps): React.JSX.Element | null {
  // Determine default downed nodes if none passed
  const defaultDowned = useMemo<string[]>(() => {
    if (initialDownedNodeIds && initialDownedNodeIds.length > 0) {
      return initialDownedNodeIds.map(String);
    }
    // Default to the first store (DB) or first non-actor object
    const storeObj = model.objects.find((o) => o.kind === 'store');
    if (storeObj) return [storeObj.id as string];
    const nonActor = model.objects.find((o) => o.kind !== 'actor');
    if (nonActor) return [nonActor.id as string];
    return model.objects[0] ? [model.objects[0].id as string] : [];
  }, [initialDownedNodeIds, model.objects]);

  const [downedIds, setDownedIds] = useState<string[]>(defaultDowned);
  const [reason, setReason] = useState<string>('Outage simulation');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleDownedNode = (nodeId: string) => {
    setDownedIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const report: FailureSimulationReport = useMemo(() => {
    return simulateFailure(model, {
      downedNodeIds: downedIds as unknown as ObjectId[],
      reason,
    });
  }, [model, downedIds, reason]);

  const affectedConnections = useMemo(() => {
    return getAffectedConnections(model, report);
  }, [model, report]);

  if (!isOpen) return null;

  // Severity calculation
  const overallSeverity = report.metrics.hasFullOutage
    ? 'critical'
    : report.metrics.totalDegradedNodes > 0
    ? 'high'
    : report.metrics.totalFallbackNodes > 0
    ? 'medium'
    : 'low';

  const severityColors = SEVERITY_COLORS[overallSeverity];

  // Filtered node impacts
  const filteredImpacts = report.nodeImpacts.filter((impact) => {
    if (filterStatus === 'impacted' && impact.status === 'healthy') return false;
    if (
      filterStatus === 'down' ||
      filterStatus === 'degraded' ||
      filterStatus === 'fallback' ||
      filterStatus === 'healthy'
    ) {
      if (impact.status !== filterStatus) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        impact.nodeName.toLowerCase().includes(q) ||
        impact.nodeKind.toLowerCase().includes(q) ||
        impact.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="failure-simulation-modal-title"
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
          maxWidth: '860px',
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
              style={{ color: '#ef4444', fontSize: '24px' }}
            >
              crisis_alert
            </span>
            <div>
              <h2
                id="failure-simulation-modal-title"
                style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
              >
                Failure Simulation
              </h2>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Simulate component outages, evaluate cascade impact, and distinguish fallback vs
                no-fallback paths.
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

        {/* ── Severity Banner ── */}
        <div
          style={{
            background: severityColors.bg,
            borderBottom: `1px solid ${severityColors.border}`,
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
            <span
              style={{
                background: severityColors.badge,
                color: '#fff',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {overallSeverity} Severity
            </span>
            <span style={{ fontSize: '13px', color: severityColors.text, fontWeight: 500 }}>
              {report.metrics.hasFullOutage
                ? 'Critical outage detected: customer-facing flows disrupted without fallback.'
                : report.metrics.totalDegradedNodes > 0
                ? 'Degraded paths detected: some dependents lack fallback mechanisms.'
                : report.metrics.totalFallbackNodes > 0
                ? 'Resilient paths active: all impacted dependents have active fallbacks.'
                : 'Architecture fully healthy: no component outages.'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Disrupted connections: <strong style={{ color: '#e2e8f0' }}>{affectedConnections.length}</strong>
          </div>
        </div>

        {/* ── Simulation Controls (Downed Node Selector + Reason) ── */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0,
            flexWrap: 'wrap',
            background: '#0b1120',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Simulate Outage:
            </span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  toggleDownedNode(e.target.value);
                }
              }}
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value="">+ Add downed node...</option>
              {model.objects.map((o) => (
                <option
                  key={o.id as string}
                  value={o.id as string}
                  disabled={downedIds.includes(o.id as string)}
                >
                  {o.name} ({o.kind}){downedIds.includes(o.id as string) ? ' [DOWN]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Reason:
            </span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Primary DB disk failure"
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
              }}
            />
          </div>

          {downedIds.length > 0 && (
            <button
              onClick={() => setDownedIds([])}
              style={{
                background: 'transparent',
                border: '1px solid #475569',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Clear All Outages
            </button>
          )}
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
            label="Downed Nodes"
            value={report.metrics.totalDownedNodes}
            icon="cancel"
            danger={report.metrics.totalDownedNodes > 0}
          />
          <MetricCard
            label="Degraded (No Fallback)"
            value={report.metrics.totalDegradedNodes}
            icon="warning"
            danger={report.metrics.totalDegradedNodes > 0}
          />
          <MetricCard
            label="Fallback Active"
            value={report.metrics.totalFallbackNodes}
            icon="shield"
            accent={report.metrics.totalFallbackNodes > 0}
          />
          <MetricCard
            label="Healthy Nodes"
            value={report.metrics.totalHealthyNodes}
            icon="check_circle"
          />
          <MetricCard
            label="Customer Facing"
            value={report.metrics.impactedCustomerFacingCount}
            icon="person"
            danger={report.metrics.impactedCustomerFacingCount > 0}
          />
          <MetricCard
            label="Max Cascade Depth"
            value={report.metrics.maxCascadeDepth}
            icon="account_tree"
          />
        </div>

        {/* ── Filter / Search Bar ── */}
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
              { id: 'all', label: `All (${report.nodeImpacts.length})` },
              {
                id: 'impacted',
                label: `Impacted (${report.nodeImpacts.length - report.metrics.totalHealthyNodes})`,
              },
              { id: 'down', label: `Down (${report.metrics.totalDownedNodes})` },
              { id: 'degraded', label: `Degraded (${report.metrics.totalDegradedNodes})` },
              { id: 'fallback', label: `Fallback (${report.metrics.totalFallbackNodes})` },
              { id: 'healthy', label: `Healthy (${report.metrics.totalHealthyNodes})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  background: filterStatus === tab.id ? '#1e293b' : 'transparent',
                  color: filterStatus === tab.id ? '#f1f5f9' : '#94a3b8',
                  border: filterStatus === tab.id ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: filterStatus === tab.id ? 600 : 400,
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
            placeholder="Search nodes..."
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              width: '160px',
            }}
          />
        </div>

        {/* ── Impacted Node List ── */}
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
          {filteredImpacts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              No nodes match the selected criteria.
            </div>
          ) : (
            filteredImpacts.map((impact) => (
              <SimulatedNodeCard
                key={impact.nodeId as string}
                impact={impact}
                onToggleDown={toggleDownedNode}
                onSelectNode={onSelectNode}
              />
            ))
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
            background: '#0b1120',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Simulated at: {new Date(report.simulatedAt).toLocaleTimeString()} · {downedIds.length}{' '}
            node(s) marked down
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
