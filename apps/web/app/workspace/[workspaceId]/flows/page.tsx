'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ── Flows / Trace Sequences Page ─────────────────────────────────────────── */

type FlowStatus = 'passing' | 'failing' | 'draft';

interface FlowStep {
  from: string;
  to: string;
  label: string;
  protocol: string;
}

interface Flow {
  id: string;
  name: string;
  description: string;
  status: FlowStatus;
  steps: FlowStep[];
  tags: string[];
  lastRun: string;
  duration: string;
}

const FLOWS: Flow[] = [
  {
    id: 'flow-auth',
    name: 'Customer Login & Token Issuance',
    description: 'End-to-end trace of a customer authenticating with username/password, receiving a JWT, and persisting the session.',
    status: 'passing',
    lastRun: '2 min ago',
    duration: '48ms',
    tags: ['Auth', 'Happy Path', 'OAuth2'],
    steps: [
      { from: 'End User', to: 'Customer Web App', label: 'POST /login', protocol: 'HTTPS' },
      { from: 'Customer Web App', to: 'Edge API Gateway', label: 'POST /api/v1/auth/login', protocol: 'HTTPS / REST' },
      { from: 'Edge API Gateway', to: 'Auth Service', label: 'AuthenticateUser()', protocol: 'gRPC / TLS' },
      { from: 'Auth Service', to: 'Postgres Database', label: 'SELECT user WHERE email=?', protocol: 'TCP 5432' },
      { from: 'Auth Service', to: 'Edge API Gateway', label: 'JWT + refresh_token', protocol: 'gRPC / TLS' },
      { from: 'Edge API Gateway', to: 'Customer Web App', label: '200 { access_token, expires_in }', protocol: 'HTTPS / REST' },
    ],
  },
  {
    id: 'flow-checkout',
    name: 'Payment Checkout & Settlement',
    description: 'Full checkout flow: token verification, payment initiation, Stripe charge, and ledger write-back.',
    status: 'passing',
    lastRun: '5 min ago',
    duration: '230ms',
    tags: ['Payments', 'Stripe', 'PCI-DSS'],
    steps: [
      { from: 'Customer Web App', to: 'Edge API Gateway', label: 'POST /api/v1/checkout', protocol: 'HTTPS' },
      { from: 'Edge API Gateway', to: 'Auth Service', label: 'VerifyToken(jwt)', protocol: 'gRPC / TLS' },
      { from: 'Edge API Gateway', to: 'Payment Gateway System', label: 'InitiatePayment()', protocol: 'gRPC' },
      { from: 'Payment Gateway System', to: 'Stripe Billing', label: 'POST /v1/charges', protocol: 'mTLS REST' },
      { from: 'Payment Gateway System', to: 'Postgres Database', label: 'INSERT ledger_entries', protocol: 'TCP 5432' },
    ],
  },
  {
    id: 'flow-session-refresh',
    name: 'Silent Token Refresh',
    description: 'Background token refresh before session expiry via rotating refresh tokens.',
    status: 'draft',
    lastRun: 'Never',
    duration: '—',
    tags: ['Auth', 'Session'],
    steps: [
      { from: 'Customer Web App', to: 'Edge API Gateway', label: 'POST /api/v1/auth/refresh', protocol: 'HTTPS' },
      { from: 'Edge API Gateway', to: 'Auth Service', label: 'RefreshToken(refresh_token)', protocol: 'gRPC / TLS' },
      { from: 'Auth Service', to: 'Cache Cluster', label: 'GET session:{token_hash}', protocol: 'TCP 6379' },
      { from: 'Auth Service', to: 'Edge API Gateway', label: 'new_access_token', protocol: 'gRPC / TLS' },
    ],
  },
];

const STATUS_META: Record<FlowStatus, { label: string; bg: string; color: string; dot: string }> = {
  passing: { label: 'Passing', bg: 'rgba(0,105,71,0.15)', color: '#006947', dot: '#006947' },
  failing: { label: 'Failing', bg: 'rgba(186,26,26,0.12)', color: '#ba1a1a', dot: '#ba1a1a' },
  draft:   { label: 'Draft',   bg: 'rgba(112,120,129,0.15)', color: '#707881', dot: '#707881' },
};

const PROTOCOL_COLORS: Record<string, string> = {
  'HTTPS': '#006194', 'HTTPS / REST': '#006194', 'gRPC / TLS': '#4648d4',
  'gRPC': '#4648d4', 'TCP 5432': '#006947', 'TCP 6379': '#d97706', 'mTLS REST': '#707881',
};

interface FlowsPageProps {
  params: { workspaceId: string };
}

export default function FlowsPage({ params }: FlowsPageProps) {
  const { workspaceId } = params;
  const [expandedId, setExpandedId] = useState<string | null>('flow-auth');
  const [search, setSearch] = useState('');

  const filtered = FLOWS.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Flows</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Trace Flows</h1>
          <p className="text-sm text-slate-400 mt-1">End-to-end interaction sequences and message traces across your architecture.</p>
        </div>
        <button type="button" className="px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors self-start sm:self-auto">
          + Create Flow
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
            placeholder="Search flows..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="text-white font-semibold">{FLOWS.length}</span> total &nbsp;·&nbsp;
          <span className="text-emerald-400 font-semibold">{FLOWS.filter((f) => f.status === 'passing').length}</span> passing &nbsp;·&nbsp;
          <span className="text-slate-400 font-semibold">{FLOWS.filter((f) => f.status === 'draft').length}</span> draft
        </div>
      </div>

      {/* Flow list */}
      <div className="space-y-4">
        {filtered.map((flow) => {
          const meta = STATUS_META[flow.status];
          const isOpen = expandedId === flow.id;
          return (
            <div key={flow.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : flow.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.dot }} />
                    {meta.label}
                  </span>
                  <span className="font-semibold text-white text-sm">{flow.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {flow.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">{t}</span>
                    ))}
                  </div>
                  <span className="text-slate-500 text-xs font-mono">{flow.steps.length} steps</span>
                  <span className="text-slate-500 text-xs">{flow.lastRun}</span>
                  {flow.duration !== '—' && <span className="text-emerald-400 text-xs font-mono">{flow.duration}</span>}
                  <span className="text-slate-500 text-base">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded: sequence diagram */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-800">
                  <p className="text-sm text-slate-400 mt-4 mb-5 leading-relaxed">{flow.description}</p>
                  {/* Step timeline */}
                  <div className="space-y-2">
                    {flow.steps.map((step, i) => {
                      const pColor = PROTOCOL_COLORS[step.protocol] ?? '#707881';
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-slate-600 w-5 shrink-0 text-right">{i + 1}</span>
                          <div className="flex items-center gap-2 flex-1 bg-slate-950/60 px-3 py-2 rounded-lg">
                            <span className="text-xs font-medium text-slate-300 min-w-[120px] shrink-0">{step.from}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 h-px border-t border-dashed border-slate-700" />
                              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{ color: pColor, background: `${pColor}15` }}>
                                {step.protocol}
                              </span>
                              <div className="flex-1 h-px border-t border-dashed border-slate-700" />
                              <span className="text-slate-500 text-sm">→</span>
                            </div>
                            <span className="text-xs font-medium text-slate-300 min-w-[120px] shrink-0 text-right">{step.to}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono max-w-[160px] truncate shrink-0">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-sm">No flows match "{search}"</div>
        )}
      </div>
    </div>
  );
}
