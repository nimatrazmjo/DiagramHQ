'use client';

import React, { useState } from 'react';
import {
  calculateRetentionCutoffDate,
  createDefaultOrganizationPolicies,
  evaluateExportControl,
  evaluateIpRestriction,
  evaluateSessionPolicy,
  isValidIpOrCidr,
  type MemberRole,
  type OrganizationPolicies,
  type PolicyEnforcementMode,
  type PolicyEvaluationResult,
  type PolicyExportFormat,
  type OrgId,
} from '@diagramhq/domain';

export interface OrgPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  initialPolicies?: OrganizationPolicies;
  onSave?: (policies: OrganizationPolicies) => void;
}

export function OrgPoliciesModal({
  isOpen,
  onClose,
  orgId = 'org_enterprise_primary',
  initialPolicies,
  onSave,
}: OrgPoliciesModalProps): JSX.Element | null {
  const [policies, setPolicies] = useState<OrganizationPolicies>(() => {
    return initialPolicies ?? createDefaultOrganizationPolicies(orgId as OrgId);
  });

  const [activeTab, setActiveTab] = useState<'ip' | 'session' | 'retention' | 'export' | 'simulator'>('ip');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // IP configuration draft states
  const [newAllowedIp, setNewAllowedIp] = useState('');
  const [ipValidationError, setIpValidationError] = useState<string | null>(null);

  // Live Simulator state
  const [testIp, setTestIp] = useState('192.168.1.100');
  const [testUserRole, setTestUserRole] = useState<MemberRole>('editor');
  const [ipTestResult, setIpTestResult] = useState<PolicyEvaluationResult | null>(null);

  const [testSessionIdleMinutes, setTestSessionIdleMinutes] = useState(15);
  const [testSessionDurationHours, setTestSessionDurationHours] = useState(2);
  const [testSessionConcurrent, setTestSessionConcurrent] = useState(2);
  const [testSessionMfa, setTestSessionMfa] = useState(true);
  const [testSessionTrusted, setTestSessionTrusted] = useState(true);
  const [sessionTestResult, setSessionTestResult] = useState<PolicyEvaluationResult | null>(null);

  const [testExportFormat, setTestExportFormat] = useState<PolicyExportFormat>('png');
  const [testExportEmail, setTestExportEmail] = useState('employee@company.com');
  const [testExportTags, setTestExportTags] = useState('internal, general');
  const [testExportPublic, setTestExportPublic] = useState(false);
  const [exportTestResult, setExportTestResult] = useState<PolicyEvaluationResult | null>(null);

  if (!isOpen) return null;

  const handleAddAllowedIp = () => {
    const trimmed = newAllowedIp.trim();
    if (!trimmed) return;
    if (!isValidIpOrCidr(trimmed)) {
      setIpValidationError(`'${trimmed}' is not a valid IPv4 address or CIDR notation (e.g. 192.168.1.0/24).`);
      return;
    }
    if (policies.ipRestriction.allowedRanges.includes(trimmed)) {
      setIpValidationError(`Range '${trimmed}' already exists in allowlist.`);
      return;
    }

    setPolicies((prev) => ({
      ...prev,
      ipRestriction: {
        ...prev.ipRestriction,
        allowedRanges: [...prev.ipRestriction.allowedRanges, trimmed],
      },
    }));
    setNewAllowedIp('');
    setIpValidationError(null);
  };

  const handleRemoveAllowedIp = (range: string) => {
    setPolicies((prev) => ({
      ...prev,
      ipRestriction: {
        ...prev.ipRestriction,
        allowedRanges: prev.ipRestriction.allowedRanges.filter((r) => r !== range),
      },
    }));
  };

  const handleToggleExportFormat = (fmt: PolicyExportFormat) => {
    setPolicies((prev) => {
      const current = prev.exportControl.allowedFormats;
      const next = current.includes(fmt)
        ? current.filter((f) => f !== fmt)
        : [...current, fmt];
      return {
        ...prev,
        exportControl: {
          ...prev.exportControl,
          allowedFormats: next.length > 0 ? next : current,
        },
      };
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(policies);
    }
    setSaveStatus('Organization policies saved and enforced successfully.');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleRunIpTest = () => {
    const res = evaluateIpRestriction(
      testIp,
      policies.ipRestriction,
      testUserRole,
      policies.enforcementMode,
    );
    setIpTestResult(res);
  };

  const handleRunSessionTest = () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - testSessionDurationHours * 60 * 60 * 1000).toISOString();
    const lastActivityAt = new Date(now.getTime() - testSessionIdleMinutes * 60 * 1000).toISOString();

    const res = evaluateSessionPolicy(
      {
        createdAt,
        lastActivityAt,
        activeSessionCount: testSessionConcurrent,
        mfaVerified: testSessionMfa,
        isTrustedDevice: testSessionTrusted,
      },
      policies.sessionManagement,
      policies.enforcementMode,
      now,
    );
    setSessionTestResult(res);
  };

  const handleRunExportTest = () => {
    const tags = testExportTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = evaluateExportControl(
      {
        format: testExportFormat,
        recipientEmail: testExportEmail.trim() || undefined,
        classificationTags: tags,
        isPublicShare: testExportPublic,
      },
      policies.exportControl,
      policies.enforcementMode,
    );
    setExportTestResult(res);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-policies-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 id="org-policies-title" className="text-xl font-bold text-white">
                Organization Governance & Security Policies
              </h2>
              <p className="text-xs text-slate-400">
                Configure IP restrictions, session lifetimes, automated retention, and data export boundaries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close organization policies modal"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Global Enforcement Mode Bar */}
        <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enforcement Mode:
            </span>
            <div className="flex space-x-2">
              {(['enforce', 'audit_only', 'disabled'] as PolicyEnforcementMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPolicies((prev) => ({ ...prev, enforcementMode: mode }))}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    policies.enforcementMode === mode
                      ? mode === 'enforce'
                        ? 'bg-emerald-600 text-white'
                        : mode === 'audit_only'
                        ? 'bg-amber-600 text-white'
                        : 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {mode === 'enforce'
                    ? 'Strict Enforcement (Block)'
                    : mode === 'audit_only'
                    ? 'Audit Only (Log Warnings)'
                    : 'Disabled'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Policy Version <span className="font-mono text-indigo-400">v{policies.version}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/30">
          {[
            { id: 'ip', label: 'IP Restrictions' },
            { id: 'session', label: 'Session Management' },
            { id: 'retention', label: 'Data Retention' },
            { id: 'export', label: 'Export Controls' },
            { id: 'simulator', label: 'Policy Enforcement Simulator' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {saveStatus && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-sm rounded-lg flex items-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1,1 0 00-1.414-1.414L9 10.586 7.707 9.293a1,1 0 00-1.414 1.414l2 2a1,1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{saveStatus}</span>
            </div>
          )}

          {/* TAB 1: IP Restrictions */}
          {activeTab === 'ip' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/60">
                <div>
                  <h3 className="font-semibold text-white">Enable IP Access Restrictions</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Restrict workspace and model access to designated corporate VPNs and office subnets.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.ipRestriction.enabled}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        ipRestriction: { ...prev.ipRestriction, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {policies.ipRestriction.enabled && (
                <>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Restriction Mode
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setPolicies((prev) => ({
                            ...prev,
                            ipRestriction: { ...prev.ipRestriction, mode: 'allowlist' },
                          }))
                        }
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          policies.ipRestriction.mode === 'allowlist'
                            ? 'border-indigo-500 bg-indigo-950/20 text-white'
                            : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-medium text-sm">Allowlist Only (Recommended)</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Only traffic originating from specified subnets is permitted.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPolicies((prev) => ({
                            ...prev,
                            ipRestriction: { ...prev.ipRestriction, mode: 'denylist' },
                          }))
                        }
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          policies.ipRestriction.mode === 'denylist'
                            ? 'border-indigo-500 bg-indigo-950/20 text-white'
                            : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-medium text-sm">Denylist</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Block specific malicious or compromised IP subnets.
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Add IP Range Form */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      {policies.ipRestriction.mode === 'allowlist'
                        ? 'Authorized CIDR Subnets & IPv4 Addresses'
                        : 'Blocked CIDR Subnets & IPv4 Addresses'}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.0/24 or 10.0.0.1"
                        value={newAllowedIp}
                        onChange={(e) => {
                          setNewAllowedIp(e.target.value);
                          setIpValidationError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAllowedIp();
                          }
                        }}
                        className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllowedIp}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Add Range
                      </button>
                    </div>
                    {ipValidationError && (
                      <p className="text-xs text-rose-400">{ipValidationError}</p>
                    )}

                    {/* Chips */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(policies.ipRestriction.mode === 'allowlist'
                        ? policies.ipRestriction.allowedRanges
                        : policies.ipRestriction.deniedRanges
                      ).map((range) => (
                        <span
                          key={range}
                          className="inline-flex items-center px-3 py-1 bg-slate-800 text-indigo-300 border border-slate-700 rounded-md text-xs font-mono"
                        >
                          {range}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllowedIp(range)}
                            className="ml-2 text-slate-400 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Session Management */}
          {activeTab === 'session' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/60">
                <div>
                  <h3 className="font-semibold text-white">Enable Session Lifecycle Policies</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enforce strict duration limits, idle timeouts, and device authentication checks.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.sessionManagement.enabled}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        sessionManagement: { ...prev.sessionManagement, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {policies.sessionManagement.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">
                      Maximum Session Lifetime (Minutes)
                    </label>
                    <input
                      type="number"
                      value={policies.sessionManagement.maxSessionDurationMinutes}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          sessionManagement: {
                            ...prev.sessionManagement,
                            maxSessionDurationMinutes: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <span className="text-[11px] text-slate-500">
                      {Math.round(policies.sessionManagement.maxSessionDurationMinutes / 60)} hours total session limit
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">
                      Inactivity Idle Timeout (Minutes)
                    </label>
                    <input
                      type="number"
                      value={policies.sessionManagement.idleTimeoutMinutes}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          sessionManagement: {
                            ...prev.sessionManagement,
                            idleTimeoutMinutes: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <span className="text-[11px] text-slate-500">
                      Forces re-authentication after {policies.sessionManagement.idleTimeoutMinutes}m idle
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">
                      Maximum Concurrent Sessions per User
                    </label>
                    <input
                      type="number"
                      value={policies.sessionManagement.maxConcurrentSessions}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          sessionManagement: {
                            ...prev.sessionManagement,
                            maxConcurrentSessions: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <span className="text-[11px] text-slate-500">
                      Prevents account sharing and unauthorized multi-login
                    </span>
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policies.sessionManagement.forceMfa}
                        onChange={(e) =>
                          setPolicies((prev) => ({
                            ...prev,
                            sessionManagement: {
                              ...prev.sessionManagement,
                              forceMfa: e.target.checked,
                            },
                          }))
                        }
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">Mandate Multi-Factor Authentication</div>
                        <div className="text-xs text-slate-400">Requires FIDO2 / WebAuthn or TOTP</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policies.sessionManagement.enforceDeviceTrust}
                        onChange={(e) =>
                          setPolicies((prev) => ({
                            ...prev,
                            sessionManagement: {
                              ...prev.sessionManagement,
                              enforceDeviceTrust: e.target.checked,
                            },
                          }))
                        }
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">Enforce Corporate Device Trust</div>
                        <div className="text-xs text-slate-400">Verifies MDM certificate registration</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Data Retention */}
          {activeTab === 'retention' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/60">
                <div>
                  <h3 className="font-semibold text-white">Automated Data Retention & Lifecycle</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Comply with GDPR, SOC2, and corporate retention rules by automatically pruning expired records.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.dataRetention.enabled}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        dataRetention: { ...prev.dataRetention, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {policies.dataRetention.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Trash Purge Period (Days)
                    </label>
                    <input
                      type="number"
                      value={policies.dataRetention.softDeletedRetentionDays}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          dataRetention: {
                            ...prev.dataRetention,
                            softDeletedRetentionDays: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      Items soft-deleted before{' '}
                      <span className="font-mono text-indigo-400">
                        {calculateRetentionCutoffDate(policies.dataRetention.softDeletedRetentionDays).slice(0, 10)}
                      </span>{' '}
                      will be permanently expunged.
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Version History Retention (Days)
                    </label>
                    <input
                      type="number"
                      value={policies.dataRetention.versionHistoryRetentionDays}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          dataRetention: {
                            ...prev.dataRetention,
                            versionHistoryRetentionDays: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      Snapshots older than {policies.dataRetention.versionHistoryRetentionDays} days pruned.
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Audit Log Retention (Days)
                    </label>
                    <input
                      type="number"
                      value={policies.dataRetention.auditLogRetentionDays}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          dataRetention: {
                            ...prev.dataRetention,
                            auditLogRetentionDays: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      Immutable trail retained for {policies.dataRetention.auditLogRetentionDays} days.
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Inactive Workspace Archive (Days)
                    </label>
                    <input
                      type="number"
                      value={policies.dataRetention.inactiveWorkspaceArchiveDays}
                      onChange={(e) =>
                        setPolicies((prev) => ({
                          ...prev,
                          dataRetention: {
                            ...prev.dataRetention,
                            inactiveWorkspaceArchiveDays: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      Unused workspaces archived after {policies.dataRetention.inactiveWorkspaceArchiveDays} days.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Export Controls */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/60">
                <div>
                  <h3 className="font-semibold text-white">Enable Export Controls</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Govern allowed export file formats, enforce security watermarks, and prevent sensitive data leakage.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.exportControl.enabled}
                    onChange={(e) =>
                      setPolicies((prev) => ({
                        ...prev,
                        exportControl: { ...prev.exportControl, enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {policies.exportControl.enabled && (
                <div className="space-y-6">
                  {/* Allowed Formats */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300 block">
                      Permitted Export Formats
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(['png', 'svg', 'pdf', 'json', 'csv', 'markdown'] as PolicyExportFormat[]).map((fmt) => {
                        const isSelected = policies.exportControl.allowedFormats.includes(fmt);
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => handleToggleExportFormat(fmt)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Watermark Section */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/60 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-white">Require Security Watermark</div>
                        <div className="text-xs text-slate-400">
                          Applies classification header & watermark to PNG, SVG, and PDF exports
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={policies.exportControl.requireWatermark}
                        onChange={(e) =>
                          setPolicies((prev) => ({
                            ...prev,
                            exportControl: { ...prev.exportControl, requireWatermark: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>

                    {policies.exportControl.requireWatermark && (
                      <input
                        type="text"
                        value={policies.exportControl.watermarkText}
                        onChange={(e) =>
                          setPolicies((prev) => ({
                            ...prev,
                            exportControl: { ...prev.exportControl, watermarkText: e.target.value },
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        placeholder="e.g. CONFIDENTIAL - INTERNAL USE ONLY"
                      />
                    )}
                  </div>

                  {/* Sensitive Classification Block */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Block Sensitive Data Exports</div>
                      <div className="text-xs text-slate-400">
                        Prohibits downloading models containing classified tags (pci, phi, secret, confidential)
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policies.exportControl.blockSensitiveDataExport}
                        onChange={(e) =>
                          setPolicies((prev) => ({
                            ...prev,
                            exportControl: {
                              ...prev.exportControl,
                              blockSensitiveDataExport: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Live Enforcement Simulator */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-lg">
                <h4 className="text-sm font-semibold text-indigo-300">Live Policy Simulator</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Validate how current policy definitions would evaluate simulated client traffic and export requests.
                </p>
              </div>

              {/* IP Simulator */}
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Test IP Restriction</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={testIp}
                    onChange={(e) => setTestIp(e.target.value)}
                    placeholder="Enter IP address"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <select
                    value={testUserRole}
                    onChange={(e) => setTestUserRole(e.target.value as MemberRole)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="owner">Role: Owner</option>
                    <option value="admin">Role: Admin</option>
                    <option value="editor">Role: Editor</option>
                    <option value="viewer">Role: Viewer</option>
                    <option value="guest">Role: Guest</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleRunIpTest}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    Evaluate IP
                  </button>
                </div>
                {ipTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono border ${
                      ipTestResult.allowed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div>
                      <strong>Status:</strong> {ipTestResult.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </div>
                    <div>
                      <strong>Reason:</strong> {ipTestResult.reason}
                    </div>
                    {ipTestResult.ruleViolation && (
                      <div>
                        <strong>Violation Code:</strong> {ipTestResult.ruleViolation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Session Simulator */}
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Test Session Policy</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400">Idle Mins:</span>
                    <input
                      type="number"
                      value={testSessionIdleMinutes}
                      onChange={(e) => setTestSessionIdleMinutes(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Age Hours:</span>
                    <input
                      type="number"
                      value={testSessionDurationHours}
                      onChange={(e) => setTestSessionDurationHours(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Concurrent:</span>
                    <input
                      type="number"
                      value={testSessionConcurrent}
                      onChange={(e) => setTestSessionConcurrent(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={testSessionMfa}
                      onChange={(e) => setTestSessionMfa(e.target.checked)}
                      className="rounded"
                    />
                    <span>MFA Verified</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={testSessionTrusted}
                      onChange={(e) => setTestSessionTrusted(e.target.checked)}
                      className="rounded"
                    />
                    <span>Device Trusted</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRunSessionTest}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded transition-colors"
                  >
                    Evaluate Session
                  </button>
                </div>
                {sessionTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono border ${
                      sessionTestResult.allowed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div>
                      <strong>Status:</strong> {sessionTestResult.allowed ? 'VALID' : 'TERMINATED'}
                    </div>
                    <div>
                      <strong>Reason:</strong> {sessionTestResult.reason}
                    </div>
                    {sessionTestResult.ruleViolation && (
                      <div>
                        <strong>Violation:</strong> {sessionTestResult.ruleViolation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Export Simulator */}
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Test Export Control</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={testExportFormat}
                    onChange={(e) => setTestExportFormat(e.target.value as PolicyExportFormat)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="png">Format: PNG</option>
                    <option value="svg">Format: SVG</option>
                    <option value="pdf">Format: PDF</option>
                    <option value="json">Format: JSON</option>
                    <option value="csv">Format: CSV</option>
                    <option value="markdown">Format: Markdown</option>
                  </select>
                  <input
                    type="text"
                    value={testExportEmail}
                    onChange={(e) => setTestExportEmail(e.target.value)}
                    placeholder="Recipient email"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    value={testExportTags}
                    onChange={(e) => setTestExportTags(e.target.value)}
                    placeholder="Tags (e.g. pci, confidential)"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={testExportPublic}
                      onChange={(e) => setTestExportPublic(e.target.checked)}
                      className="rounded"
                    />
                    <span>Simulate Public Share Link</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRunExportTest}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    Evaluate Export
                  </button>
                </div>
                {exportTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono border ${
                      exportTestResult.allowed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div>
                      <strong>Status:</strong> {exportTestResult.allowed ? 'PERMITTED' : 'DENIED'}
                    </div>
                    <div>
                      <strong>Reason:</strong> {exportTestResult.reason}
                    </div>
                    {exportTestResult.watermarkRequired && (
                      <div className="text-amber-300">
                        <strong>Watermark Enforced:</strong> &quot;{exportTestResult.watermarkText}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={() => setPolicies(createDefaultOrganizationPolicies(orgId as OrgId))}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Reset to Corporate Defaults
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              Save Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
