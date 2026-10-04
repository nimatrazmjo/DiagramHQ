'use client';

import React, { useState } from 'react';
import {
  ALL_FINE_GRAINED_PERMISSIONS,
  auditRoleLeastPrivilege,
  createBuiltinEnterpriseRoles,
  createCustomRole,
  createId,
  testFineGrainedRoleDenial,
  type CustomRole,
  type FineGrainedEvaluationResult,
  type FineGrainedPermission,
  type MemberRole,
} from '@diagramhq/domain';

export interface AdvancedRbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  initialRoles?: CustomRole[];
}

export function AdvancedRbacModal({
  isOpen,
  onClose,
  orgName = 'DiagramHQ Enterprise',
  initialRoles,
}: AdvancedRbacModalProps): JSX.Element | null {
  const [roles, setRoles] = useState<CustomRole[]>(() =>
    initialRoles && initialRoles.length > 0
      ? initialRoles
      : createBuiltinEnterpriseRoles(createId('org'))
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'roles' | 'evaluate' | 'create' | 'audit'>('roles');

  // Evaluation state
  const [evalAction, setEvalAction] = useState<FineGrainedPermission>('model:edit_object');
  const [evalResult, setEvalResult] = useState<FineGrainedEvaluationResult | null>(null);

  // New role form state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleArchetype, setNewRoleArchetype] = useState<MemberRole>('viewer');
  const [selectedPerms, setSelectedPerms] = useState<Set<FineGrainedPermission>>(
    new Set(['architecture:view', 'docs:view'])
  );
  const [selectedDenials, setSelectedDenials] = useState<Set<FineGrainedPermission>>(
    new Set(['workspace:delete'])
  );
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const auditReport = currentRole ? auditRoleLeastPrivilege(currentRole) : null;

  const handleRunEvaluation = () => {
    if (!currentRole) return;
    const testResult = testFineGrainedRoleDenial(currentRole, evalAction);
    setEvalResult(testResult.evaluation);
  };

  const handleTogglePermission = (permId: FineGrainedPermission) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleToggleDenial = (permId: FineGrainedPermission) => {
    setSelectedDenials((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (!newRoleName.trim()) {
        setFormError('Role name is required');
        return;
      }
      const newRole = createCustomRole(createId('org'), {
        name: newRoleName,
        description: newRoleDesc,
        baseArchetype: newRoleArchetype,
        permissions: Array.from(selectedPerms),
        explicitDenials: Array.from(selectedDenials),
      });

      setRoles((prev) => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      setActiveTab('roles');
      setNewRoleName('');
      setNewRoleDesc('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create role');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rbac-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 id="rbac-modal-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Advanced Role-Based Access Control (Advanced RBAC)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  F104
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fine-grained permissions and least privilege enforcement for {orgName}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>Enterprise Roles</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
              {roles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluate')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'evaluate'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>🛡️ Least Privilege Evaluator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>Risk &amp; Compliance Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>+ Custom Role</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Role selector list */}
              <div className="space-y-2 border-r border-slate-800 pr-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Roles Catalog</h4>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      r.id === currentRole?.id
                        ? 'bg-purple-950/20 border-purple-500/50 text-purple-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-100">{r.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {r.permissions.length} perms
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{r.description}</p>
                  </button>
                ))}
              </div>

              {/* Role Details */}
              {currentRole && (
                <div className="md:col-span-2 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{currentRole.name}</span>
                        {currentRole.isSystemRole && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                            Built-in System Role
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{currentRole.description}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Archetype: {currentRole.baseArchetype}</span>
                  </div>

                  {/* Explicit Denials (Least Privilege) */}
                  {currentRole.explicitDenials.length > 0 && (
                    <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Explicit Denials (Least Privilege Boundaries):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentRole.explicitDenials.map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded bg-rose-900/30 border border-rose-500/40 text-[11px] font-mono text-rose-300"
                          >
                            ✗ {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Granted Permissions */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Granted Granular Permissions:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentRole.permissions.map((p) => {
                        const def = ALL_FINE_GRAINED_PERMISSIONS.find((item) => item.id === p);
                        return (
                          <div
                            key={p}
                            className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-start gap-2"
                          >
                            <span className="text-emerald-400 text-xs mt-0.5">✓</span>
                            <div className="min-w-0">
                              <span className="font-mono text-xs text-slate-200 block truncate">{p}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {def?.description || 'Granted action'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluate' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                <span className="font-semibold block">🛡️ Real-Time Fine-Grained Least Privilege Evaluator</span>
                <p className="text-slate-400">
                  Verifies that fine-grained roles strictly deny out-of-scope actions and enforce least privilege.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eval-role-select" className="text-xs font-semibold text-slate-300 block mb-1">
                    Select Subject Role:
                  </label>
                  <select
                    id="eval-role-select"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.permissions.length} perms granted)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="eval-action-select" className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Fine-Grained Action:
                  </label>
                  <select
                    id="eval-action-select"
                    value={evalAction}
                    onChange={(e) => setEvalAction(e.target.value as FineGrainedPermission)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {ALL_FINE_GRAINED_PERMISSIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.domain.toUpperCase()}] {p.id} &mdash; {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunEvaluation}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
                >
                  Evaluate Action Permission
                </button>
              </div>

              {evalResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                    evalResult.allowed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2">
                      <span className="text-sm">{evalResult.allowed ? '✓ ALLOWED' : '✗ DENIED'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-slate-900">
                        {evalResult.reasonCode}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Role: {evalResult.roleName} &bull; Action: {evalResult.action}
                    </span>
                  </div>
                  <p className="text-slate-300 pt-1">{evalResult.explanation}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && auditReport && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Least Privilege Risk Audit: {auditReport.roleName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Automated assessment against high-privilege operations</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Risk Assessment:</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                      auditReport.riskLevel === 'LOW'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : auditReport.riskLevel === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {auditReport.riskLevel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">High-Privilege Capabilities:</span>
                  <div className="text-xl font-bold font-mono text-slate-100">{auditReport.highPrivilegeCount}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {auditReport.highPrivilegePermissions.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300">
                        {p}
                      </span>
                    ))}
                    {auditReport.highPrivilegeCount === 0 && (
                      <span className="text-xs text-emerald-400">No high-privilege permissions assigned</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Least Privilege Violations:</span>
                  <div className="text-xl font-bold font-mono text-slate-100">
                    {auditReport.leastPrivilegeViolations.length}
                  </div>
                  {auditReport.leastPrivilegeViolations.length === 0 ? (
                    <span className="text-xs text-emerald-400">Compliant with principle of least privilege</span>
                  ) : (
                    <div className="space-y-1">
                      {auditReport.leastPrivilegeViolations.map((v) => (
                        <div key={v} className="text-xs text-rose-300 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {auditReport.recommendations.length > 0 && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-purple-300 block">Remediation Guidance:</span>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {auditReport.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateRole} className="space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="custom-role-name" className="text-xs font-semibold text-slate-300 block mb-1">
                    Role Name:
                  </label>
                  <input
                    id="custom-role-name"
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Data Governance Specialist"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="custom-role-archetype" className="text-xs font-semibold text-slate-300 block mb-1">
                    Base Archetype:
                  </label>
                  <select
                    id="custom-role-archetype"
                    value={newRoleArchetype}
                    onChange={(e) => setNewRoleArchetype(e.target.value as MemberRole)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="viewer">Viewer (Read Only base)</option>
                    <option value="editor">Editor (Authoring base)</option>
                    <option value="admin">Admin (Administrative base)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="custom-role-desc" className="text-xs font-semibold text-slate-300 block mb-1">
                  Description:
                </label>
                <input
                  id="custom-role-desc"
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Describes the scope of responsibility"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Assign Granular Permissions (Least Privilege):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {ALL_FINE_GRAINED_PERMISSIONS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPerms.has(p.id)}
                        onChange={() => handleTogglePermission(p.id)}
                        className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-0"
                      />
                      <span className="font-mono text-[11px] truncate">{p.id}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Explicit Denials (Overrides any grant):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {ALL_FINE_GRAINED_PERMISSIONS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDenials.has(p.id)}
                        onChange={() => handleToggleDenial(p.id)}
                        className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-0"
                      />
                      <span className="font-mono text-[11px] truncate">{p.id}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  Save Custom Role
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
            <span>Least Privilege Policy Engine Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
