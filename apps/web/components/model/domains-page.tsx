'use client';

import React, { useState } from 'react';
import type { CanvasNode } from '@diagramhq/domain';

export interface DomainItem {
  id: string;
  name: string;
  description: string;
  color: string;
  boundedContexts: string[];
}

export const INITIAL_DOMAINS: DomainItem[] = [
  {
    id: 'core-platform',
    name: 'Core Platform',
    description: 'Central orchestration, API gateways, and user-facing SaaS workflows',
    color: '#0ea5e9',
    boundedContexts: ['API Gateway', 'Web Application', 'Client SDKs'],
  },
  {
    id: 'identity-access',
    name: 'Identity & Access',
    description: 'Authentication, authorization, token lifecycle, and credential security',
    color: '#a855f7',
    boundedContexts: ['Auth Service', 'JWT Token Engine', 'User Credential Vault'],
  },
  {
    id: 'payments-billing',
    name: 'Payments & Billing',
    description: 'PCI-compliant card processing, subscriptions, and recurring ledger',
    color: '#10b981',
    boundedContexts: ['Payment Gateway', 'Stripe Webhook Handler', 'Invoice Generator'],
  },
  {
    id: 'data-storage',
    name: 'Data & Storage',
    description: 'Relational persistence, cache layers, object stores, and event streams',
    color: '#f59e0b',
    boundedContexts: ['Primary PostgreSQL', 'Redis Cache Cluster', 'S3 Blob Storage'],
  },
  {
    id: 'external-integrations',
    name: 'External Integrations',
    description: 'Third-party notification vendors and webhook dispatchers',
    color: '#ec4899',
    boundedContexts: ['SES / SMTP Gateway', 'Slack Bot Dispatcher'],
  },
];

export function DomainsPage({ nodes = [] }: { nodes?: CanvasNode[] }): JSX.Element {
  const [domains, setDomains] = useState<DomainItem[]>(INITIAL_DOMAINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');
  const [newDomainColor, setNewDomainColor] = useState('#0ea5e9');

  const filtered = domains.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    const newDomain: DomainItem = {
      id: newDomainName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: newDomainName.trim(),
      description: newDomainDesc.trim() || 'Custom DDD bounded domain',
      color: newDomainColor,
      boundedContexts: ['Default Context'],
    };
    setDomains((prev) => [newDomain, ...prev]);
    setNewDomainName('');
    setNewDomainDesc('');
    setIsCreating(false);
  };

  return (
    <div
      data-testid="model-page-domains"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🌐</span>
              <span>Domains & Bounded Contexts</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {domains.length} domains
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Domain-Driven Design (DDD) partitions and bounded contexts organizing architectural objects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            data-testid="domains-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domains..."
            className="w-56 px-3 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
          />
          <button
            type="button"
            data-testid="create-domain-btn"
            onClick={() => setIsCreating(true)}
            className="px-3 py-1.5 rounded-lg bg-[#2BB5E8] hover:bg-[#2294bd] text-slate-950 font-bold text-xs"
          >
            + New Domain
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div data-testid="model-domains-list" className="grid grid-cols-2 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              data-testid={`domain-card-${d.id}`}
              className="p-5 rounded-xl bg-[#121518]/90 border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: d.color }}
                  />
                  <h3 className="font-bold text-white text-sm">{d.name}</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#8b9196]">
                  {d.boundedContexts.length} contexts
                </span>
              </div>

              <p className="text-xs text-[#8b9196] leading-relaxed">
                {d.description}
              </p>

              <div>
                <div className="text-[10px] font-mono uppercase text-[#8b9196] mb-1.5">
                  Bounded Contexts
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.boundedContexts.map((ctx) => (
                    <span
                      key={ctx}
                      className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300"
                    >
                      {ctx}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181c] border border-white/[0.15] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-white text-base mb-3">Create DDD Domain</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Name</label>
                <input
                  type="text"
                  required
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="e.g. Orders & Fulfillment"
                  className="w-full px-3 py-2 rounded-lg bg-[#121518] border border-white/[0.12] text-xs text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDomainDesc}
                  onChange={(e) => setNewDomainDesc(e.target.value)}
                  placeholder="Domain responsibilities and ubiquitous language boundaries..."
                  className="w-full px-3 py-2 rounded-lg bg-[#121518] border border-white/[0.12] text-xs text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#2BB5E8] text-slate-950 font-bold text-xs"
                >
                  Create Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
