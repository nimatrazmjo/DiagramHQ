'use client';

import React, { useState } from 'react';
import type {
  MCPToolDefinition,
  MCPToolProposal,
} from '@diagramhq/domain';

export interface MCPStatusBadgeProps {
  toolCount?: number;
  className?: string;
  onClick?: () => void;
}

export function MCPStatusBadge({
  toolCount = 14,
  className = '',
  onClick,
}: MCPStatusBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 hover:border-indigo-400 text-xs text-slate-200 transition-colors ${className}`}
      title="Model Context Protocol (MCP) Server"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-mono font-bold text-indigo-400 text-[11px]">MCP</span>
      <span className="text-slate-400">|</span>
      <span className="font-mono text-[10px] text-slate-300">{toolCount} tools active</span>
    </button>
  );
}

export interface MCPInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: MCPToolDefinition[];
  activeProposals?: MCPToolProposal[];
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
}

export function MCPInspectorModal({
  isOpen,
  onClose,
  tools,
  activeProposals = [],
  onApproveProposal,
  onRejectProposal,
}: MCPInspectorModalProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTab, setSelectedTab] = useState<'tools' | 'proposals'>('tools');

  if (!isOpen) return null;

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Model Context Protocol Server Dialog"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[88vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">
              integration_instructions
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Model Context Protocol (MCP) Tool Server
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 border border-emerald-800 text-emerald-300">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard tool definitions for external AI assistants (Cursor, Claude Desktop, Antigravity)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close MCP Dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Bar & Invariant Banner */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedTab('tools')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                selectedTab === 'tools'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registered Tools ({tools.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('proposals')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                selectedTab === 'proposals'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Proposals</span>
              {activeProposals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                  {activeProposals.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-emerald-400 font-mono">
            ✓ Invariant: Mutating tools return proposals, never silent commits
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {selectedTab === 'tools' ? (
            <>
              {/* Search input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter MCP tools by name or description..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Tools List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-300">
                        {tool.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                          tool.isMutating
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800'
                        }`}
                      >
                        {tool.isMutating ? 'Mutating Proposal' : 'Read Query'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Proposals Tab */
            <div className="space-y-3">
              {activeProposals.length > 0 ? (
                activeProposals.map((prop) => (
                  <div
                    key={prop.proposalId}
                    className="p-4 rounded-xl border border-amber-800/60 bg-slate-950 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 font-bold uppercase">
                          {prop.action}
                        </span>
                        <span className="font-mono text-xs text-indigo-300 font-bold">
                          {prop.toolName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {prop.proposalId}
                      </span>
                    </div>

                    <p className="text-xs text-white">{prop.summary}</p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
                      {onRejectProposal && (
                        <button
                          type="button"
                          onClick={() => onRejectProposal(prop.proposalId)}
                          className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                        >
                          Reject
                        </button>
                      )}
                      {onApproveProposal && (
                        <button
                          type="button"
                          onClick={() => onApproveProposal(prop.proposalId)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">done</span>
                          Approve &amp; Apply
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Zero pending proposals. All MCP mutations require explicit human review.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {tools.length} Tools Available · JSON-RPC 2.0 Compliant
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
