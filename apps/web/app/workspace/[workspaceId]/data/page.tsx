'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Data Stores Page ─────────────────────────────────────────────────────── */

type StoreKind = 'relational' | 'cache' | 'objectstore' | 'queue';
type StoreStatus = 'healthy' | 'degraded' | 'maintenance';

interface DataStore {
  id: string;
  name: string;
  kind: StoreKind;
  engine: string;
  version: string;
  description: string;
  status: StoreStatus;
  topology: string;
  encryption: string;
  tags: string[];
  sizeGb: number;
  connectionCount: number;
  latencyMs: number;
}

const STORES: DataStore[] = [
  {
    id: 'store-postgres',
    name: 'Postgres Database Store',
    kind: 'relational',
    engine: 'PostgreSQL',
    version: '16.2',
    description: 'Relational ACID database for financial transactions, customer accounts, and encrypted credentials. Multi-AZ setup with read replicas.',
    status: 'healthy',
    topology: '1 Primary / 2 Replicas',
    encryption: 'AES-256 at-rest',
    tags: ['AWS RDS Aurora', 'AES-256', 'PgBouncer'],
    sizeGb: 420,
    connectionCount: 156,
    latencyMs: 3,
  },
  {
    id: 'store-redis',
    name: 'Cache Cluster',
    kind: 'cache',
    engine: 'Redis',
    version: '7.2',
    description: 'Sub-millisecond in-memory session validation and distributed rate-limit counters. Cluster mode with 3 shards.',
    status: 'healthy',
    topology: '3 Shards / 6 Nodes',
    encryption: 'TLS in-transit',
    tags: ['Redis 7.2', 'Cluster', 'ElastiCache'],
    sizeGb: 32,
    connectionCount: 890,
    latencyMs: 0.4,
  },
];

const KIND_META: Record<StoreKind, { label: string; icon: string; color: string }> = {
  relational:  { label: 'Relational DB', icon: 'database', color: '#006947' },
  cache:       { label: 'Cache / KV',    icon: 'bolt',     color: '#d97706' },
  objectstore: { label: 'Object Store',  icon: 'folder',   color: '#4648d4' },
  queue:       { label: 'Message Queue', icon: 'queue',    color: '#ba1a1a' },
};

const STATUS_META: Record<StoreStatus, { label: string; color: string; dot: string }> = {
  healthy:     { label: 'Healthy',     color: '#006947', dot: '#006947' },
  degraded:    { label: 'Degraded',    color: '#d97706', dot: '#d97706' },
  maintenance: { label: 'Maintenance', color: '#707881', dot: '#707881' },
};

interface DataPageProps {
  params: { workspaceId: string };
}

export default function DataPage({ params }: DataPageProps) {
  const { workspaceId } = params;
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<StoreKind | 'all'>('all');

  const filtered = STORES.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchKind = kindFilter === 'all' || s.kind === kindFilter;
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
            <span className="text-slate-200 font-medium">Data Stores</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Data Stores</h1>
          <p className="text-sm text-slate-400 mt-1">Databases, caches, object stores, and message queues in your architecture.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/canvas/${workspaceId}/diagram-1`}
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5"
          >
            <span>🗺</span> Open Canvas
          </Link>
          <button type="button" className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
            + Add Store
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
            placeholder="Search stores..."
          />
        </div>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {(['all', 'relational', 'cache', 'queue', 'objectstore'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k as StoreKind | 'all')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                kindFilter === k ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {k === 'all' ? 'All' : k === 'objectstore' ? 'Object' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Stores', value: STORES.length },
          { label: 'Total Size', value: `${STORES.reduce((a, s) => a + s.sizeGb, 0)} GB` },
          { label: 'Avg Latency', value: `${(STORES.reduce((a, s) => a + s.latencyMs, 0) / STORES.length).toFixed(1)}ms` },
          { label: 'Total Connections', value: STORES.reduce((a, s) => a + s.connectionCount, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Store cards */}
      <div className="space-y-4">
        {filtered.map((store) => {
          const km = KIND_META[store.kind];
          const sm = STATUS_META[store.status];
          return (
            <div key={store.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-4 justify-between">
                <div className="flex-1">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base" style={{ color: km.color }}>{km.icon}</span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${km.color}15`, color: km.color }}>{km.label}</span>
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: sm.color }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: sm.dot }} />
                      {sm.label}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{store.name}</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{store.description}</p>

                  {/* Metrics row */}
                  <div className="mt-3 flex items-center gap-6 text-xs">
                    {[
                      { label: 'Engine', value: `${store.engine} ${store.version}` },
                      { label: 'Topology', value: store.topology },
                      { label: 'Encryption', value: store.encryption },
                      { label: 'Size', value: `${store.sizeGb} GB` },
                      { label: 'Latency', value: `${store.latencyMs}ms`, color: '#006947' },
                      { label: 'Connections', value: store.connectionCount },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className="text-slate-500 uppercase tracking-wider text-[10px]">{label}</span>
                        <span className="font-mono font-semibold" style={{ color: color ?? '#e2e8f0' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {store.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">{t}</span>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/canvas/${workspaceId}/diagram-1`}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-600/20 transition-colors shrink-0"
                >
                  View on Canvas →
                </Link>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-sm">No stores match your filter.</div>
        )}
      </div>
    </div>
  );
}
