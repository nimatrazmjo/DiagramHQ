'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Decisions / ADR Page ─────────────────────────────────────────────────── */

type ADRStatus = 'accepted' | 'proposed' | 'deprecated' | 'superseded';

interface ADR {
  id: string;
  number: number;
  title: string;
  status: ADRStatus;
  date: string;
  context: string;
  decision: string;
  consequences: string[];
  tags: string[];
  author: string;
}

const ADRS: ADR[] = [
  {
    id: 'adr-001',
    number: 1,
    title: 'Use gRPC for internal service-to-service communication',
    status: 'accepted',
    date: '2026-08-15',
    author: 'AM',
    context:
      'Internal services needed a high-performance, schema-enforced RPC mechanism to replace ad-hoc REST calls between the Auth Service, Payment Gateway, and Edge Gateway.',
    decision:
      'Adopt gRPC with Protocol Buffers for all synchronous internal service calls. REST+JSON is reserved only for public-facing external APIs and third-party webhooks.',
    consequences: [
      'Services require protobuf schema definitions maintained in a shared `proto/` monorepo package.',
      'Observability tools (Jaeger, Grafana) must support gRPC tracing — confirmed with Envoy sidecar.',
      'Client SDK generation is automated via `buf generate` in CI.',
      'External parties cannot directly call internal gRPC endpoints; the Edge Gateway acts as the translation boundary.',
    ],
    tags: ['Communication', 'gRPC', 'Protocol Buffers'],
  },
  {
    id: 'adr-002',
    number: 2,
    title: 'Adopt Zero-Trust mTLS between all production services',
    status: 'accepted',
    date: '2026-09-01',
    author: 'SK',
    context:
      'Lateral movement attacks inside the cluster were identified as a high-risk threat vector. Services were previously communicating over plaintext TCP within the VPC, relying solely on network-level isolation.',
    decision:
      'Implement mutual TLS (mTLS) for all service-to-service communication using AWS ACM Private CA certificates rotated every 24h. Envoy Proxy sidecars handle certificate exchange transparently.',
    consequences: [
      'Adds ~2ms overhead per connection due to TLS handshake — acceptable given p95 latency budget.',
      'Requires Envoy sidecar injection in all deployment manifests (enforced via admission webhook).',
      'Certificate rotation is fully automated; no manual intervention required.',
      'Satisfies PCI-DSS Requirement 4.2 (encryption in transit).',
    ],
    tags: ['Security', 'mTLS', 'Zero-Trust', 'PCI-DSS'],
  },
];

const STATUS_META: Record<ADRStatus, { label: string; bg: string; color: string }> = {
  accepted: { label: 'Accepted', bg: 'rgba(0,105,71,0.15)', color: '#006947' },
  proposed: { label: 'Proposed', bg: 'rgba(70,72,212,0.15)', color: '#4648d4' },
  deprecated: { label: 'Deprecated', bg: 'rgba(186,26,26,0.12)', color: '#ba1a1a' },
  superseded: { label: 'Superseded', bg: 'rgba(112,120,129,0.15)', color: '#707881' },
};

interface DecisionsPageProps {
  params: { workspaceId: string };
}

export default function DecisionsPage({ params }: DecisionsPageProps) {
  const { workspaceId } = params;
  const [expandedId, setExpandedId] = useState<string | null>('adr-001');
  const [search, setSearch] = useState('');

  const filtered = ADRS.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Decisions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Architecture Decision Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            Capture key architectural choices, their context, and long-term consequences.
          </p>
        </div>
        <button
          type="button"
          className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors self-start sm:self-auto"
        >
          + Record Decision
        </button>
      </header>

      {/* Search + stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none w-44"
            placeholder="Search ADRs..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="text-white font-semibold">{ADRS.length}</span> total &nbsp;·&nbsp;
          <span className="text-emerald-400 font-semibold">{ADRS.filter((a) => a.status === 'accepted').length}</span> accepted &nbsp;·&nbsp;
          <span className="text-blue-400 font-semibold">{ADRS.filter((a) => a.status === 'proposed').length}</span> proposed
        </div>
      </div>

      {/* ADR list */}
      <div className="space-y-4">
        {filtered.map((adr) => {
          const meta = STATUS_META[adr.status];
          const isOpen = expandedId === adr.id;
          return (
            <div key={adr.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {/* Collapsed header */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : adr.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 shrink-0">ADR-{String(adr.number).padStart(3, '0')}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="font-semibold text-white text-sm">{adr.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {adr.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">{t}</span>
                    ))}
                  </div>
                  <span className="text-slate-400 text-xs">{adr.date}</span>
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-semibold">{adr.author}</div>
                  <span className="text-slate-500 text-base">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Context</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{adr.context}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Decision</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{adr.decision}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Consequences</h4>
                    <ul className="space-y-1.5">
                      {adr.consequences.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-slate-500 shrink-0 mt-0.5">→</span>
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-sm">
            No ADRs match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
