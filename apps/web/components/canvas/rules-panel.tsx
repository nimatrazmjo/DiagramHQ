'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type OrgRulesEvaluationReport,
  evaluateArchitectureRules,
} from '@diagramhq/domain';

export interface ArchitectureRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  onSelectTarget?: (targetId: string, targetType: 'object' | 'connection') => void;
}

export function ArchitectureRulesModal({
  isOpen,
  onClose,
  model,
  onSelectTarget,
}: ArchitectureRulesModalProps): React.JSX.Element | null {
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const report: OrgRulesEvaluationReport = useMemo(() => {
    return evaluateArchitectureRules(model);
  }, [model]);

  if (!isOpen) return null;

  const filteredViolations = report.violations.filter((v) => {
    if (selectedRuleFilter !== 'all' && v.ruleId !== selectedRuleFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = v.targetName.toLowerCase().includes(q);
      const matchReason = v.reason.toLowerCase().includes(q);
      const matchRule = v.ruleName.toLowerCase().includes(q) || v.ruleId.toLowerCase().includes(q);
      if (!matchName && !matchReason && !matchRule) return false;
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="architecture-rules-modal-title"
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
              id="architecture-rules-modal-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}
            >
              Organization Architecture Rules (F086)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Enforce mandatory enterprise architecture policies across ownership, auth, data boundaries, and PII
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
          {/* Status Hero Card */}
          {report.isCompliant ? (
            <div
              data-testid="rules-compliant-banner"
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
                  backgroundColor: '#16a34a',
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
                  Model is 100% Policy Compliant
                </div>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
                  All 4 enterprise governance rules satisfied: Owner Required, External API Auth, No Cross-Service DB Access, and PII Flow Restrictions.
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
                4 / 4 Rules Passing
              </div>
            </div>
          ) : (
            <div
              data-testid="rules-noncompliant-banner"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>POLICY STATUS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  NON-COMPLIANT
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL VIOLATIONS</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {report.totalViolations}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>POLICY ERRORS</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
                  {report.errorCount}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>RULES PASSING</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                  {report.ruleSummaries.filter((r) => r.passed).length} / {report.ruleSummaries.length}
                </div>
              </div>
            </div>
          )}

          {/* 4 Canonical Rule Cards */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Governance Policies
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
              }}
            >
              {report.ruleSummaries.map((rule) => {
                const isSelected = selectedRuleFilter === rule.ruleId;
                return (
                  <div
                    key={rule.ruleId}
                    data-testid={`rule-card-${rule.ruleId}`}
                    onClick={() => setSelectedRuleFilter(isSelected ? 'all' : rule.ruleId)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#0284c7' : rule.passed ? '#e2e8f0' : '#fecaca'}`,
                      backgroundColor: isSelected ? '#f0f9ff' : rule.passed ? '#ffffff' : '#fef2f2',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                        {rule.ruleId}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: rule.passed ? '#dcfce7' : '#fee2e2',
                          color: rule.passed ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {rule.passed ? 'PASSED' : `${rule.violationCount} FAILED`}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {rule.ruleName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>
                      {rule.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '6px 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter Rule:</span>
              <select
                value={selectedRuleFilter}
                onChange={(e) => setSelectedRuleFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Rules ({report.violations.length})</option>
                {report.ruleSummaries.map((r) => (
                  <option key={r.ruleId} value={r.ruleId}>
                    {r.ruleName} ({r.violationCount})
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Search violations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                width: '160px',
              }}
            />
          </div>

          {/* Violations List */}
          {filteredViolations.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              No policy violations found matching current filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredViolations.map((v) => (
                <div
                  key={v.id}
                  data-testid={`rule-violation-card-${v.id}`}
                  style={{
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Top row */}
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
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        POLICY ERROR
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {v.ruleName}
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
                        {v.ruleId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {v.targetName}
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
                        {v.targetType}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                    {v.reason}
                  </div>

                  {/* Remediation */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>Remediation:</span>
                      <span>{v.remediation}</span>
                    </div>

                    {onSelectTarget && (
                      <button
                        onClick={() => onSelectTarget(v.targetId, v.targetType)}
                        data-testid={`focus-target-btn-${v.id}`}
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
              ))}
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
            Evaluated against canonical org policies: Owner, Auth, Isolation, PII
          </div>
          <button
            onClick={onClose}
            data-testid="rules-close-btn"
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
  );
}
