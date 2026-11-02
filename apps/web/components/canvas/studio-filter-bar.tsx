'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface StudioFilterBarProps {
  activeTags?: string[];
  onSelectTag?: (tag: string | null) => void;
  selectedTag?: string | null;
  technologies?: string[];
  onSelectTechnology?: (tech: string | null) => void;
  selectedTechnology?: string | null;
  statusFilter?: 'all' | 'live' | 'future';
  onSelectStatusFilter?: (status: 'all' | 'live' | 'future') => void;
  teams?: string[];
  onSelectTeam?: (team: string | null) => void;
  selectedTeam?: string | null;
  riskCount?: number;
  onCreateGroup: () => void;
}

export function StudioFilterBar({
  activeTags = ['Frontend', 'Backend', 'Database', 'Auth', 'External', 'Security'],
  onSelectTag,
  selectedTag = null,
  technologies = ['React', 'Next.js', 'Node.js', 'Go', 'PostgreSQL', 'Redis', 'Docker', 'Azure', 'Envoy'],
  onSelectTechnology,
  selectedTechnology = null,
  statusFilter = 'all',
  onSelectStatusFilter,
  teams = ['Platform Team', 'Core Services', 'Frontend Squad', 'Data Engineering'],
  onSelectTeam,
  selectedTeam = null,
  riskCount = 0,
  onCreateGroup,
}: StudioFilterBarProps): JSX.Element {
  const [openDropdown, setOpenDropdown] = useState<'tags' | 'tech' | 'status' | 'teams' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Row 1: X-Ray Filter Glasses (IcePanel signature bottom filters) */}
      <div className="flex items-center gap-1 bg-[#15181c]/95 border border-white/[0.12] rounded-lg shadow-xl backdrop-blur-md p-1 text-xs">
        {/* Tags Filter */}
        <div className="relative">
          <button
            type="button"
            data-testid="filter-tags-btn"
            onClick={() => setOpenDropdown((prev) => (prev === 'tags' ? null : 'tags'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedTag
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold'
                : 'text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
            }`}
          >
            <span>🏷️</span>
            <span>{selectedTag ? `Tag: ${selectedTag}` : 'Tags'}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
          {openDropdown === 'tags' && (
            <div className="absolute bottom-full left-0 mb-1 w-44 rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea]">
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase">Filter by Tag</div>
              <button
                type="button"
                onClick={() => {
                  onSelectTag?.(null);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/[0.08] transition-colors"
              >
                All Tags (Reset)
              </button>
              {activeTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onSelectTag?.(tag === selectedTag ? null : tag);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between hover:bg-white/[0.08] transition-colors ${
                    selectedTag === tag ? 'text-[#2BB5E8] font-bold' : ''
                  }`}
                >
                  <span>{tag}</span>
                  {selectedTag === tag && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Technology Filter */}
        <div className="relative">
          <button
            type="button"
            data-testid="filter-technology-btn"
            onClick={() => setOpenDropdown((prev) => (prev === 'tech' ? null : 'tech'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedTechnology
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold'
                : 'text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
            }`}
          >
            <span>⟨⟩</span>
            <span>{selectedTechnology ? `Tech: ${selectedTechnology}` : 'Technology'}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
          {openDropdown === 'tech' && (
            <div className="absolute bottom-full left-0 mb-1 w-48 max-h-56 overflow-y-auto rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea]">
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase">Filter Technology</div>
              <button
                type="button"
                onClick={() => {
                  onSelectTechnology?.(null);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/[0.08] transition-colors"
              >
                All Tech (Reset)
              </button>
              {technologies.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    onSelectTechnology?.(tech === selectedTechnology ? null : tech);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between hover:bg-white/[0.08] transition-colors ${
                    selectedTechnology === tech ? 'text-[#2BB5E8] font-bold' : ''
                  }`}
                >
                  <span>{tech}</span>
                  {selectedTechnology === tech && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            type="button"
            data-testid="filter-status-btn"
            onClick={() => setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              statusFilter !== 'all'
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold'
                : 'text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
            }`}
          >
            <span>◔</span>
            <span className="capitalize">{statusFilter !== 'all' ? statusFilter : 'Status'}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
          {openDropdown === 'status' && (
            <div className="absolute bottom-full left-0 mb-1 w-36 rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea]">
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter?.('all');
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/[0.08] transition-colors"
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter?.('live');
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-white/[0.08] transition-colors text-emerald-400"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter?.('future');
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-white/[0.08] transition-colors text-purple-400"
              >
                <span className="w-2 h-2 rounded-full border border-purple-400 border-dashed" />
                <span>Future</span>
              </button>
            </div>
          )}
        </div>

        {/* Teams Filter */}
        <div className="relative">
          <button
            type="button"
            data-testid="filter-teams-btn"
            onClick={() => setOpenDropdown((prev) => (prev === 'teams' ? null : 'teams'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedTeam
                ? 'bg-[#2BB5E8]/20 text-[#2BB5E8] border border-[#2BB5E8]/40 font-semibold'
                : 'text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06]'
            }`}
          >
            <span>👥</span>
            <span>{selectedTeam ? selectedTeam : 'Teams'}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
          {openDropdown === 'teams' && (
            <div className="absolute bottom-full left-0 mb-1 w-44 rounded-xl bg-[#15181c] border border-white/[0.12] shadow-2xl p-1 z-50 text-xs text-[#e7e9ea]">
              <div className="px-2 py-1 text-[10px] font-mono text-[#8b9196] uppercase">Filter by Team</div>
              <button
                type="button"
                onClick={() => {
                  onSelectTeam?.(null);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/[0.08] transition-colors"
              >
                All Teams (Reset)
              </button>
              {teams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    onSelectTeam?.(team === selectedTeam ? null : team);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between hover:bg-white/[0.08] transition-colors ${
                    selectedTeam === team ? 'text-[#2BB5E8] font-bold' : ''
                  }`}
                >
                  <span>{team}</span>
                  {selectedTeam === team && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Risk Indicator · + New Group Button */}
      <div className="flex items-center gap-1.5">
        <div
          data-testid="risk-indicator"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#15181c]/90 border border-white/[0.08] text-[11px] text-[#8b9196] font-medium backdrop-blur-md"
        >
          <span>⚠</span>
          <span>Risk</span>
          <span className="font-mono text-white/80">{riskCount}</span>
        </div>

        <button
          type="button"
          data-testid="bottom-bar-new-group-btn"
          onClick={onCreateGroup}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#15181c]/90 hover:bg-white/[0.08] border border-white/[0.12] text-[11px] text-[#2BB5E8] hover:text-[#52c8f2] font-semibold transition-colors backdrop-blur-md shadow-sm"
          title="Create a new group container"
        >
          <span>+</span>
          <span>New group</span>
        </button>
      </div>
    </div>
  );
}
