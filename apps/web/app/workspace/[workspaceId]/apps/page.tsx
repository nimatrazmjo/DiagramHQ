'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Apps & Services Catalog Page ────────────────────────────────────────── */

type AppKind = 'app' | 'store' | 'person';

interface AppEntry {
  id: string;
  name: string;
  kind: AppKind;
  runtime: string;
  description: string;
  status: 'active' | 'degraded' | 'offline';
  tags: string[];
  system: string;
  version: string;
  latencyP95?: string;
  errorRate?: string;
}

const APPS: AppEntry[] = [
  {
    id: 'app-edge-gw',
    name: 'Edge API Gateway',
    kind: 'app',
    runtime: 'Fastify / Go',
    description: 'Reverse proxy layer managing TLS termination, token authentication, distributed rate-limiting, and GraphQL federation.',
    status: 'active',
    tags: ['GraphQL', 'Fastify', 'Envoy Proxy', 'Docker'],
    system: 'Payment Gateway System',
    version: 'v2.4.1',
    latencyP95: '6ms',
    errorRate: '0.001%',
  },
  {
    id: 'app-auth',
    name: 'Auth Service App',
    kind: 'app',
    runtime: 'Node.js 20 LTS',
    description: 'Authentication, OAuth2 token issuance, verification, and active sessions cache.',
    status: 'active',
    tags: ['JWT', 'Redis Session', 'OAuth2'],
    system: 'Identity & Auth Platform',
    version: 'v2.10.4',
    latencyP95: '14ms',
    errorRate: '0.002%',
  },
  {
    id: 'app-webapp',
    name: 'Customer Web App',
    kind: 'app',
    runtime: 'Next.js 14 / Vercel',
    description: 'Next.js SPA bundle hosted on Vercel Edge Global CDN, consuming REST & GraphQL endpoints.',
    status: 'active',
    tags: ['React 18', 'TypeScript', 'Tailwind'],
    system: 'Identity & Auth Platform',
    version: 'v3.2.0',
    latencyP95: '120ms',
    errorRate: '0.000%',
  },
];

const STATUS_STYLES = {
  active: { dot: '#006947', text: '#006947', label: 'Active' },
  degraded: { dot: '#f59e0b', text: '#d97706', label: 'Degraded' },
  offline: { dot: '#ba1a1a', text: '#ba1a1a', label: 'Offline' },
};

interface AppsPageProps {
  params: { workspaceId: string };
}

export default function AppsPage({ params }: AppsPageProps) {
  const { workspaceId } = params;
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<AppKind | 'all'>('all');

  const filtered = APPS.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchKind = kindFilter === 'all' || a.kind === kindFilter;
    return matchSearch && matchKind;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Apps &amp; Services</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Apps &amp; Services</h1>
          <p className="text-sm text-slate-400 mt-1">Running containers, microservices, frontends, and worker processes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/studio"
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5"
          >
            <span>🗺</span> Open Studio
          </Link>
          <button type="button" className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
            + Add Service
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
            className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none w-48"
            placeholder="Search services..."
          />
        </div>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {(['all', 'app', 'store'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                kindFilter === k ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {k === 'all' ? 'All' : k === 'app' ? 'Services' : 'Data Stores'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: APPS.length },
          { label: 'Active', value: APPS.filter((a) => a.status === 'active').length },
          { label: 'Avg Latency p95', value: '47ms' },
          { label: 'Avg Error Rate', value: '0.001%' },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Service table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              {['Name', 'Runtime', 'System', 'Version', 'p95 Latency', 'Error Rate', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((app) => {
              const st = STATUS_STYLES[app.status];
              return (
                <tr key={app.id} className="bg-slate-950/40 hover:bg-slate-900/60 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">{app.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{app.description}</div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {app.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">{app.runtime}</td>
                  <td className="px-4 py-4 text-xs text-slate-400">{app.system}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-300">{app.version}</td>
                  <td className="px-4 py-4 font-mono text-xs text-emerald-400">{app.latencyP95 ?? '—'}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-300">{app.errorRate ?? '—'}</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap" style={{ color: st.text }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: st.dot }} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href="/studio"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Inspect in Studio →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-sm">No services match your filter.</div>
        )}
      </div>
    </div>
  );
}
