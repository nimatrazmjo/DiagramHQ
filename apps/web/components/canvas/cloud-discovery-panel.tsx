'use client';

import React, { useState } from 'react';
import {
  type ArchitectureId,
  type VersionId,
  type CloudProvider,
  type CloudResourceCategory,
  type CloudAccountSpec,
  type DiscoveryRunReport,
  type ModelObject,
  ALL_CLOUD_PROVIDERS,
  ALL_CLOUD_CATEGORIES,
  createMockCloudAccounts,
  createMockMultiCloudResources,
  reconcileCloudResources,
  applyDiscoveryProposals,
} from '@diagramhq/domain';

export interface CloudDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  currentObjects?: ModelObject[];
  onApplySuccess?: (result: {
    newObjects: ModelObject[];
    updatedObjects: ModelObject[];
    removedObjectIds: string[];
  }) => void;
}

export function CloudDiscoveryModal({
  isOpen,
  onClose,
  architectureId = 'arch-prod' as ArchitectureId,
  versionId = 'ver-main' as VersionId,
  currentObjects = [],
  onApplySuccess,
}: CloudDiscoveryModalProps): React.JSX.Element | null {
  const [accounts] = useState<CloudAccountSpec[]>(() => createMockCloudAccounts());
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() =>
    createMockCloudAccounts().map((a) => a.id)
  );
  const [providerFilter, setProviderFilter] = useState<CloudProvider | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CloudResourceCategory | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'update' | 'remove_stale'>('all');
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [report, setReport] = useState<DiscoveryRunReport | null>(null);
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAccountSelection = (accId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const handleRunDiscoveryScan = () => {
    const activeAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));
    const allDiscovered = createMockMultiCloudResources();

    // Filter resources by selected accounts
    const activeAccountNames = new Set(activeAccounts.map((a) => a.accountIdentifier));
    const filteredDiscovered = allDiscovered.filter((r) =>
      activeAccountNames.has(r.accountId) || activeAccounts.some((a) => a.provider === r.provider)
    );

    const scanReport = reconcileCloudResources({
      architectureId,
      accounts: activeAccounts,
      discoveredResources: filteredDiscovered,
      currentObjects,
    });

    setReport(scanReport);
    // Pre-select all create & update proposals
    const defaultAccepted = scanReport.proposals.map((p) => p.id);
    setSelectedProposalIds(defaultAccepted);
    setNotification(
      `Discovered ${scanReport.summary.totalDiscovered} resources across ${activeAccounts.length} accounts. Generated ${scanReport.proposals.length} proposals.`
    );
  };

  const toggleProposalSelection = (propId: string) => {
    setSelectedProposalIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const handleSelectAllProposals = () => {
    if (!report) return;
    if (selectedProposalIds.length === filteredProposals.length) {
      setSelectedProposalIds([]);
    } else {
      setSelectedProposalIds(filteredProposals.map((p) => p.id));
    }
  };

  const handleApply = () => {
    if (!report) return;
    const applied = applyDiscoveryProposals(report, selectedProposalIds, versionId);
    if (onApplySuccess) {
      onApplySuccess(applied);
    }
    setNotification(
      `Successfully applied ${applied.newObjects.length} additions and ${applied.updatedObjects.length} updates to architecture.`
    );
  };

  const filteredProposals = (report?.proposals || []).filter((p) => {
    if (providerFilter !== 'all' && p.resource.provider !== providerFilter) return false;
    if (categoryFilter !== 'all' && p.resource.category !== categoryFilter) return false;
    if (actionFilter !== 'all' && p.action !== actionFilter) return false;
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-modal-title"
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
          maxWidth: '1060px',
          maxHeight: '90vh',
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
              id="discovery-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}
            >
              Live Cloud Resource Discovery
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Discover live infrastructure across multi-cloud accounts and generate grounded architecture proposals
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
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Notification Banner */}
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

          {/* Account Selection Bar */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Connected Cloud Accounts ({selectedAccountIds.length}/{accounts.length} active):
              </span>
              <button
                onClick={handleRunDiscoveryScan}
                data-testid="run-discovery-btn"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚡</span> Run Live Scan
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {accounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggleAccountSelection(acc.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#e0f2fe' : '#ffffff',
                      color: isSelected ? '#0369a1' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{isSelected ? '☑' : '☐'}</span>
                    <span>{acc.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase' }}>
                      ({acc.provider})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scan Results & Proposals */}
          {report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DISCOVERED</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {report.summary.totalDiscovered}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>PROPOSED ADDS</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#065f46' }}>
                    {report.summary.unmappedCount}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>UPDATES</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>
                    {report.summary.updatedCount}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>DRIFT / STALE</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#991b1b' }}>
                    {report.summary.staleCount}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>UP TO DATE</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>
                    {report.summary.matchedCount}
                  </div>
                </div>
              </div>

              {/* Filter Row */}
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
                {/* Provider filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Provider:</span>
                  <button
                    onClick={() => setProviderFilter('all')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: providerFilter === 'all' ? '#0f172a' : '#ffffff',
                      color: providerFilter === 'all' ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  {ALL_CLOUD_PROVIDERS.map((prov) => (
                    <button
                      key={prov}
                      onClick={() => setProviderFilter(prov)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        border: '1px solid #cbd5e1',
                        backgroundColor: providerFilter === prov ? '#0f172a' : '#ffffff',
                        color: providerFilter === prov ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {prov}
                    </button>
                  ))}
                </div>

                {/* Category filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Category:</span>
                  <button
                    onClick={() => setCategoryFilter('all')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: categoryFilter === 'all' ? '#0f172a' : '#ffffff',
                      color: categoryFilter === 'all' ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  {ALL_CLOUD_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'capitalize',
                        border: '1px solid #cbd5e1',
                        backgroundColor: categoryFilter === cat ? '#0f172a' : '#ffffff',
                        color: categoryFilter === cat ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Action filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Action:</span>
                  {(['all', 'create', 'update', 'remove_stale'] as const).map((act) => (
                    <button
                      key={act}
                      onClick={() => setActionFilter(act)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'capitalize',
                        border: '1px solid #cbd5e1',
                        backgroundColor: actionFilter === act ? '#0f172a' : '#ffffff',
                        color: actionFilter === act ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {act.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Select All Toggle */}
                <button
                  onClick={handleSelectAllProposals}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {selectedProposalIds.length === filteredProposals.length
                    ? 'Deselect All'
                    : 'Select All Visible'}
                </button>
              </div>

              {/* Proposal Inventory List */}
              <div
                data-testid="proposals-list"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {filteredProposals.length === 0 ? (
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
                    No proposals match the current filter criteria.
                  </div>
                ) : (
                  filteredProposals.map((proposal) => {
                    const isSelected = selectedProposalIds.includes(proposal.id);
                    const isExpanded = expandedProposalId === proposal.id;

                    const actionColor =
                      proposal.action === 'create'
                        ? { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }
                        : proposal.action === 'update'
                        ? { bg: '#fffbeb', text: '#92400e', border: '#fde68a' }
                        : { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };

                    return (
                      <div
                        key={proposal.id}
                        data-testid={`proposal-item-${proposal.resource.name}`}
                        style={{
                          border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                          padding: '12px 14px',
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
                              onChange={() => toggleProposalSelection(proposal.id)}
                              aria-label={`Select proposal for ${proposal.resource.name}`}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: actionColor.bg,
                                color: actionColor.text,
                                border: `1px solid ${actionColor.border}`,
                              }}
                            >
                              {proposal.action.replace('_', ' ')}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                              {proposal.resource.name}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#475569',
                                backgroundColor: '#f1f5f9',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              Kind: {proposal.proposedObject.kind}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#0284c7',
                                backgroundColor: '#e0f2fe',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {proposal.resource.provider}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {proposal.resource.region}
                            </span>
                          </div>

                          <button
                            onClick={() => setExpandedProposalId(isExpanded ? null : proposal.id)}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              fontSize: '12px',
                              color: '#0284c7',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {isExpanded ? 'Hide Evidence ▴' : 'View Evidence ▾'}
                          </button>
                        </div>

                        {/* Summary / Explanation */}
                        <div style={{ fontSize: '12px', color: '#475569', paddingLeft: '26px' }}>
                          {proposal.explanation}
                        </div>

                        {/* Grounded Evidence Details Drawer */}
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: '6px',
                              marginLeft: '26px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                Grounded Cloud Evidence (F083)
                              </span>
                              <span
                                style={{
                                  backgroundColor: '#dcfce7',
                                  color: '#166534',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                }}
                              >
                                {Math.round(proposal.evidence.confidence * 100)}% Confidence
                              </span>
                            </div>
                            <div style={{ color: '#334155' }}>
                              <strong>Resource ID / ARN:</strong>{' '}
                              <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                                {proposal.evidence.resourceId}
                              </code>
                            </div>
                            <div style={{ color: '#334155' }}>
                              <strong>Account:</strong> {proposal.evidence.accountName} (
                              {proposal.evidence.accountId})
                            </div>
                            <div style={{ color: '#334155' }}>
                              <strong>Resource Type:</strong> {proposal.evidence.resourceType}
                            </div>
                            <div style={{ color: '#334155' }}>
                              <strong>Reason:</strong> {proposal.evidence.matchReason}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>
                              Discovered: {proposal.evidence.discoveredAt}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '32px' }}>☁️</div>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                No active scan report
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px' }}>
                Select cloud accounts above and click <strong>&quot;Run Live Scan&quot;</strong> to discover active cloud
                workloads, databases, storage buckets, and networks.
              </div>
            </div>
          )}
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
            Cancel
          </button>

          {report && (
            <button
              onClick={handleApply}
              data-testid="apply-proposals-btn"
              disabled={selectedProposalIds.length === 0}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedProposalIds.length > 0 ? '#0284c7' : '#94a3b8',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: selectedProposalIds.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✓</span> Apply Selected Proposals ({selectedProposalIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
