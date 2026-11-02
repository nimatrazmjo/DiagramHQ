'use client';

import React, { useState } from 'react';
import type { CanvasEdge, CanvasNode } from '@diagramhq/domain';

export interface ConnectionsPageProps {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
}

export function ConnectionsPage({ edges, nodes }: ConnectionsPageProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');

  const nodeMap = new Map(nodes.map((n) => [n.id, (n.data?.label as string) || n.id]));

  const filtered = edges.filter((e) => {
    const sName = nodeMap.get(e.source) || e.source;
    const tName = nodeMap.get(e.target) || e.target;
    const label = (e.label as string) || '';
    const q = searchQuery.toLowerCase();
    return sName.toLowerCase().includes(q) || tName.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  });

  return (
    <div
      data-testid="model-page-connections"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔗</span>
              <span>Model Connections Catalog</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {edges.length} connections
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            First-class connection contracts including Sender, Receiver, Via, Protocol, and Direction.
          </p>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections..."
          className="w-56 px-3 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-white/[0.08] bg-[#121518]/90 overflow-hidden shadow-2xl">
          <table data-testid="model-connections-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[#8b9196] font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Sender (Source)</th>
                <th className="py-3 px-4 font-semibold text-center w-12">Dir</th>
                <th className="py-3 px-4 font-semibold">Receiver (Target)</th>
                <th className="py-3 px-4 font-semibold">Protocol / Label</th>
                <th className="py-3 px-4 font-semibold w-28 text-center">Shape</th>
                <th className="py-3 px-4 font-semibold w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((edge) => {
                const sName = nodeMap.get(edge.source) || edge.source;
                const tName = nodeMap.get(edge.target) || edge.target;
                const shape = (edge.data?.shape as string) || 'square';
                const status = (edge.data?.status as string) || 'Live';

                return (
                  <tr
                    key={edge.id}
                    data-testid={`connection-row-${edge.id}`}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-white">
                      {sName}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-base">
                      →
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {tName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#2BB5E8]">
                      {edge.label || 'Sends data to'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] uppercase text-slate-300">
                        {shape}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
