'use client';

import React from 'react';
import type { CanvasNode, CanvasEdge, ModelObject } from '@diagramhq/domain';
import type { ModelSection } from './model-nav-rail';

export interface HomePageProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  allModelObjects?: ModelObject[];
  onSelectSection: (section: ModelSection) => void;
  onSwitchToDiagram: () => void;
}

export function HomePage({
  nodes,
  edges,
  allModelObjects = [],
  onSelectSection,
  onSwitchToDiagram,
}: HomePageProps): JSX.Element {
  const totalObjects = Math.max(nodes.length, allModelObjects.length);
  const totalConnections = edges.length;

  return (
    <div
      data-testid="model-page-home"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-y-auto p-8"
    >
      {/* Welcome Banner */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#2BB5E8] mb-1">
              <span>MODEL DIRECTORY</span>
              <span>•</span>
              <span>SINGLE SOURCE OF TRUTH</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Architecture Model Home
            </h1>
            <p className="text-xs text-[#8b9196] mt-1 max-w-2xl leading-relaxed">
              Unified multi-tenant architecture repository. Manage DDD domains, system components,
              dependency graphs, and technology choices synchronized with all diagrams.
            </p>
          </div>

          <button
            type="button"
            data-testid="home-open-diagram-btn"
            onClick={onSwitchToDiagram}
            className="px-4 py-2 rounded-xl bg-[#2BB5E8] hover:bg-[#2294bd] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#2BB5E8]/20 transition-all"
          >
            <span>📐</span>
            <span>Open Diagram Canvas</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div
            onClick={() => onSelectSection('objects')}
            className="p-5 rounded-2xl bg-[#15181c] border border-white/[0.08] hover:border-[#2BB5E8]/40 cursor-pointer transition-all group"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="text-2xl font-bold text-white font-mono group-hover:text-[#2BB5E8] transition-colors">
              {totalObjects}
            </div>
            <div className="text-xs text-[#8b9196] font-medium mt-0.5">Model Objects</div>
            <div className="text-[10px] text-[#2BB5E8] mt-2 flex items-center gap-1 font-mono">
              View catalog ↗
            </div>
          </div>

          <div
            onClick={() => onSelectSection('connections')}
            className="p-5 rounded-2xl bg-[#15181c] border border-white/[0.08] hover:border-sky-400/40 cursor-pointer transition-all group"
          >
            <div className="text-2xl mb-2">🔗</div>
            <div className="text-2xl font-bold text-white font-mono group-hover:text-sky-400 transition-colors">
              {totalConnections}
            </div>
            <div className="text-xs text-[#8b9196] font-medium mt-0.5">Connections</div>
            <div className="text-[10px] text-sky-400 mt-2 flex items-center gap-1 font-mono">
              View connections ↗
            </div>
          </div>

          <div
            onClick={() => onSelectSection('dependencies')}
            className="p-5 rounded-2xl bg-[#15181c] border border-white/[0.08] hover:border-pink-400/40 cursor-pointer transition-all group"
          >
            <div className="text-2xl mb-2">🔀</div>
            <div className="text-2xl font-bold text-white font-mono group-hover:text-pink-400 transition-colors">
              3-Way
            </div>
            <div className="text-xs text-[#8b9196] font-medium mt-0.5">Dependency Matrix</div>
            <div className="text-[10px] text-pink-400 mt-2 flex items-center gap-1 font-mono">
              Inspect graph ↗
            </div>
          </div>

          <div
            onClick={() => onSelectSection('technologies')}
            className="p-5 rounded-2xl bg-[#15181c] border border-white/[0.08] hover:border-amber-400/40 cursor-pointer transition-all group"
          >
            <div className="text-2xl mb-2">🛠️</div>
            <div className="text-2xl font-bold text-white font-mono group-hover:text-amber-400 transition-colors">
              15+
            </div>
            <div className="text-xs text-[#8b9196] font-medium mt-0.5">Approved Tech</div>
            <div className="text-[10px] text-amber-400 mt-2 flex items-center gap-1 font-mono">
              Manage catalog ↗
            </div>
          </div>
        </div>

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => onSelectSection('dependencies')}
            className="p-5 rounded-2xl bg-gradient-to-br from-[#15181c] to-[#121518] border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🔀</span>
              <h3 className="font-bold text-white text-sm">Interactive Dependencies</h3>
            </div>
            <p className="text-xs text-[#8b9196] leading-relaxed">
              Drill down into any object of focus to see incoming callers and outgoing targets
              with protocol and domain filters.
            </p>
          </div>

          <div
            onClick={() => onSelectSection('technologies')}
            className="p-5 rounded-2xl bg-gradient-to-br from-[#15181c] to-[#121518] border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🛠️</span>
              <h3 className="font-bold text-white text-sm">Technologies Catalog</h3>
            </div>
            <p className="text-xs text-[#8b9196] leading-relaxed">
              Audit frameworks, databases, and cloud services in use across all software systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
