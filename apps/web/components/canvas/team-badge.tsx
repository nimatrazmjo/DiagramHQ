'use client';

import React from 'react';
import type { Team, TeamId } from '@diagramhq/domain';

export interface TeamBadgeProps {
  team: Pick<Team, 'id' | 'name' | 'slug' | 'leadUserId' | 'memberUserIds'>;
  role?: 'primary' | 'backup';
  size?: 'sm' | 'md';
  className?: string;
}

export function TeamBadge({
  team,
  role = 'primary',
  size = 'md',
  className = '',
}: TeamBadgeProps): JSX.Element {
  const isPrimary = role === 'primary';
  const roleColor = isPrimary
    ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      data-testid="team-badge"
      data-team-id={team.id}
      data-team-role={role}
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${roleColor} ${sizeClasses} ${className}`}
    >
      <span className="material-symbols-outlined text-[14px]">groups</span>
      <span className="font-semibold text-white">{team.name}</span>
      <span className="text-[10px] opacity-75 font-mono">
        {`(${isPrimary ? 'Owner' : 'Backup'})`}
      </span>
    </span>
  );
}

export interface OwnershipFilterSelectorProps {
  teams: Team[];
  selectedTeamId: TeamId | 'all';
  onSelectTeam: (teamId: TeamId | 'all') => void;
  includeBackup?: boolean;
  onToggleIncludeBackup?: (includeBackup: boolean) => void;
  className?: string;
}

export function OwnershipFilterSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
  includeBackup = false,
  onToggleIncludeBackup,
  className = '',
}: OwnershipFilterSelectorProps): JSX.Element {
  return (
    <div
      data-testid="ownership-filter-selector"
      className={`flex items-center gap-3 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 shadow-md ${className}`}
    >
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="material-symbols-outlined text-base text-primary-fixed">
          filter_alt
        </span>
        <span className="font-medium text-slate-300">Filter by Owner:</span>
      </div>

      <select
        data-testid="ownership-team-select"
        value={selectedTeamId}
        onChange={(e) => onSelectTeam(e.target.value as TeamId | 'all')}
        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary"
      >
        <option value="all">All Teams</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>

      {onToggleIncludeBackup && selectedTeamId !== 'all' && (
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer ml-1">
          <input
            type="checkbox"
            data-testid="ownership-include-backup-checkbox"
            checked={includeBackup}
            onChange={(e) => onToggleIncludeBackup(e.target.checked)}
            className="rounded bg-slate-950 border-slate-700 text-primary focus:ring-0"
          />
          <span>Include backup</span>
        </label>
      )}
    </div>
  );
}
