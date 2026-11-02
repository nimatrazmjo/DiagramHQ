'use client';

import React, { useState, useMemo } from 'react';
import type { CanvasNode, CanvasEdge, ModelObject } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';

export interface DependenciesPageProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  allModelObjects?: ModelObject[];
  onSelectNode?: (nodeId: string) => void;
  availableDomains?: Array<{ id: string; name: string }>;
}

export function DependenciesPage({
  nodes,
  edges,
  allModelObjects = [],
  onSelectNode,
  availableDomains = [
    { id: 'core', name: 'Core Platform' },
    { id: 'identity', name: 'Identity & Access' },
    { id: 'billing', name: 'Payments & Billing' },
    { id: 'data', name: 'Data & Storage' },
    { id: 'external', name: 'External Services' },
  ],
}: DependenciesPageProps): JSX.Element {
  // Normalize pool of objects
  const pool = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      kind: string;
      technology: string;
      domain: string;
      c4Level?: number;
      status: string;
      description: string;
    }> = [];
    const seen = new Set<string>();

    for (const node of nodes) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        const name = (node.data?.label as string) || node.id;
        const kind = (node.data?.kind as string) || node.type || 'object';
        const technology = (node.data?.technology as string) || '';
        const domain = (node.data?.domain as string) || (
          node.id.startsWith('cmp-') ? 'Identity & Access' :
          node.id.startsWith('store-') ? 'Data & Storage' :
          node.id.startsWith('sys-email') || node.id.startsWith('sys-billing') ? 'External Services' :
          'Core Platform'
        );
        const c4Level = typeof node.data?.c4Level === 'number' ? node.data.c4Level : undefined;
        const status = (node.data?.status as string) || 'Live';
        const description = (node.data?.description as string) || '';
        list.push({ id: node.id, name, kind, technology, domain, c4Level, status, description });
      }
    }

    return list;
  }, [nodes]);

  // Object of focus state (default to app-api or first node)
  const [focusNodeId, setFocusNodeId] = useState<string>(() => {
    const defaultTarget = pool.find((o) => o.id === 'app-api') || pool[0];
    return defaultTarget ? defaultTarget.id : '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Filtered pool for focus selector
  const selectableObjects = useMemo(() => {
    return pool.filter((obj) => {
      if (selectedDomain !== 'all' && obj.domain.toLowerCase() !== selectedDomain.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return obj.name.toLowerCase().includes(q) || obj.technology.toLowerCase().includes(q);
      }
      return true;
    });
  }, [pool, selectedDomain, searchQuery]);

  const focusedObject = useMemo(() => {
    return (
      (focusNodeId ? pool.find((o) => o.id === focusNodeId) : null) ||
      pool.find((o) => o.id === 'app-api') ||
      selectableObjects[0] ||
      pool[0] ||
      null
    );
  }, [pool, focusNodeId, selectableObjects]);

  // Incoming callers
  const incomingDependencies = useMemo(() => {
    if (!focusedObject) return [];
    const incomingEdges = edges.filter((e) => e.target === focusedObject.id);
    return incomingEdges.map((edge) => {
      const sourceObj = pool.find((o) => o.id === edge.source);
      return {
        edge,
        source: sourceObj || {
          id: edge.source,
          name: edge.source,
          kind: 'object',
          technology: '',
          domain: 'Unknown',
          status: 'Live',
          description: '',
        },
      };
    });
  }, [focusedObject, edges, pool]);

  // Outgoing targets
  const outgoingDependencies = useMemo(() => {
    if (!focusedObject) return [];
    const outgoingEdges = edges.filter((e) => e.source === focusedObject.id);
    return outgoingEdges.map((edge) => {
      const targetObj = pool.find((o) => o.id === edge.target);
      return {
        edge,
        target: targetObj || {
          id: edge.target,
          name: edge.target,
          kind: 'object',
          technology: '',
          domain: 'Unknown',
          status: 'Live',
          description: '',
        },
      };
    });
  }, [focusedObject, edges, pool]);

  return (
    <div
      data-testid="model-page-dependencies"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      {/* Top Controls Toolbar */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🔀</span>
            <span>Dependencies</span>
          </h1>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Incoming, object-of-focus, and outgoing dependency matrix across architecture tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Domain Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#8b9196]">
            <span>Domain:</span>
            <select
              data-testid="dependencies-domain-filter"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#2BB5E8] transition-colors"
            >
              <option value="all">All Domains</option>
              {availableDomains.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              data-testid="dependencies-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search objects..."
              className="w-52 px-3 py-1.5 pl-8 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8] transition-colors"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8b9196]">
              🔍
            </span>
          </div>

          {/* Focus Switcher */}
          <select
            data-testid="dependencies-focus-selector"
            value={focusedObject?.id || ''}
            onChange={(e) => setFocusNodeId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#15181c] border border-blue-500/40 text-xs font-semibold text-[#2BB5E8] focus:outline-none focus:border-[#2BB5E8]"
          >
            {selectableObjects.map((obj) => (
              <option key={obj.id} value={obj.id}>
                Focus: {obj.name} ({obj.kind})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-Column Layout: Incoming · Focus · Outgoing */}
      <div
        data-testid="dependencies-3-column-view"
        className="flex-1 grid grid-cols-12 gap-4 p-6 overflow-hidden"
      >
        {/* Column 1: Incoming (3 cols) */}
        <div
          data-testid="dependencies-incoming-col"
          className="col-span-4 flex flex-col bg-[#121518]/90 border border-white/[0.08] rounded-xl p-4 overflow-hidden shadow-xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <span>◀ Incoming</span>
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px]">
                  {incomingDependencies.length}
                </span>
              </div>
              <div className="text-[11px] text-[#8b9196] mt-0.5 truncate">
                Callers calling {focusedObject?.name}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {incomingDependencies.map(({ edge, source }) => {
              const iconPath = getTechnologyIconPath(source.technology);
              return (
                <div
                  key={edge.id}
                  data-testid={`incoming-dep-${source.id}`}
                  className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xs shrink-0">
                        {iconPath ? <img src={iconPath} alt="" className="w-3.5 h-3.5" /> : '📦'}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-white group-hover:text-pink-300 transition-colors truncate">
                          {source.name}
                        </div>
                        <div className="text-[10px] text-[#8b9196] truncate">
                          {source.domain} · {source.kind}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`focus-incoming-${source.id}`}
                      onClick={() => setFocusNodeId(source.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] hover:bg-pink-500/20 text-[#8b9196] hover:text-pink-300 font-medium transition-colors shrink-0"
                      title="Set as object of focus"
                    >
                      Focus 🎯
                    </button>
                  </div>

                  {edge.label && (
                    <div className="mt-2 text-[10px] font-mono px-2 py-1 rounded bg-[#0b0d0f] border border-white/[0.06] text-pink-300/90 flex items-center gap-1.5">
                      <span className="text-[8px] text-[#8b9196]">PROTOCOL:</span>
                      <span className="truncate">{edge.label}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {incomingDependencies.length === 0 && (
              <div
                data-testid="incoming-empty-state"
                className="h-48 flex flex-col items-center justify-center text-center text-[#8b9196] text-xs px-4"
              >
                <span className="text-xl mb-1">🏁</span>
                <span className="font-medium text-slate-300">Root / Entry Point</span>
                <span className="text-[11px] text-[#8b9196] mt-0.5">
                  No upstream callers call into {focusedObject?.name}.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Object of Focus (4 cols) */}
        <div
          data-testid="dependencies-focus-col"
          className="col-span-4 flex flex-col bg-[#15181c] border-2 border-[#2BB5E8]/40 rounded-xl p-5 overflow-y-auto shadow-2xl relative"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#2BB5E8] flex items-center justify-between mb-4">
            <span className="flex items-center gap-1.5">
              <span>🎯 Object of Focus</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#2BB5E8]/10 text-[#2BB5E8] border border-[#2BB5E8]/30 text-[10px] font-mono">
              LEVEL {focusedObject?.c4Level || 2}
            </span>
          </div>

          {focusedObject ? (
            <div data-testid="dependencies-focus-card" className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {focusedObject.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/[0.08] text-slate-300 font-medium capitalize">
                    {focusedObject.kind}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-sky-300 border border-blue-500/20 font-medium">
                    {focusedObject.domain}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                    {focusedObject.status}
                  </span>
                </div>
              </div>

              {focusedObject.description && (
                <div className="p-3 rounded-lg bg-black/30 border border-white/[0.06] text-xs text-[#8b9196] leading-relaxed">
                  {focusedObject.description}
                </div>
              )}

              {/* Technologies */}
              {focusedObject.technology && (
                <div>
                  <div className="text-[11px] font-mono uppercase text-[#8b9196] mb-1.5">
                    Assigned Technology
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {focusedObject.technology.split(',').map((tech) => {
                      const t = tech.trim();
                      const icon = getTechnologyIconPath(t);
                      return (
                        <div
                          key={t}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white flex items-center gap-1.5"
                        >
                          {icon && <img src={icon} alt="" className="w-3.5 h-3.5" />}
                          <span>{t}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metrics Summary */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold text-pink-400 font-mono">
                    {incomingDependencies.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#8b9196] mt-0.5 font-medium">
                    Inbound Callers
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold text-sky-400 font-mono">
                    {outgoingDependencies.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#8b9196] mt-0.5 font-medium">
                    Outbound Deps
                  </div>
                </div>
              </div>

              {onSelectNode && (
                <button
                  type="button"
                  onClick={() => onSelectNode(focusedObject.id)}
                  className="w-full py-2 rounded-lg bg-[#2BB5E8]/10 hover:bg-[#2BB5E8]/20 border border-[#2BB5E8]/30 text-xs font-semibold text-[#2BB5E8] transition-colors"
                >
                  Inspect Object in Canvas 📐
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-[#8b9196] text-xs py-12">
              Select an object to inspect its dependencies.
            </div>
          )}
        </div>

        {/* Column 3: Outgoing (4 cols) */}
        <div
          data-testid="dependencies-outgoing-col"
          className="col-span-4 flex flex-col bg-[#121518]/90 border border-white/[0.08] rounded-xl p-4 overflow-hidden shadow-xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <span>Outgoing ▶</span>
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px]">
                  {outgoingDependencies.length}
                </span>
              </div>
              <div className="text-[11px] text-[#8b9196] mt-0.5 truncate">
                Downstream targets called by {focusedObject?.name}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {outgoingDependencies.map(({ edge, target }) => {
              const iconPath = getTechnologyIconPath(target.technology);
              return (
                <div
                  key={edge.id}
                  data-testid={`outgoing-dep-${target.id}`}
                  className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs shrink-0">
                        {iconPath ? <img src={iconPath} alt="" className="w-3.5 h-3.5" /> : '🗄️'}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-white group-hover:text-sky-300 transition-colors truncate">
                          {target.name}
                        </div>
                        <div className="text-[10px] text-[#8b9196] truncate">
                          {target.domain} · {target.kind}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`focus-outgoing-${target.id}`}
                      onClick={() => setFocusNodeId(target.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] hover:bg-sky-500/20 text-[#8b9196] hover:text-sky-300 font-medium transition-colors shrink-0"
                      title="Set as object of focus"
                    >
                      Focus 🎯
                    </button>
                  </div>

                  {edge.label && (
                    <div className="mt-2 text-[10px] font-mono px-2 py-1 rounded bg-[#0b0d0f] border border-white/[0.06] text-sky-300/90 flex items-center gap-1.5">
                      <span className="text-[8px] text-[#8b9196]">PROTOCOL:</span>
                      <span className="truncate">{edge.label}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {outgoingDependencies.length === 0 && (
              <div
                data-testid="outgoing-empty-state"
                className="h-48 flex flex-col items-center justify-center text-center text-[#8b9196] text-xs px-4"
              >
                <span className="text-xl mb-1">🍃</span>
                <span className="font-medium text-slate-300">Leaf Node / Sink</span>
                <span className="text-[11px] text-[#8b9196] mt-0.5">
                  {focusedObject?.name} does not make any downstream outbound calls.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
