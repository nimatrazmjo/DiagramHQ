'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Views / Diagram Projections Page ─────────────────────────────────────── */

type ViewLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'custom';

interface DiagramView {
  id: string;
  name: string;
  level: ViewLevel;
  description: string;
  nodeCount: number;
  connectionCount: number;
  lastEdited: string;
  tags: string[];
  thumbnail: string; // emoji placeholder
}

const VIEWS: DiagramView[] = [
  {
    id: 'view-containers',
    name: 'Payment System — Container Diagram',
    level: 'C2',
    description: 'Level 2 container view showing the runtime services, databases, and message queues in the Payment Gateway System boundary.',
    nodeCount: 7,
    connectionCount: 6,
    lastEdited: '2h ago',
    tags: ['Payment', 'Production'],
    thumbnail: '🗃️',
  },
  {
    id: 'view-context',
    name: 'System Context Overview',
    level: 'C1',
    description: 'High-level system context showing how End Users, the Payment System, and third-party dependencies (Stripe, ACM) interact.',
    nodeCount: 4,
    connectionCount: 4,
    lastEdited: '1d ago',
    tags: ['Context', 'Stakeholder'],
    thumbnail: '🌐',
  },
  {
    id: 'view-auth-components',
    name: 'Auth Service — Component Diagram',
    level: 'C3',
    description: 'Level 3 component breakdown of the Auth Service App: token handler, RBAC engine, session store adapter, and credential vault.',
    nodeCount: 6,
    connectionCount: 7,
    lastEdited: '3d ago',
    tags: ['Auth', 'Components'],
    thumbnail: '⚙️',
  },
];

const LEVEL_META: Record<ViewLevel, { label: string; bg: string; color: string }> = {
  C1: { label: 'C1 · Context',    bg: 'rgba(186,26,26,0.12)',    color: '#ba1a1a' },
  C2: { label: 'C2 · Containers', bg: 'rgba(0,97,148,0.12)',     color: '#006194' },
  C3: { label: 'C3 · Components', bg: 'rgba(70,72,212,0.12)',    color: '#4648d4' },
  C4: { label: 'C4 · Code',       bg: 'rgba(0,105,71,0.12)',     color: '#006947' },
  custom: { label: 'Custom',       bg: 'rgba(112,120,129,0.12)',  color: '#707881' },
};

interface ViewsPageProps {
  params: { workspaceId: string };
}

export default function ViewsPage({ params }: ViewsPageProps) {
  const { workspaceId } = params;
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<ViewLevel | 'all'>('all');

  const filtered = VIEWS.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchLevel = levelFilter === 'all' || v.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Views</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Diagram Views</h1>
          <p className="text-sm text-slate-400 mt-1">C4 model projections and custom stakeholder views of your architecture.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
            + New View
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none w-44"
            placeholder="Search views..."
          />
        </div>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {(['all', 'C1', 'C2', 'C3', 'C4'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l as ViewLevel | 'all')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                levelFilter === l ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l === 'all' ? 'All Levels' : l}
            </button>
          ))}
        </div>
      </div>

      {/* View cards (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((view) => {
          const meta = LEVEL_META[view.level];
          return (
            <div key={view.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-colors group">
              {/* Thumbnail area */}
              <div className="h-36 bg-slate-950/60 flex items-center justify-center relative border-b border-slate-800">
                <span className="text-5xl opacity-60">{view.thumbnail}</span>
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
                <Link
                  href={`/studio?viewId=${view.id}`}
                  className="absolute inset-0 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"
                >
                  <span className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Open in Studio →</span>
                </Link>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-white text-sm leading-snug">{view.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{view.description}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span><span className="text-white font-semibold">{view.nodeCount}</span> nodes</span>
                  <span>·</span>
                  <span><span className="text-white font-semibold">{view.connectionCount}</span> connections</span>
                  <span>·</span>
                  <span>{view.lastEdited}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {view.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">{t}</span>
                    ))}
                  </div>
                  <Link
                    href={`/studio?viewId=${view.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Open in Studio →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 p-12 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-sm">
            No views match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
