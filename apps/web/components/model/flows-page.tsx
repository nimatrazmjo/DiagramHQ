'use client';

import React, { useState } from 'react';

export interface FlowItem {
  id: string;
  name: string;
  description: string;
  stepsCount: number;
  trigger: string;
}

export const INITIAL_FLOWS: FlowItem[] = [
  {
    id: 'flow-auth-login',
    name: 'User Login & RS256 Token Issuance',
    description: 'End User authenticates via Web App, API Gateway delegates to Auth Service, returns signed JWT.',
    stepsCount: 4,
    trigger: 'POST /auth/login',
  },
  {
    id: 'flow-payment-checkout',
    name: 'Checkout & Stripe Payment Processing',
    description: 'Shopping cart checkout invoking Billing Service with mTLS and database ledger write.',
    stepsCount: 5,
    trigger: 'POST /api/v1/checkout',
  },
  {
    id: 'flow-user-registration',
    name: 'New User Registration & Welcome Email',
    description: 'Account creation in Postgres database followed by async welcome email via SES/SMTP.',
    stepsCount: 3,
    trigger: 'User Signup Event',
  },
];

export function FlowsPage({ onTriggerPlay }: { onTriggerPlay?: (flowId: string) => void }): JSX.Element {
  const [flows] = useState<FlowItem[]>(INITIAL_FLOWS);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = flows.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      data-testid="model-page-flows"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span>
              <span>Architecture Flows</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {flows.length} flows
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Step-by-step trace scenarios and message sequence flows across model connections.
          </p>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search flows..."
          className="w-56 px-3 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((flow) => (
            <div
              key={flow.id}
              data-testid={`flow-card-${flow.id}`}
              className="p-5 rounded-xl bg-[#121518]/90 border border-white/[0.08] hover:border-sky-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{flow.name}</h3>
                  <span className="text-[10px] font-mono text-sky-400 mt-0.5 block">
                    Trigger: {flow.trigger}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {flow.stepsCount} steps
                </span>
              </div>

              <p className="text-xs text-[#8b9196] leading-relaxed">
                {flow.description}
              </p>

              {onTriggerPlay && (
                <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                  <button
                    type="button"
                    onClick={() => onTriggerPlay(flow.id)}
                    className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>▶ Play Trace</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
