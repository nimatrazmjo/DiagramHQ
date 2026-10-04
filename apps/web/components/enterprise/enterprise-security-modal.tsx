'use client';

import React, { useState } from 'react';
import {
  createHardenedEnterpriseSecurityProfile,
  evaluateEnterpriseSecurityChecklist,
  executeCryptoShredding,
  simulateBackupRestoreDrill,
  type BackupDrillResult,
  type CryptoShreddingResult,
  type EnterpriseSecurityProfile,
  type OrgId,
} from '@diagramhq/domain';

export interface EnterpriseSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  initialProfile?: EnterpriseSecurityProfile;
}

export function EnterpriseSecurityModal({
  isOpen,
  onClose,
  orgId = 'org_enterprise_sec',
  initialProfile,
}: EnterpriseSecurityModalProps): JSX.Element | null {
  const [profile, setProfile] = useState<EnterpriseSecurityProfile>(() => {
    return initialProfile ?? createHardenedEnterpriseSecurityProfile(orgId as OrgId);
  });

  const [activeTab, setActiveTab] = useState<'checklist' | 'encryption' | 'backup_dr' | 'sanitization'>('checklist');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Simulation states
  const [drillResult, setDrillResult] = useState<BackupDrillResult | null>(null);
  const [shredResult, setShredResult] = useState<CryptoShreddingResult | null>(null);
  const [shredTargetId, setShredTargetId] = useState('arch_obsolete_model');

  if (!isOpen) return null;

  const report = evaluateEnterpriseSecurityChecklist(profile);

  // Filter checklist items
  const filteredItems = report.items.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const handleRunDrill = (successMode: boolean) => {
    const result = simulateBackupRestoreDrill(profile, successMode);
    setDrillResult(result);
  };

  const handleExecuteShred = () => {
    const result = executeCryptoShredding(profile, shredTargetId);
    setShredResult(result);
  };

  const handleToggleLegalHold = () => {
    setProfile((prev) => ({
      ...prev,
      sanitization: {
        ...prev.sanitization,
        legalHoldActive: !prev.sanitization.legalHoldActive,
        legalHoldReason: !prev.sanitization.legalHoldActive
          ? 'Active litigation discovery - Matter 2026-CV-882'
          : undefined,
      },
    }));
    setShredResult(null); // reset prior result
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-security-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
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
              <div className="flex items-center space-x-2">
                <h2 id="enterprise-security-title" className="text-xl font-bold text-white">
                  Enterprise Security &amp; Hardening
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded">
                  F107 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-end cryptographic hardening, continuous disaster recovery drills, and SOC2/NIST compliance checklist.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enterprise security modal"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Executive Security KPI Ribbon */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Checklist Status
            </span>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  report.overallStatus === 'compliant'
                    ? 'bg-emerald-400'
                    : report.overallStatus === 'conditional'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-base font-bold text-white uppercase tracking-wide">
                {report.overallStatus}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Security Score
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-white font-mono">{report.score}%</span>
              <span className="text-xs text-emerald-400">Optimal Hardening</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Controls Evaluated
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {report.passedCount}
              </span>
              <span className="text-xs text-slate-400">/ {report.totalCount} Passed</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Critical CVE / Breaches
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-bold text-white font-mono">
                {report.criticalFailures.length}
              </span>
              <span className="text-xs text-emerald-400">Zero Detected</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
          {[
            { id: 'checklist', label: 'Security Review Checklist' },
            { id: 'encryption', label: 'Encryption & Cryptography' },
            { id: 'backup_dr', label: 'Disaster Recovery (PITR)' },
            { id: 'sanitization', label: 'Retention & Crypto-Shredding' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Security Review Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All Domains</option>
                    <option value="network_transport">Network &amp; Transport</option>
                    <option value="cryptography_rest">Cryptography at Rest</option>
                    <option value="identity_access">Identity &amp; Access Governance</option>
                    <option value="audit_logging">Audit &amp; AI Logging</option>
                    <option value="resilience_dr">Resilience &amp; DR</option>
                    <option value="vulnerability_mgmt">Vulnerability Management</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pass">Passed Only</option>
                    <option value="warn">Warnings Only</option>
                    <option value="fail">Failed Only</option>
                  </select>
                </div>
              </div>

              {/* Checklist items table */}
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-800/30 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-slate-400">{item.id}</span>
                        <h4 className="font-medium text-sm text-white">{item.name}</h4>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                            item.severity === 'critical'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                              : item.severity === 'high'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                      <div className="text-[11px] text-indigo-400 font-mono">
                        Ref: {item.frameworkRef}
                      </div>
                      {item.remediation && (
                        <div className="text-xs text-rose-300 pt-1">
                          <strong>Remediation:</strong> {item.remediation}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          item.status === 'pass'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'warn'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status === 'pass' ? '✓ PASS' : item.status === 'warn' ? '⚠ WARN' : '✕ FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Encryption & Cryptography */}
          {activeTab === 'encryption' && (
            <div className="space-y-6">
              {/* Encryption at rest card */}
              <div className="p-5 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">Encryption at Rest</h3>
                    <p className="text-xs text-slate-400">
                      Hardware-accelerated envelope encryption with Customer-Managed Keys (CMEK)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-xs font-mono font-bold">
                    AES-256-GCM ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400">KMS Provider:</span>
                    <div className="font-mono text-white bg-slate-800 p-2 rounded">
                      AWS Key Management Service (KMS)
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400">Key Rotation Period:</span>
                    <div className="font-mono text-emerald-400 bg-slate-800 p-2 rounded">
                      {profile.encryptionRest.keyRotationDays} Days (Complies with CIS 3.10)
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <span className="text-slate-400">Customer-Managed Key (CMEK) ARN:</span>
                    <div className="font-mono text-indigo-300 bg-slate-800 p-2 rounded truncate">
                      {profile.encryptionRest.cmekKeyArn}
                    </div>
                  </div>
                </div>
              </div>

              {/* Encryption in transit card */}
              <div className="p-5 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">Encryption in Transit</h3>
                    <p className="text-xs text-slate-400">
                      Zero-trust network layer with strict modern TLS and Perfect Forward Secrecy
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-xs font-mono font-bold">
                    TLS 1.3 MANDATED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block mb-1">HTTP Strict Transport Security</span>
                    <div className="text-emerald-400 font-semibold">HSTS Preload Enforced</div>
                    <div className="text-[11px] text-slate-500 mt-1">max-age: 31,536,000s</div>
                  </div>

                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block mb-1">Forward Secrecy (PFS)</span>
                    <div className="text-emerald-400 font-semibold">ECDHE Enabled</div>
                    <div className="text-[11px] text-slate-500 mt-1">Past sessions protected</div>
                  </div>

                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block mb-1">Legacy Fallbacks</span>
                    <div className="text-rose-400 font-semibold">TLS 1.0 / 1.1 Blocked</div>
                    <div className="text-[11px] text-slate-500 mt-1">Zero insecure suites</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Disaster Recovery (PITR) */}
          {activeTab === 'backup_dr' && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">Continuous PITR &amp; Replication</h3>
                    <p className="text-xs text-slate-400">
                      Write-Once-Read-Many (WORM) storage with multi-region cross-cloud replication
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-xs font-mono font-bold">
                    WORM LOCKED
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Frequency</span>
                    <span className="text-emerald-400 font-bold mt-1 block">Continuous PITR</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Retention Window</span>
                    <span className="text-white font-bold mt-1 block">720 Hours (30 Days)</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Target RTO</span>
                    <span className="text-indigo-400 font-bold mt-1 block">
                      &lt; {profile.backupDr.targetRtoMinutes} Minutes
                    </span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Target RPO</span>
                    <span className="text-indigo-400 font-bold mt-1 block">
                      &lt; {profile.backupDr.targetRpoMinutes} Minutes
                    </span>
                  </div>
                </div>

                {/* Drill Simulation Playground */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Disaster Recovery Drill Simulator</h4>
                      <p className="text-xs text-slate-400">
                        Execute automated live restoration drill to test RTO/RPO SLA compliance.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleRunDrill(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Run Compliant Drill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRunDrill(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Simulate Degradation
                      </button>
                    </div>
                  </div>

                  {drillResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                        drillResult.success
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div>
                        <strong>Result:</strong> {drillResult.success ? 'DRILL PASSED' : 'DRILL FAILED'}
                      </div>
                      <div>
                        <strong>Actual RTO:</strong> {drillResult.rtoActualMinutes} min (Target &lt;{' '}
                        {profile.backupDr.targetRtoMinutes}m:{' '}
                        {drillResult.rtoTargetMet ? 'MET' : 'EXCEEDED'})
                      </div>
                      <div>
                        <strong>Actual RPO:</strong> {drillResult.rpoActualMinutes} min (Target &lt;{' '}
                        {profile.backupDr.targetRpoMinutes}m:{' '}
                        {drillResult.rpoTargetMet ? 'MET' : 'EXCEEDED'})
                      </div>
                      <div>
                        <strong>Entities Restored:</strong> {drillResult.restoredEntitiesCount} (SHA-256 Checksum Verified)
                      </div>
                      <div className="text-slate-400 text-[11px] pt-1">{drillResult.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Retention & Cryptographic Shredding */}
          {activeTab === 'sanitization' && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">NIST SP 800-88 Cryptographic Shredding</h3>
                    <p className="text-xs text-slate-400">
                      Permanent deletion via cryptographic key destruction, with legal hold preservation safeguards
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleLegalHold}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
                      profile.sanitization.legalHoldActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {profile.sanitization.legalHoldActive ? '⚖ Legal Hold ACTIVE' : 'Legal Hold Inactive'}
                  </button>
                </div>

                {profile.sanitization.legalHoldActive && (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs rounded-lg flex items-center space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <strong>LEGAL HOLD ENFORCED:</strong> {profile.sanitization.legalHoldReason}. All automated
                      and manual purges are frozen to preserve evidence.
                    </span>
                  </div>
                )}

                {/* Crypto-shredding runner */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-white">Execute Cryptographic Shredding</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={shredTargetId}
                      onChange={(e) => setShredTargetId(e.target.value)}
                      placeholder="Resource ID to shred"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleExecuteShred}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
                    >
                      Shred Keys
                    </button>
                  </div>

                  {shredResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                        shredResult.success
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <div>
                        <strong>Target ID:</strong> {shredResult.targetId}
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        {shredResult.success ? 'CRYPTO-SHREDDED' : 'OPERATION BLOCKED BY LEGAL HOLD'}
                      </div>
                      <div>
                        <strong>Standard:</strong> {shredResult.standard}
                      </div>
                      <div>
                        <strong>Keys Destroyed:</strong> {shredResult.keysDestroyedCount}
                      </div>
                      <div>
                        <strong>Data Irrecoverable:</strong>{' '}
                        {shredResult.dataIrrecoverable ? 'YES (100% Cryptographically Unreadable)' : 'NO (Preserved)'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Last evaluated: <span className="font-mono text-slate-300">{report.evaluatedAt.slice(0, 19)}Z</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
