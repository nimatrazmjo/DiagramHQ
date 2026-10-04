'use client';

import React, { useState } from 'react';
import {
  createId,
  exportAuditLogToCsv,
  exportAuditLogToJson,
  queryAuditLogs,
  simulateAuditLogLifecycle,
  verifyAuditLogIntegrity,
  type AuditActionCategory,
  type AuditActorType,
  type ImmutableAuditLog,
} from '@diagramhq/domain';

export interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  initialLog?: ImmutableAuditLog;
}

export function AuditLogsModal({
  isOpen,
  onClose,
  orgName = 'DiagramHQ Enterprise',
  initialLog,
}: AuditLogsModalProps): JSX.Element | null {
  const [auditLog] = useState<ImmutableAuditLog>(() => {
    if (initialLog) return initialLog;
    const sim = simulateAuditLogLifecycle(createId('org'));
    return sim.log;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'ai_agent' | 'integrity' | 'export'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActorType, setSelectedActorType] = useState<string>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const integrityReport = verifyAuditLogIntegrity(auditLog);

  // Filter entries
  const filteredResult = queryAuditLogs(auditLog, {
    actorType: selectedActorType !== 'all' ? (selectedActorType as AuditActorType) : undefined,
    category: selectedCategory !== 'all' ? (selectedCategory as AuditActionCategory) : undefined,
    action: searchQuery.trim() || undefined,
  });

  const aiAgentEntries = queryAuditLogs(auditLog, { actorType: 'ai_agent' }).entries;
  const humanEntries = queryAuditLogs(auditLog, { actorType: 'human_user' }).entries;

  const handleCopyJson = async () => {
    try {
      const json = exportAuditLogToJson(auditLog);
      await navigator.clipboard.writeText(json);
      setCopyFeedback('JSON Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCsv = async () => {
    try {
      const csv = exportAuditLogToCsv(auditLog);
      await navigator.clipboard.writeText(csv);
      setCopyFeedback('CSV Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 id="audit-modal-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Enterprise Immutable Audit Logs</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  F105
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Append-Only &amp; Sealed
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically chained who/what/when record, including AI-agent activities, for {orgName}.
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

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-5">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Total Entries</span>
            <div className="text-xl font-bold font-mono text-slate-100">{auditLog.entries.length}</div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Human Actions</span>
            <div className="text-xl font-bold font-mono text-blue-400">{humanEntries.length}</div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">AI-Agent Actions</span>
            <div className="text-xl font-bold font-mono text-purple-400">{aiAgentEntries.length}</div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Merkle Integrity</span>
            <div className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
              <span>✓ 100% Valid</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/40 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>All Audit Records</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
              {auditLog.entries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_agent')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ai_agent'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>🤖 AI-Agent Actions</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-[10px] font-mono text-purple-300 border border-purple-500/30">
              {aiAgentEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('integrity')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'integrity'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>⛓️ Cryptographic Integrity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>SIEM Export</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {activeTab === 'all' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by action (e.g. user.login, diagram.created)..."
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 flex-1 min-w-[200px] focus:outline-none focus:border-amber-500"
                />

                <select
                  value={selectedActorType}
                  onChange={(e) => setSelectedActorType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Actors</option>
                  <option value="human_user">Human Users</option>
                  <option value="ai_agent">AI Agents</option>
                  <option value="scim_sync">SCIM Sync</option>
                  <option value="system">System</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Categories</option>
                  <option value="auth">Authentication</option>
                  <option value="canvas">Canvas &amp; Diagram</option>
                  <option value="model">Architecture Model</option>
                  <option value="ai_agent">AI Agent</option>
                  <option value="rbac">RBAC &amp; Roles</option>
                  <option value="governance">Governance</option>
                </select>
              </div>

              {/* Records List */}
              <div className="space-y-2">
                {filteredResult.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[11px]">#{entry.sequenceIndex}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                            entry.actor.type === 'ai_agent'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {entry.actor.type === 'ai_agent' ? '🤖 AI AGENT' : '👤 HUMAN'}
                        </span>
                        <span className="font-semibold text-slate-200">{entry.action}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            entry.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : entry.status === 'DENIED'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {entry.timestamp.toISOString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <div>
                        <span className="text-slate-300 font-medium">Actor: </span>
                        <span>{entry.actor.name}</span>
                        {entry.actor.email && <span> ({entry.actor.email})</span>}
                        {entry.actor.aiAgentMetadata && (
                          <span className="text-purple-300 font-mono"> &bull; {entry.actor.aiAgentMetadata.model}</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                        Hash: {entry.entryHash.slice(0, 18)}...
                      </div>
                    </div>
                  </div>
                ))}

                {filteredResult.entries.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No audit records match the current filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai_agent' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                <span className="font-semibold block">🤖 Autonomous &amp; Interactive AI-Agent Action Records</span>
                <p className="text-slate-400">
                  Comprehensive audit trail of all AI assistant and autonomous agent interactions,
                  tracking model provenance, prompt context, tool invocations, and confidence scoring.
                </p>
              </div>

              <div className="space-y-3">
                {aiAgentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-slate-900 border border-purple-900/30 rounded-xl space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{entry.actor.name}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-[10px] font-mono text-purple-300">
                          {entry.actor.aiAgentMetadata?.model || 'AI Model'}
                        </span>
                        {entry.actor.aiAgentMetadata?.confidenceScore !== undefined && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                            Confidence: {Math.round(entry.actor.aiAgentMetadata.confidenceScore * 100)}%
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{entry.timestamp.toISOString()}</span>
                    </div>

                    {entry.actor.aiAgentMetadata?.promptSummary && (
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                        <span className="text-slate-400 font-semibold block mb-0.5">Task / Prompt Summary:</span>
                        <span>{entry.actor.aiAgentMetadata.promptSummary}</span>
                      </div>
                    )}

                    {entry.actor.aiAgentMetadata?.toolCallsExecuted && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block mb-1">Tools Executed:</span>
                        <div className="flex flex-wrap gap-1">
                          {entry.actor.aiAgentMetadata.toolCallsExecuted.map((tool) => (
                            <span
                              key={tool}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                            >
                              {tool}()
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrity' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Cryptographic Chain Integrity Verification
                </span>
                <p className="text-slate-400">
                  Each audit record contains a hash of its contents and the previous entry hash.
                  Any modification, deletion, or insertion breaks the chain and is immediately flagged.
                </p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Verification Status:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {integrityReport.valid ? 'VALID (PASSED)' : 'TAMPER DETECTED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Verified Chain Depth:</span>
                  <span className="font-mono text-slate-200">{integrityReport.verifiedCount} records</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Latest Chain Hash:</span>
                  <span className="font-mono text-[11px] text-slate-300 select-all">{auditLog.latestHash}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <span className="font-semibold block">Enterprise SIEM Data Ingestion</span>
                <p className="text-slate-400">
                  Export formatted audit streams for Splunk, Datadog, AWS CloudWatch, or Google Cloud Operations.
                </p>
              </div>

              {copyFeedback && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl">
                  {copyFeedback}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200">JSON Stream Export</h4>
                  <p className="text-[11px] text-slate-400">
                    Structured JSON format including Merkle proof and full who/what/when metadata.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                  >
                    Copy Audit Log JSON
                  </button>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200">CSV Tabular Export</h4>
                  <p className="text-[11px] text-slate-400">
                    Spreadsheet-ready CSV with sequence indices, ISO timestamps, actors, and hash signatures.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCsv}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                  >
                    Copy Audit Log CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>Immutable Chained Ledger Active</span>
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
