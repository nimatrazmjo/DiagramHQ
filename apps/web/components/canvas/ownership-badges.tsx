import React from 'react';

export interface OwnershipBadgesProps {
  ownershipView?: boolean;
  team?: string;
  owner?: string;
}

const colors = [
  'text-indigo-400 bg-indigo-950/60 border-indigo-900',
  'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-900',
  'text-teal-400 bg-teal-950/60 border-teal-900',
  'text-rose-400 bg-rose-950/60 border-rose-900',
  'text-cyan-400 bg-cyan-950/60 border-cyan-900',
  'text-amber-400 bg-amber-950/60 border-amber-900',
  'text-lime-400 bg-lime-950/60 border-lime-900',
];

function stringToColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colors.length;
}

export function OwnershipBadges(props: OwnershipBadgesProps): JSX.Element | null {
  if (!props.ownershipView) return null;
  if (!props.team && !props.owner) return null;

  const teamColor = props.team ? colors[stringToColorIndex(props.team)] : '';
  
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/50" data-testid="ownership-badges">
      {props.team && (
        <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${teamColor}`} data-testid={`badge-team-${props.team.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Team: {props.team}
        </span>
      )}
      {props.owner && (
        <span className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded" data-testid={`badge-owner-${props.owner.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {props.owner}
        </span>
      )}
    </div>
  );
}
