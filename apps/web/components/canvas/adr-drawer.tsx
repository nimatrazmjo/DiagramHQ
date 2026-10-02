'use client';

import React, { useState } from 'react';
import type {
  ArchitectureDecisionRecord,
  ADRStatus,
  ADRAttachmentTargetType,
} from '@diagramhq/domain';

export interface ADRBadgeProps {
  adr: ArchitectureDecisionRecord;
  onClick?: () => void;
}

export function ADRBadge({ adr, onClick }: ADRBadgeProps) {
  const statusColors: Record<ADRStatus, string> = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    proposed: 'bg-amber-950 text-amber-300 border-amber-800',
    accepted: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    rejected: 'bg-rose-950 text-rose-300 border-rose-800',
    superseded: 'bg-purple-950 text-purple-300 border-purple-800',
    deprecated: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors shadow-sm text-xs"
      aria-label="ADR Details"
    >
      <span className="material-symbols-outlined text-sm text-amber-400">
        gavel
      </span>
      <span className="font-mono font-bold text-white">{`ADR-${String(adr.number).padStart(3, '0')}`}</span>
      <span className="font-medium truncate max-w-[160px]">{adr.title}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${
          statusColors[adr.status] || statusColors.proposed
        }`}
      >
        {adr.status}
      </span>
    </button>
  );
}

export interface ADRHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityName?: string;
  entityType?: ADRAttachmentTargetType;
  entityId?: string;
  adrs: ArchitectureDecisionRecord[];
  onStatusChange?: (adrId: string, status: ADRStatus) => void;
  onCreateADR?: (newADR: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives: string[];
  }) => void;
}

export function ADRHistoryDrawer({
  isOpen,
  onClose,
  entityName = 'Selected Architecture Entity',
  entityType = 'object',
  entityId,
  adrs,
  onStatusChange,
  onCreateADR,
}: ADRHistoryDrawerProps) {
  const [selectedAdrId, setSelectedAdrId] = useState<string | null>(
    adrs[0]?.id ?? null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [decision, setDecision] = useState('');
  const [consequences, setConsequences] = useState('');
  const [alternativesText, setAlternativesText] = useState('');

  if (!isOpen) return null;

  const activeAdr = adrs.find((a) => a.id === selectedAdrId) ?? adrs[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !context.trim() || !decision.trim()) return;

    const alternatives = alternativesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onCreateADR?.({
      title: title.trim(),
      context: context.trim(),
      decision: decision.trim(),
      consequences: consequences.trim(),
      alternatives,
    });

    setTitle('');
    setContext('');
    setDecision('');
    setConsequences('');
    setAlternativesText('');
    setShowCreateForm(false);
  };

  const statusStyles: Record<ADRStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
    proposed: { bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-800' },
    accepted: { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-800' },
    rejected: { bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-800' },
    superseded: { bg: 'bg-purple-950', text: 'text-purple-300', border: 'border-purple-800' },
    deprecated: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Architecture Decision Records Drawer"
    >
      <div className="w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-2xl">
              gavel
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Architecture Decisions (ADR)
              </h2>
              <p className="text-xs text-slate-400">
                Decision history for{' '}
                <span className="text-cyan-400 font-semibold">{entityName}</span>
                {entityId && <span className="font-mono text-slate-500 ml-1">{`(${entityId})`}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              {showCreateForm ? 'View Records' : '+ New ADR'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close ADR Drawer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {showCreateForm ? (
          <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Record New Architectural Decision
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., ADR-005: Adopt Redis for Session Caching"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Context & Problem Statement
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                placeholder="What is the architectural context and problem being addressed?"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Decision Outcome
              </label>
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                rows={3}
                placeholder="What decision is being made and why?"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Consequences
              </label>
              <textarea
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                rows={2}
                placeholder="Positive and negative trade-offs of this decision..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Alternatives Considered (one per line)
              </label>
              <textarea
                value={alternativesText}
                onChange={(e) => setAlternativesText(e.target.value)}
                rows={2}
                placeholder="Memcached&#10;Postgres in-memory table"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
              >
                Save Decision Record
              </button>
            </div>
          </form>
        ) : adrs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
              history_edu
            </span>
            <p className="text-sm font-medium">No decision records attached</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Architecture Decision Records track rationale, context, and consequences for this {entityType}.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
            >
              Create First ADR
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ADR Selector Tabs */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 overflow-x-auto bg-slate-950/50">
              {adrs.map((adr) => {
                const isSelected = activeAdr?.id === adr.id;
                return (
                  <button
                    key={adr.id}
                    type="button"
                    onClick={() => setSelectedAdrId(adr.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      isSelected
                        ? 'bg-amber-950 text-amber-200 border-amber-800'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {`ADR-${String(adr.number).padStart(3, '0')}`}
                  </button>
                );
              })}
            </div>

            {/* Active ADR View */}
            {activeAdr && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {`ADR-${String(activeAdr.number).padStart(3, '0')}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
                          statusStyles[activeAdr.status].bg
                        } ${statusStyles[activeAdr.status].text} ${
                          statusStyles[activeAdr.status].border
                        }`}
                      >
                        {activeAdr.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      {activeAdr.title}
                    </h3>
                    {activeAdr.author && (
                      <p className="text-xs text-slate-400 mt-1">
                        By {activeAdr.author.name}
                      </p>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {(['proposed', 'accepted', 'superseded', 'rejected'] as ADRStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onStatusChange?.(activeAdr.id, st)}
                        className={`px-2 py-1 text-[10px] rounded uppercase font-medium transition-colors ${
                          activeAdr.status === st
                            ? 'bg-amber-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                      Context
                    </h4>
                    <p className="text-slate-300">{activeAdr.context}</p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] mb-1">
                      Decision
                    </h4>
                    <p className="text-slate-200 font-medium">{activeAdr.decision}</p>
                  </div>

                  {activeAdr.consequences && (
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                      <h4 className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] mb-1">
                        Consequences & Trade-offs
                      </h4>
                      <p className="text-slate-300">{activeAdr.consequences}</p>
                    </div>
                  )}

                  {activeAdr.alternatives && activeAdr.alternatives.length > 0 && (
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                      <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                        Alternatives Considered
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        {activeAdr.alternatives.map((alt, idx) => (
                          <li key={idx}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
