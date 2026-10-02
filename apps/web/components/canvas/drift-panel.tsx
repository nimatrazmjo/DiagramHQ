'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type ArchitectureModel,
  type DriftSeverity,
  type DriftType,
  type ArchitectureDriftReport,
  type ArchitecturePullRequest,
  detectArchitectureDrift,
  reconcileDriftDirectly,
  ignoreDriftItem,
  createChangeRequestFromDrift,
} from '@diagramhq/domain';

export interface ArchitectureDriftModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  documentedModel: ArchitectureModel;
  actualModel: ArchitectureModel;
  onModelUpdated?: (updatedModel: ArchitectureModel) => void;
  onPullRequestCreated?: (pr: ArchitecturePullRequest) => void;
}

export function ArchitectureDriftModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  documentedModel,
  actualModel,
  onModelUpdated,
  onPullRequestCreated,
}: ArchitectureDriftModalProps): React.JSX.Element | null {
  const [report, setReport] = useState<ArchitectureDriftReport>(() =>
    detectArchitectureDrift({
      architectureId,
      documentedModel,
      actualModel,
    })
  );

  const [severityFilter, setSeverityFilter] = useState<DriftSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DriftType | 'all'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedDriftIds, setSelectedDriftIds] = useState<string[]>([]);
  const [ignoreModalItemId, setIgnoreModalItemId] = useState<string | null>(null);
  const [ignoreReasonInput, setIgnoreReasonInput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectDrift = (id: string) => {
    setSelectedDriftIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleUpdateModelDirectly = (itemIds: string[]) => {
    const updated = reconcileDriftDirectly({
      documentedModel,
      actualModel,
      driftItemIdsToReconcile: itemIds,
      report,
    });
    setReport({ ...report });
    if (onModelUpdated) {
      onModelUpdated(updated);
    }
    setNotification(`Successfully reconciled ${itemIds.length} drift item(s) directly into the model.`);
  };

  const handleOpenIgnoreModal = (id: string) => {
    setIgnoreModalItemId(id);
    setIgnoreReasonInput('Temporary migration in progress');
  };

  const handleConfirmIgnore = () => {
    if (!ignoreModalItemId) return;
    ignoreDriftItem(report, ignoreModalItemId, ignoreReasonInput || 'Ignored by architect');
    setReport({ ...report });
    setIgnoreModalItemId(null);
    setNotification('Drift item marked as ignored with recorded reason.');
  };

  const handleCreateChangeRequest = (itemIds?: string[]) => {
    const pr = createChangeRequestFromDrift({
      report,
      documentedModel,
      actualModel,
      driftItemIds: itemIds,
      author: {
        id: 'usr_architect',
        name: 'Lead Architect',
        email: 'architect@diagramhq.com',
      },
      title: 'Reconcile Architecture Drift',
      description: 'Synchronize architecture model with discovered infrastructure telemetry.',
    });

    setReport({ ...report });
    if (onPullRequestCreated) {
      onPullRequestCreated(pr);
    }
    setNotification(`Created Architecture Pull Request #${pr.number || 1} (${pr.id}) with risk level: ${pr.risk.level.toUpperCase()}.`);
  };

  const filteredItems = report.driftItems.filter((item) => {
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  const severityColor: Record<DriftSeverity, { bg: string; text: string; border: string }> = {
    critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    high: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
    medium: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    low: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    informational: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drift-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <h2
              id="drift-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}
            >
              Architecture Drift & Governance (F084)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Documented vs actual infrastructure and code reconciliation with audit-grade governance
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
            gap: '18px',
          }}
        >
          {/* Notification */}
          {notification && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{notification}</span>
              <button
                onClick={() => setNotification(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1e40af' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px',
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL DRIFT ITEMS</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {report.summary.totalDriftItems}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef2f2',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
              }}
            >
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>CRITICAL / HIGH</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#991b1b', marginTop: '2px' }}>
                {report.summary.bySeverity.critical + report.summary.bySeverity.high}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #fde68a',
              }}
            >
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>UNMANAGED</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                {report.summary.unmanagedCount}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef2f2',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
              }}
            >
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>MISSING</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#b91c1c', marginTop: '2px' }}>
                {report.summary.missingCount}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>MISMATCHES</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                {report.summary.attributeMismatchCount}
              </div>
            </div>
          </div>

          {/* Filter Bar & Bulk Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {/* Severity Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Severity:</span>
              <button
                onClick={() => setSeverityFilter('all')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: severityFilter === 'all' ? '#0f172a' : '#ffffff',
                  color: severityFilter === 'all' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    textTransform: 'capitalize',
                    border: '1px solid #cbd5e1',
                    backgroundColor: severityFilter === sev ? '#0f172a' : '#ffffff',
                    color: severityFilter === sev ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {sev}
                </button>
              ))}

              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginLeft: '8px' }}>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DriftType | 'all')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Types</option>
                <option value="unmanaged_resource">Unmanaged Resource</option>
                <option value="missing_resource">Missing Resource</option>
                <option value="attribute_mismatch">Attribute Mismatch</option>
                <option value="undocumented_connection">Undocumented Connection</option>
                <option value="missing_connection">Missing Connection</option>
              </select>
            </div>

            {/* Bulk Action Buttons (Acceptance Criteria: Update Model / Ignore / Create Change Request) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleUpdateModelDirectly(selectedDriftIds.length > 0 ? selectedDriftIds : filteredItems.map((i) => i.id))}
                data-testid="bulk-update-model-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #0284c7',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Update Model ({selectedDriftIds.length > 0 ? selectedDriftIds.length : 'All'})
              </button>

              <button
                onClick={() => handleCreateChangeRequest(selectedDriftIds.length > 0 ? selectedDriftIds : undefined)}
                data-testid="bulk-create-pr-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #7c3aed',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create Change Request (PR)
              </button>
            </div>
          </div>

          {/* Drift Inventory List */}
          <div
            data-testid="drift-items-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '440px',
              overflowY: 'auto',
            }}
          >
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                }}
              >
                No architecture drift detected under current filter.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedDriftIds.includes(item.id);
                const isExpanded = expandedItemId === item.id;
                const sevCol = severityColor[item.severity];

                return (
                  <div
                    key={item.id}
                    data-testid={`drift-item-${item.id}`}
                    style={{
                      border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: item.status === 'reconciled' ? '#f0fdf4' : item.status === 'ignored' ? '#f8fafc' : '#ffffff',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectDrift(item.id)}
                          aria-label={`Select drift item ${item.title}`}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: sevCol.bg,
                            color: sevCol.text,
                            border: `1px solid ${sevCol.border}`,
                          }}
                        >
                          {item.severity}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          {item.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                          {item.title}
                        </span>

                        {item.status !== 'detected' && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: item.status === 'reconciled' ? '#15803d' : '#64748b',
                              backgroundColor: item.status === 'reconciled' ? '#dcfce7' : '#e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Acceptance Criteria: Update Model / Ignore / Create Change Request) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.status === 'detected' && (
                          <>
                            <button
                              onClick={() => handleUpdateModelDirectly([item.id])}
                              data-testid={`action-update-${item.id}`}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #0284c7',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Update Model
                            </button>

                            <button
                              onClick={() => handleOpenIgnoreModal(item.id)}
                              data-testid={`action-ignore-${item.id}`}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Ignore
                            </button>

                            <button
                              onClick={() => handleCreateChangeRequest([item.id])}
                              data-testid={`action-pr-${item.id}`}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #7c3aed',
                                backgroundColor: '#f5f3ff',
                                color: '#6d28d9',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Create PR
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#0284c7',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          {isExpanded ? 'Hide Details ▴' : 'View Details ▾'}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', paddingLeft: '26px' }}>
                      {item.description}
                    </div>

                    {/* Expandable Details & Attribute Diffs */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '6px',
                          marginLeft: '26px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '12px',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {item.attributeDiffs && item.attributeDiffs.length > 0 && (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                              Attribute Comparison (Documented vs. Actual):
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                  <th style={{ padding: '4px' }}>Attribute</th>
                                  <th style={{ padding: '4px', color: '#991b1b' }}>Documented</th>
                                  <th style={{ padding: '4px', color: '#166534' }}>Actual (Live)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.attributeDiffs.map((diff, i) => (
                                  <tr key={i} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                    <td style={{ padding: '4px', fontWeight: 600 }}>{diff.attribute}</td>
                                    <td style={{ padding: '4px', color: '#b91c1c' }}>{String(diff.documentedValue)}</td>
                                    <td style={{ padding: '4px', color: '#15803d' }}>{String(diff.actualValue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#334155' }}>
                            <strong>Evidence Source:</strong> <code>{item.evidence.sourceType}</code> (
                            {item.evidence.sourceRef})
                          </span>
                          <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                            {Math.round(item.evidence.confidence * 100)}% Confidence
                          </span>
                        </div>

                        {item.ignoreReason && (
                          <div style={{ color: '#b45309', backgroundColor: '#fffbeb', padding: '6px', borderRadius: '4px' }}>
                            <strong>Ignore Reason:</strong> {item.ignoreReason}
                          </div>
                        )}

                        {item.pullRequestId && (
                          <div style={{ color: '#6d28d9', backgroundColor: '#f5f3ff', padding: '6px', borderRadius: '4px' }}>
                            <strong>Pull Request:</strong> <code>{item.pullRequestId}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Close
          </button>

          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Phase 11 — Drift and Governance Engine
          </span>
        </div>

        {/* Ignore Modal Sub-dialog */}
        {ignoreModalItemId && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '20px',
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                Ignore Drift Item
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Provide an architectural waiver or reasoning for ignoring this drift item:
              </p>
              <textarea
                value={ignoreReasonInput}
                onChange={(e) => setIgnoreReasonInput(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  fontSize: '13px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setIgnoreModalItemId(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmIgnore}
                  data-testid="confirm-ignore-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Ignore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
