'use client';

import React, { useState } from 'react';
import type {
  GeneratedArchitectureProposal,
} from '@diagramhq/domain';

export interface GenerationProposalCardProps {
  proposal: GeneratedArchitectureProposal;
  onApply?: () => void;
  onReject?: () => void;
}

export function GenerationProposalCard({
  proposal,
  onApply,
  onReject,
}: GenerationProposalCardProps) {
  const statusStyles: Record<string, string> = {
    proposed: 'bg-amber-950 text-amber-300 border-amber-800',
    applied: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    rejected: 'bg-rose-950 text-rose-300 border-rose-800',
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
            AI Generated Proposal
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">{proposal.title}</h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
            statusStyles[proposal.status] || statusStyles.proposed
          }`}
        >
          {proposal.status}
        </span>
      </div>

      <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
        {proposal.rationale}
      </p>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-2 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
          {`${proposal.summary.objectsCount} Objects`}
        </span>
        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300">
          {`${proposal.summary.connectionsCount} Connections`}
        </span>
        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-purple-300">
          {`${proposal.summary.flowsCount} Flows`}
        </span>
        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-300">
          {`${proposal.summary.docsCount} Docs`}
        </span>
      </div>

      {/* Actions */}
      {proposal.status === 'proposed' && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            >
              Reject Proposal
            </button>
          )}
          {onApply && (
            <button
              type="button"
              data-testid="ai-generation-apply-btn"
              onClick={onApply}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Apply to Architecture
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal?: GeneratedArchitectureProposal | null;
  onGenerate: (prompt: string) => void;
  onApplyProposal?: (proposal: GeneratedArchitectureProposal) => void;
  onRejectProposal?: (proposal: GeneratedArchitectureProposal) => void;
}

export function AIGenerationModal({
  isOpen,
  onClose,
  proposal,
  onGenerate,
  onApplyProposal,
  onRejectProposal,
}: AIGenerationModalProps) {
  const [promptInput, setPromptInput] = useState('');
  const [activeTab, setActiveTab] = useState<'components' | 'connections' | 'flow' | 'docs'>('components');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    onGenerate(promptInput.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI Architecture Generation Dialog"
    >
      <div
        data-testid="ai-generation-modal"
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-2xl">
              auto_awesome
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                AI Architecture Generation
              </h2>
              <p className="text-xs text-slate-400">
                Natural-language prompt to complete C4 architecture proposal
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="ai-generation-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Generation Dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Input prompt form */}
        <form onSubmit={handleSubmit} className="p-6 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Describe the system you want to generate:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              data-testid="ai-generation-input"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g., E-commerce platform with storefront gateway, order processing, Stripe payments, and Postgres DB"
              className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              data-testid="ai-generation-submit-btn"
              disabled={!promptInput.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Generate
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Quick prompts:</span>
            <button
              type="button"
              onClick={() => setPromptInput('Event-driven payment processing pipeline with Kafka and Redis')}
              className="text-cyan-400 hover:underline"
            >
              Event-driven pipeline
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setPromptInput('Multi-tenant SaaS with API gateway, auth service, and partitioned database')}
              className="text-cyan-400 hover:underline"
            >
              Multi-tenant SaaS
            </button>
          </div>
        </form>

        {/* Proposal preview */}
        {proposal ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Proposal summary bar */}
            <div className="p-6 pb-3">
              <GenerationProposalCard
                proposal={proposal}
                onApply={() => onApplyProposal?.(proposal)}
                onReject={() => onRejectProposal?.(proposal)}
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/50 gap-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === 'components'
                    ? 'border-cyan-400 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {`Components (${proposal.generatedObjects.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('connections')}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === 'connections'
                    ? 'border-cyan-400 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {`Connections (${proposal.generatedConnections.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('flow')}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === 'flow'
                    ? 'border-cyan-400 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {`Flows (${proposal.generatedFlows.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === 'docs'
                    ? 'border-cyan-400 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {`Docs (${proposal.generatedDocs.length})`}
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              {activeTab === 'components' && (
                <div className="grid grid-cols-2 gap-3">
                  {proposal.generatedObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{obj.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-800">
                          {obj.kind}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {obj.description}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID: {obj.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-2">
                  {proposal.generatedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">{conn.label}</div>
                        <div className="text-slate-400 text-[11px]">{conn.description}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950 text-amber-300 border border-amber-800">
                        {conn.kind}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'flow' && (
                <div className="space-y-3">
                  {proposal.generatedFlows.map((flow) => (
                    <div key={flow.id} className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                      <div>
                        <h4 className="font-bold text-white text-xs">{flow.name}</h4>
                        <p className="text-slate-400 text-[11px]">{flow.description}</p>
                      </div>
                      <div className="space-y-1.5 pl-2 border-l-2 border-cyan-800">
                        {flow.steps.map((st) => (
                          <div key={st.id} className="text-xs text-slate-300">
                            {st.note || `Step ${st.stepIndex}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-3">
                  {proposal.generatedDocs.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                      <h4 className="font-bold text-white text-xs">{doc.title}</h4>
                      <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded border border-slate-800">
                        {doc.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
              magic_button
            </span>
            <p className="text-sm font-medium">Ready to generate architecture</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Type requirements in the prompt box above to generate complete C4 components, flows, and docs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
