'use client';

import React, { useState, useMemo } from 'react';
import type { CanvasNode, ModelObject } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';

export interface ObjectsPageProps {
  nodes: CanvasNode[];
  allModelObjects?: ModelObject[];
  onSelectNode?: (nodeId: string) => void;
}

export function ObjectsPage({
  nodes,
  allModelObjects = [],
  onSelectNode,
}: ObjectsPageProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  const objects = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      kind: string;
      technology: string;
      status: string;
      c4Level?: number;
      description: string;
    }> = [];
    const seen = new Set<string>();

    for (const node of nodes) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        const name = (node.data?.label as string) || node.id;
        const kind = (node.data?.kind as string) || node.type || 'object';
        const technology = (node.data?.technology as string) || '';
        const status = (node.data?.status as string) || 'Live';
        const c4Level = typeof node.data?.c4Level === 'number' ? node.data.c4Level : undefined;
        const description = (node.data?.description as string) || '';
        list.push({ id: node.id, name, kind, technology, status, c4Level, description });
      }
    }

    return list;
  }, [nodes]);

  const filtered = useMemo(() => {
    return objects.filter((o) => {
      if (kindFilter !== 'all' && o.kind.toLowerCase() !== kindFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return o.name.toLowerCase().includes(q) || o.technology.toLowerCase().includes(q);
      }
      return true;
    });
  }, [objects, kindFilter, searchQuery]);

  return (
    <div
      data-testid="model-page-objects"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📦</span>
              <span>Model Objects Catalog</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {objects.length} total objects
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Master repository of all C4 systems, applications, databases, queues, and components.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            data-testid="objects-kind-filter"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white"
          >
            <option value="all">All Kinds</option>
            <option value="system">Systems</option>
            <option value="application">Apps / Services</option>
            <option value="database">Databases</option>
            <option value="component">Components</option>
            <option value="actor">Actors</option>
          </select>

          <input
            type="text"
            data-testid="objects-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objects..."
            className="w-56 px-3 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-white/[0.08] bg-[#121518]/90 overflow-hidden shadow-2xl">
          <table data-testid="model-objects-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[#8b9196] font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold w-28">Kind</th>
                <th className="py-3 px-4 font-semibold w-24 text-center">Level</th>
                <th className="py-3 px-4 font-semibold">Technology</th>
                <th className="py-3 px-4 font-semibold w-28 text-center">Status</th>
                <th className="py-3 px-4 font-semibold w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((obj) => {
                const iconPath = getTechnologyIconPath(obj.technology);
                return (
                  <tr
                    key={obj.id}
                    data-testid={`object-row-${obj.id}`}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xs shrink-0">
                          {iconPath ? <img src={iconPath} alt="" className="w-3.5 h-3.5" /> : '📦'}
                        </div>
                        <div className="font-semibold text-white group-hover:text-[#2BB5E8] transition-colors truncate">
                          {obj.name}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono text-[10px] uppercase">
                        {obj.kind}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[10px] text-[#8b9196]">
                        {obj.c4Level ? `L${obj.c4Level}` : '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 truncate">
                      {obj.technology || '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {obj.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {onSelectNode && (
                        <button
                          type="button"
                          onClick={() => onSelectNode(obj.id)}
                          className="px-2 py-1 rounded bg-[#2BB5E8]/10 hover:bg-[#2BB5E8]/20 text-[#2BB5E8] text-[10px] font-medium transition-colors"
                        >
                          Inspect 📐
                        </button>
                      )}
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
