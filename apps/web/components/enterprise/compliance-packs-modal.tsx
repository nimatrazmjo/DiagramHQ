'use client';

import React, { useState } from 'react';
import {
  attachEvidenceToControlMapping,
  BUILTIN_CONTROLS,
  createControlMapping,
  FRAMEWORK_CATALOG,
  summarizeCompliancePack,
  updateControlMappingStatus,
  type ComplianceEvidence,
  type ComplianceFrameworkId,
  type ControlAssessmentStatus,
  type ControlMapping,
  type ObjectId,
  type OrgId,
  type UserId,
} from '@diagramhq/domain';

export interface CompliancePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  initialFramework?: ComplianceFrameworkId;
  initialMappings?: ControlMapping[];
}

export function CompliancePacksModal({
  isOpen,
  onClose,
  orgId = 'org_fintech_compliance',
  initialFramework = 'soc2',
  initialMappings,
}: CompliancePacksModalProps): JSX.Element | null {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFrameworkId>(initialFramework);
  const [mappings, setMappings] = useState<ControlMapping[]>(() => {
    if (initialMappings && initialMappings.length > 0) return initialMappings;

    // Seed default sample mapping for active framework
    const sampleMapping = createControlMapping({
      orgId: orgId as OrgId,
      frameworkId: 'soc2',
      controlId: 'SOC2-CC6.1',
      mappedObjectIds: ['sys_auth_gateway' as ObjectId, 'app_sso_portal' as ObjectId],
      evidenceItems: [
        {
          id: 'ev_init_1',
          title: 'Immutable Chained Audit Log Specification',
          type: 'audit_log',
          uriOrRef: 'audit/merkle_chain_proof_2026',
          collectedAt: new Date().toISOString(),
        },
      ],
      owner: {
        userId: 'usr_ciso_1' as UserId,
        name: 'Eleanor Vance',
        email: 'eleanor@fintech.corp',
        role: 'Chief Compliance Officer',
      },
      notes: 'SSO and advanced RBAC enforce logical access controls.',
    });

    return [sampleMapping];
  });

  const [activeControlId, setActiveControlId] = useState<string | null>(null);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceRef, setNewEvidenceRef] = useState('');
  const [newObjectId, setNewObjectId] = useState('');

  if (!isOpen) return null;

  const frameworkMetadata = FRAMEWORK_CATALOG[selectedFramework];
  const summary = summarizeCompliancePack(mappings, selectedFramework);
  const frameworkControls = BUILTIN_CONTROLS.filter((c) => c.frameworkId === selectedFramework);

  const handleMapControl = (controlId: string) => {
    const existing = mappings.find((m) => m.controlId === controlId);
    if (existing) {
      setActiveControlId(controlId);
      return;
    }

    const newMapping = createControlMapping({
      orgId: orgId as OrgId,
      frameworkId: selectedFramework,
      controlId,
      mappedObjectIds: [],
      evidenceItems: [],
      owner: {
        userId: 'usr_ciso_1' as UserId,
        name: 'Eleanor Vance',
        email: 'eleanor@fintech.corp',
        role: 'Chief Compliance Officer',
      },
    });

    setMappings((prev) => [...prev, newMapping]);
    setActiveControlId(controlId);
  };

  const handleAttachEvidence = (controlId: string) => {
    if (!newEvidenceTitle.trim()) return;

    const evidence: ComplianceEvidence = {
      id: `ev_${Date.now().toString(36)}`,
      title: newEvidenceTitle.trim(),
      type: 'architecture_diagram',
      uriOrRef: newEvidenceRef.trim() || 'arch/primary_view',
      collectedAt: new Date().toISOString(),
    };

    setMappings((prev) =>
      prev.map((m) => (m.controlId === controlId ? attachEvidenceToControlMapping(m, evidence) : m)),
    );

    setNewEvidenceTitle('');
    setNewEvidenceRef('');
  };

  const handleAddMappedObject = (controlId: string) => {
    if (!newObjectId.trim()) return;

    setMappings((prev) =>
      prev.map((m) => {
        if (m.controlId !== controlId) return m;
        const exists = m.mappedObjectIds.includes(newObjectId.trim() as ObjectId);
        if (exists) return m;
        return {
          ...m,
          mappedObjectIds: [...m.mappedObjectIds, newObjectId.trim() as ObjectId],
          status: m.status === 'not_started' ? 'in_progress' : m.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    setNewObjectId('');
  };

  const handleUpdateStatus = (controlId: string, status: ControlAssessmentStatus) => {
    setMappings((prev) =>
      prev.map((m) => (m.controlId === controlId ? updateControlMappingStatus(m, status) : m)),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-packs-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="compliance-packs-title" className="text-xl font-bold text-white">
                  Compliance Packs &amp; Regulatory Frameworks
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950 border border-indigo-500/40 text-indigo-400 rounded">
                  F131 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Map architectural components and evidence to SOC2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST, and CIS controls.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compliance packs modal"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Framework Selector Tabs */}
        <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800 flex overflow-x-auto space-x-2">
          {(
            [
              'soc2',
              'iso27001',
              'gdpr',
              'hipaa',
              'pci_dss',
              'nist_sp_800_53',
              'cis_controls',
            ] as ComplianceFrameworkId[]
          ).map((fid) => {
            const fw = FRAMEWORK_CATALOG[fid];
            const isSelected = selectedFramework === fid;
            return (
              <button
                key={fid}
                type="button"
                onClick={() => setSelectedFramework(fid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {fw.name}
              </button>
            );
          })}
        </div>

        {/* Executive KPI Ribbon */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Framework Pack
            </span>
            <span className="text-sm font-bold text-white mt-1 block truncate">
              {frameworkMetadata.name}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Mapped Controls
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-xl font-bold text-indigo-400 font-mono">
                {summary.mappedControlsCount}
              </span>
              <span className="text-xs text-slate-400">/ {summary.totalControls} Controls</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Evidence Artifacts
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
              {`${summary.totalEvidenceCount} Linked`}
            </span>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Attestation Progress
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-xl font-bold text-white font-mono">
                {summary.attestationProgressPercent}%
              </span>
              <span className="text-xs text-slate-400">Attested</span>
            </div>
          </div>
        </div>

        {/* Governance Invariant: No False Compliance Disclaimer */}
        <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-500/30 flex items-center space-x-2 text-amber-300 text-xs">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">
            <strong>Auditor Integrity Guarantee:</strong> {summary.disclaimer}
          </span>
        </div>

        {/* Main Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-4">
            {frameworkControls.map((ctrl) => {
              const mapping = mappings.find((m) => m.controlId === ctrl.id);
              const isMapped = !!mapping;
              const isExpanded = activeControlId === ctrl.id;

              return (
                <div
                  key={ctrl.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isMapped
                      ? 'bg-slate-800/40 border-slate-700'
                      : 'bg-slate-800/20 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold rounded">
                          {ctrl.code}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{ctrl.title}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">({ctrl.domain})</span>
                      </div>
                      <p className="text-xs text-slate-300">{ctrl.description}</p>
                      <div className="text-[11px] text-slate-400 italic">
                        Guidance: {ctrl.guidance}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {mapping && (
                        <div className="flex items-center space-x-2">
                          <select
                            value={mapping.status}
                            onChange={(e) =>
                              handleUpdateStatus(ctrl.id, e.target.value as ControlAssessmentStatus)
                            }
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 uppercase tracking-wider border ${
                              mapping.status === 'attested'
                                ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                                : mapping.status === 'under_audit_review'
                                ? 'bg-purple-950 border-purple-500/40 text-purple-300'
                                : mapping.status === 'evidence_collected'
                                ? 'bg-amber-950 border-amber-500/40 text-amber-300'
                                : mapping.status === 'in_progress'
                                ? 'bg-blue-950 border-blue-500/40 text-blue-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="evidence_collected">Evidence Collected</option>
                            <option value="under_audit_review">Under Audit Review</option>
                            <option value="attested">Attested</option>
                          </select>
                        </div>
                      )}

                      {!isMapped ? (
                        <button
                          type="button"
                          onClick={() => handleMapControl(ctrl.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Map Control
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveControlId(isExpanded ? null : ctrl.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'View Mapping'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Mapping Details Drawer */}
                  {isMapped && isExpanded && mapping && (
                    <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-4">
                      {/* Control -> Objects -> Evidence -> Owner -> Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* 1. Mapped Objects */}
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                          <span className="font-semibold text-slate-300 block uppercase tracking-wider">
                            Mapped Architecture Objects ({mapping.mappedObjectIds.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {mapping.mappedObjectIds.length === 0 ? (
                              <span className="text-slate-500 italic">No architecture objects linked yet</span>
                            ) : (
                              mapping.mappedObjectIds.map((objId) => (
                                <span
                                  key={objId}
                                  className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[11px] text-indigo-300"
                                >
                                  {objId}
                                </span>
                              ))
                            )}
                          </div>
                          <div className="flex space-x-1.5 pt-1">
                            <input
                              type="text"
                              placeholder="e.g. app_payment_gateway"
                              value={newObjectId}
                              onChange={(e) => setNewObjectId(e.target.value)}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddMappedObject(ctrl.id)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs transition-colors"
                            >
                              Add Object
                            </button>
                          </div>
                        </div>

                        {/* 2. Control Owner */}
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                          <span className="font-semibold text-slate-300 block uppercase tracking-wider">
                            Control Owner
                          </span>
                          <div className="text-white font-medium">{mapping.owner.name}</div>
                          <div className="text-slate-400">{mapping.owner.email}</div>
                          <div className="text-indigo-400 font-mono text-[11px]">{mapping.owner.role}</div>
                        </div>
                      </div>

                      {/* 3. Evidence Artifacts */}
                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3 text-xs">
                        <span className="font-semibold text-slate-300 block uppercase tracking-wider">
                          Evidence Items ({mapping.evidenceItems.length})
                        </span>

                        <div className="space-y-1.5">
                          {mapping.evidenceItems.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-2.5 bg-slate-800/60 border border-slate-700 rounded flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-white">{ev.title}</div>
                                <div className="font-mono text-[11px] text-slate-400">
                                  Ref: {ev.uriOrRef} • Collected: {ev.collectedAt.slice(0, 10)}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-700 text-slate-300">
                                {ev.type.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Add Evidence Form */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
                          <input
                            type="text"
                            placeholder="Evidence title (e.g. Audit Log Proof)"
                            value={newEvidenceTitle}
                            onChange={(e) => setNewEvidenceTitle(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                          />
                          <input
                            type="text"
                            placeholder="URI / File ref"
                            value={newEvidenceRef}
                            onChange={(e) => setNewEvidenceRef(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleAttachEvidence(ctrl.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs transition-colors"
                          >
                            Attach Evidence
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Framework Standard:{' '}
            <span className="font-mono text-indigo-400">{frameworkMetadata.version}</span>
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
