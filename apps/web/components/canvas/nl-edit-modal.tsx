'use client';

import React, { useState } from 'react';
import type { NLEditProposal } from '@diagramhq/domain';

export interface NLEditProposalCardProps {
  proposal: NLEditProposal;
  onApply?: () => void;
  onReject?: () => void;
}

export function NLEditProposalCard({
  proposal,
  onApply,
  onReject,
}: NLEditProposalCardProps) {
  const statusColors: Record<string, string> = {
    proposed: 'bg-amber-950 text-amber-300 border-amber-800',
    applied: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    rejected: 'bg-rose-950 text-rose-300 border-rose-800',
  };

  const addedCount = proposal.changes.added.objects.length + proposal.changes.added.connections.length;
  const modifiedCount = proposal.changes.modified.objects.length + proposal.changes.modified.connections.length;
  const removedCount = proposal.changes.removed.objectIds.length + proposal.changes.removed.connectionIds.length;

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
            Proposed Model Modification
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">
            {`"${proposal.instruction}"`}
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
            statusColors[proposal.status] || statusColors.proposed
          }`}
        >
          {proposal.status}
        </span>
      </div>

      <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
        {proposal.rationale}
      </p>

      {/* Changes Summary Pills */}
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
          {`+${addedCount} Added`}
        </span>
        <span className="px-2 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300">
          {`~${modifiedCount} Modified`}
        </span>
        <span className="px-2 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-300">
          {`-${removedCount} Removed`}
        </span>
      </div>

      {/* Detailed entity changes */}
      <div className="space-y-2 pt-1 border-t border-slate-850 text-[11px]">
        {proposal.changes.added.objects.length > 0 && (
          <div className="text-emerald-400">
            <span className="font-semibold">+ Added Objects: </span>
            {proposal.changes.added.objects.map((o) => `${o.name} (${o.kind})`).join(', ')}
          </div>
        )}

        {proposal.changes.added.connections.length > 0 && (
          <div className="text-emerald-400">
            <span className="font-semibold">+ Added Connections: </span>
            {proposal.changes.added.connections.map((c) => `${c.label || c.id}`).join(', ')}
          </div>
        )}

        {proposal.changes.modified.objects.length > 0 && (
          <div className="text-amber-400">
            <span className="font-semibold">~ Modified Objects: </span>
            {proposal.changes.modified.objects.map((o) => `${o.name} (${o.id})`).join(', ')}
          </div>
        )}

        {(proposal.changes.removed.objectIds.length > 0 || proposal.changes.removed.connectionIds.length > 0) && (
          <div className="text-rose-400">
            <span className="font-semibold">- Removed Entities: </span>
            {[
              ...proposal.changes.removed.objectIds,
              ...proposal.changes.removed.connectionIds,
            ].join(', ')}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {proposal.status === 'proposed' && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-850">
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            >
              Reject Edit
            </button>
          )}
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Apply Edit to Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface NLEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal?: NLEditProposal | null;
  onProposeEdit: (instruction: string) => void;
  onApplyProposal?: (proposal: NLEditProposal) => void;
  onRejectProposal?: (proposal: NLEditProposal) => void;
}

export function NLEditModal({
  isOpen,
  onClose,
  proposal,
  onProposeEdit,
  onApplyProposal,
  onRejectProposal,
}: NLEditModalProps) {
  const [instructionInput, setInstructionInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionInput.trim()) return;
    onProposeEdit(instructionInput.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Natural Language Model Edit Dialog"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-2xl">
              edit_note
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                Natural-Language Model Editing
              </h2>
              <p className="text-xs text-slate-400">
                Type an edit instruction to review an explicit proposed change set
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Edit Dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            What architecture modification would you like to make?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={instructionInput}
              onChange={(e) => setInstructionInput(e.target.value)}
              placeholder="e.g. add Redis between Edge Gateway and Auth Service"
              className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!instructionInput.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              Propose Edit
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Examples:</span>
            <button
              type="button"
              onClick={() => setInstructionInput('add Redis between Edge Gateway and Database')}
              className="text-cyan-400 hover:underline"
            >
              add Redis between A and B
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setInstructionInput('remove Legacy Auth Proxy')}
              className="text-cyan-400 hover:underline"
            >
              remove Service
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setInstructionInput('rename Edge Gateway to Global API Gateway')}
              className="text-cyan-400 hover:underline"
            >
              rename Component
            </button>
          </div>
        </form>

        {/* Proposal Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {proposal ? (
            <NLEditProposalCard
              proposal={proposal}
              onApply={() => onApplyProposal?.(proposal)}
              onReject={() => onRejectProposal?.(proposal)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
                history_edu
              </span>
              <p className="text-sm font-medium">No edit proposed yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                AI edits are strictly non-silent. Every change is calculated as explicit added, modified, and removed items for your review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
