'use client';

import React, { useState } from 'react';
import type {
  DraftedADR,
  AcceptADRModifications,
} from '@diagramhq/domain';

export interface DraftedADRCardProps {
  draft: DraftedADR;
  onOpen: () => void;
  onDiscard?: () => void;
}

export function DraftedADRCard({ draft, onOpen, onDiscard }: DraftedADRCardProps) {
  return (
    <div className="p-4 rounded-xl border border-amber-900/60 bg-slate-950 text-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            AI-Drafted Decision Proposal
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">{draft.title}</h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/80 border border-amber-800 text-amber-300">
          {draft.status}
        </span>
      </div>

      <p className="text-slate-400 line-clamp-2 leading-relaxed">
        {draft.context}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-850">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <span className="material-symbols-outlined text-xs text-indigo-400">link</span>
          <span>Linked Change: {draft.changeId}</span>
        </div>
        <div className="flex items-center gap-2">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs transition-colors"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">edit_document</span>
            Review &amp; Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ADRGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft?: DraftedADR | null;
  onAccept: (modifications?: AcceptADRModifications) => void;
  onDiscard?: () => void;
}

export function ADRGenerationModal({
  isOpen,
  onClose,
  draft,
  onAccept,
  onDiscard,
}: ADRGenerationModalProps) {
  const [editedTitle, setEditedTitle] = useState(draft?.title || '');
  const [editedContext, setEditedContext] = useState(draft?.context || '');
  const [editedDecision, setEditedDecision] = useState(draft?.decision || '');
  const [editedConsequences, setEditedConsequences] = useState(draft?.consequences || '');

  // Keep state synced with draft changes
  React.useEffect(() => {
    if (draft) {
      setEditedTitle(draft.title);
      setEditedContext(draft.context);
      setEditedDecision(draft.decision);
      setEditedConsequences(draft.consequences);
    }
  }, [draft]);

  if (!isOpen || !draft) return null;

  const handleSaveAndAccept = () => {
    onAccept({
      title: editedTitle,
      context: editedContext,
      decision: editedDecision,
      consequences: editedConsequences,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ADR Draft Review Dialog"
    >
      <div
        data-testid="ai-adr-modal"
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-2xl">
              history_edu
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Review AI-Drafted ADR
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/80 border border-amber-800 text-amber-300">
                  Proposal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Human-in-the-loop: edit and accept decision record linked to change set
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="ai-adr-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close ADR Draft Dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Change Link Bar */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Linked Change Set:</span>
            <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {draft.changeId}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            ✓ Polymorphic Traceability Invariant Enforced
          </span>
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="adr-title" className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              ADR Title
            </label>
            <input
              id="adr-title"
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Context */}
          <div className="space-y-1.5">
            <label htmlFor="adr-context" className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Context &amp; Problem Statement
            </label>
            <textarea
              id="adr-context"
              rows={3}
              value={editedContext}
              onChange={(e) => setEditedContext(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Decision */}
          <div className="space-y-1.5">
            <label htmlFor="adr-decision" className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Architectural Decision
            </label>
            <textarea
              id="adr-decision"
              rows={3}
              value={editedDecision}
              onChange={(e) => setEditedDecision(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Consequences */}
          <div className="space-y-1.5">
            <label htmlFor="adr-consequences" className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Consequences &amp; Trade-offs
            </label>
            <textarea
              id="adr-consequences"
              rows={4}
              value={editedConsequences}
              onChange={(e) => setEditedConsequences(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs leading-relaxed font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Alternatives */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
              Alternatives Considered
            </span>
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              {draft.alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{alt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs transition-colors"
              >
                Discard Draft
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            data-testid="ai-adr-accept-btn"
            onClick={handleSaveAndAccept}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Accept &amp; Commit ADR
          </button>
        </div>
      </div>
    </div>
  );
}
