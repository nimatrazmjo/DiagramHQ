import React from 'react';
import type { PersonaMode } from '@diagramhq/domain';

export interface PersonaBadgesProps {
  personaView?: boolean;
  personaMode?: PersonaMode;
}

const PERSONA_CONFIG: Record<
  PersonaMode,
  { label: string; color: string; icon: JSX.Element }
> = {
  architect: {
    label: 'Architect',
    color: 'text-blue-400 bg-blue-950/60 border-blue-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="8.5" x2="22" y2="8.5" />
        <line x1="2" y1="15.5" x2="22" y2="15.5" />
      </svg>
    ),
  },
  developer: {
    label: 'Developer',
    color: 'text-emerald-400 bg-emerald-950/60 border-emerald-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  security: {
    label: 'Security',
    color: 'text-rose-400 bg-rose-950/60 border-rose-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  sre: {
    label: 'SRE',
    color: 'text-amber-400 bg-amber-950/60 border-amber-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  data: {
    label: 'Data',
    color: 'text-cyan-400 bg-cyan-950/60 border-cyan-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  product: {
    label: 'Product',
    color: 'text-violet-400 bg-violet-950/60 border-violet-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  executive: {
    label: 'Executive',
    color: 'text-yellow-400 bg-yellow-950/60 border-yellow-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v18H3zM3 9h18M9 21V9" />
      </svg>
    ),
  },
  auditor: {
    label: 'Auditor',
    color: 'text-orange-400 bg-orange-950/60 border-orange-900',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
};

/**
 * PersonaBadges — renders a persona-mode indicator badge on a canvas node (F115).
 * Visible only when personaView is true. Displays the active persona label + icon.
 */
export function PersonaBadges(props: PersonaBadgesProps): JSX.Element | null {
  if (!props.personaView) return null;
  if (!props.personaMode) return null;

  const config = PERSONA_CONFIG[props.personaMode];
  if (!config) return null;

  return (
    <div
      className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/50"
      data-testid="persona-badges"
    >
      <span
        className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${config.color}`}
        data-testid={`badge-persona-${props.personaMode}`}
      >
        {config.icon}
        {config.label}
      </span>
    </div>
  );
}
