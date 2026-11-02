'use client';

import React, { useState } from 'react';

export interface TeamItem {
  id: string;
  name: string;
  lead: string;
  membersCount: number;
  ownedSystems: string[];
}

export const INITIAL_TEAMS: TeamItem[] = [
  {
    id: 'team-platform-core',
    name: 'Platform Core Engineering',
    lead: 'Sarah Connor',
    membersCount: 8,
    ownedSystems: ['SaaS Platform', 'API Gateway'],
  },
  {
    id: 'team-identity-sec',
    name: 'Identity & Security Guild',
    lead: 'Alex Mercer',
    membersCount: 5,
    ownedSystems: ['Auth Service', 'JWT Token Engine'],
  },
  {
    id: 'team-data-infra',
    name: 'Data Platform & SRE',
    lead: 'Marcus Vance',
    membersCount: 6,
    ownedSystems: ['Primary Postgres', 'Redis Cache', 'S3 Blob Storage'],
  },
  {
    id: 'team-frontend-web',
    name: 'Frontend Applications Team',
    lead: 'Elena Rostova',
    membersCount: 7,
    ownedSystems: ['Web App', 'Design System'],
  },
];

export function TeamsPage(): JSX.Element {
  const [teams] = useState<TeamItem[]>(INITIAL_TEAMS);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lead.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      data-testid="model-page-teams"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👥</span>
              <span>Teams & System Ownership</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]">
              {teams.length} teams
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Cross-functional squads and architecture ownership mapping.
          </p>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search teams..."
          className="w-56 px-3 py-1.5 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((team) => (
            <div
              key={team.id}
              data-testid={`team-card-${team.id}`}
              className="p-5 rounded-xl bg-[#121518]/90 border border-white/[0.08] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{team.name}</h3>
                  <div className="text-xs text-[#8b9196] mt-0.5">
                    Lead: <span className="text-slate-300 font-medium">{team.lead}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196]">
                  {team.membersCount} members
                </span>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-[#8b9196] mb-1.5">
                  Owned Systems
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {team.ownedSystems.map((sys) => (
                    <span
                      key={sys}
                      className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-sky-300 font-medium"
                    >
                      {sys}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
