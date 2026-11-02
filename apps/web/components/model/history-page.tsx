'use client';

import React from 'react';

export interface AuditEvent {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  target: string;
  branch: string;
}

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt-1',
    timestamp: '2 mins ago',
    author: 'Nim (You)',
    action: 'Merged draft branch',
    target: 'feat/icepanel-fidelity-nodes',
    branch: 'main',
  },
  {
    id: 'evt-2',
    timestamp: '15 mins ago',
    author: 'Nim (You)',
    action: 'Updated connection routing shape to curved',
    target: 'API Gateway → Auth Service',
    branch: 'feat/icepanel-fidelity-nodes',
  },
  {
    id: 'evt-3',
    timestamp: '1 hour ago',
    author: 'Nim (You)',
    action: 'Added technology PostgreSQL 16 to database store',
    target: 'store-db',
    branch: 'feat/icepanel-fidelity-nodes',
  },
  {
    id: 'evt-4',
    timestamp: '3 hours ago',
    author: 'Alex Mercer',
    action: 'Created C4 L3 component diagram',
    target: 'Auth Service Components',
    branch: 'main',
  },
];

export function HistoryPage(): JSX.Element {
  return (
    <div
      data-testid="model-page-history"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📜</span>
              <span>Model Audit History</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {INITIAL_AUDIT_EVENTS.length} events
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Immutable timeline of model revisions, draft merges, and component property changes.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl">
        <div className="relative border-l border-white/[0.1] pl-6 ml-4 space-y-6">
          {INITIAL_AUDIT_EVENTS.map((evt) => (
            <div key={evt.id} className="relative group">
              <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#15181c] border-2 border-[#2BB5E8] shadow-sm" />
              <div className="p-4 rounded-xl bg-[#121518] border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-white">
                    {evt.action}
                  </span>
                  <span className="text-[10px] font-mono text-[#8b9196]">
                    {evt.timestamp}
                  </span>
                </div>
                <div className="text-xs text-sky-300 font-mono">
                  {evt.target}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-[#8b9196]">
                  <span>By <strong className="text-slate-300">{evt.author}</strong></span>
                  <span>•</span>
                  <span className="px-1.5 py-0.2 rounded bg-white/[0.06] font-mono">
                    {evt.branch}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
