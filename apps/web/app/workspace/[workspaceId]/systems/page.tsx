'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Systems Catalog Page ─────────────────────────────────────────────────── */

const SYSTEMS = [
  {
    id: 'sys-payment',
    name: 'Payment Gateway System',
    kind: 'Internal',
    description: 'High-level payment processing, orchestration, and banking settlement boundary.',
    services: 4,
    connections: 6,
    tags: ['PCI-DSS', 'Stripe API', 'gRPC'],
    health: 'healthy',
    badgeColor: '#4648d4',
    badgeBg: '#e1e0ff',
  },
  {
    id: 'sys-identity',
    name: 'Identity & Auth Platform',
    kind: 'Internal',
    description: 'Cross-cutting authentication, OAuth2 / OIDC token lifecycle, and RBAC enforcement.',
    services: 2,
    connections: 8,
    tags: ['OAuth2', 'OIDC', 'JWT'],
    health: 'healthy',
    badgeColor: '#006194',
    badgeBg: '#cce5ff',
  },
];

interface SystemsPageProps {
  params: { workspaceId: string };
}

export default function SystemsPage({ params }: SystemsPageProps) {
  const { workspaceId } = params;
  const [search, setSearch] = useState('');

  const filtered = SYSTEMS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200 transition-colors">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Systems</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Software Systems</h1>
          <p className="text-sm text-slate-400 mt-1">
            High-level boundary systems partitioning major functional domains in this architecture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/studio"
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5"
          >
            <span>🗺</span> Open Studio
          </Link>
          <button
            type="button"
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            + Define System
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 max-w-sm">
        <span className="text-slate-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none w-full"
          placeholder="Search systems..."
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Systems', value: SYSTEMS.length, icon: '🏛️' },
          { label: 'Total Services', value: SYSTEMS.reduce((a, s) => a + s.services, 0), icon: '⚙️' },
          { label: 'Total Connections', value: SYSTEMS.reduce((a, s) => a + s.connections, 0), icon: '🔗' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-lg">{icon}</div>
            <div className="text-2xl font-bold text-white mt-1">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* System cards */}
      <div className="space-y-4">
        {filtered.map((sys) => (
          <div
            key={sys.id}
            className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: sys.badgeBg, color: sys.badgeColor }}
                  >
                    {sys.kind}
                  </span>
                  {sys.health === 'healthy' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Healthy
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{sys.name}</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{sys.description}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {sys.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{sys.services}</div>
                  <div className="text-xs text-slate-400">services</div>
                </div>
                <Link
                  href="/studio"
                  className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-600/20 transition-colors"
                >
                  View in Studio →
                </Link>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-12 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-sm">
            No systems match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
