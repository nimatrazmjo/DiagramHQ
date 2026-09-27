// Object lifecycle state machine for F031

export type LifecycleState = 'future' | 'live' | 'deprecated' | 'removed';

export interface LifecycleTransition {
  from: LifecycleState;
  to: LifecycleState;
  at: string; // ISO timestamp
  by?: string;
  reason?: string;
}

// Valid transitions: future->live, live->deprecated, deprecated->removed, live->removed
const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  future: ['live'],
  live: ['deprecated', 'removed'],
  deprecated: ['removed'],
  removed: [],
};

export function isValidLifecycleTransition(from: LifecycleState, to: LifecycleState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function createLifecycleTransition(
  from: LifecycleState,
  to: LifecycleState,
  by?: string,
  reason?: string,
): LifecycleTransition {
  if (!isValidLifecycleTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
  return { from, to, at: new Date().toISOString(), by, reason };
}

export function getLifecycleBadgeColor(state: LifecycleState | string): string {
  switch (state) {
    case 'future': return 'text-blue-400 bg-blue-950/40 border-blue-800/40';
    case 'live': return 'text-green-400 bg-green-950/40 border-green-800/40';
    case 'deprecated': return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    case 'removed': return 'text-red-400 bg-red-950/40 border-red-800/40';
    default: return 'text-slate-400 bg-slate-800/40 border-slate-700/40';
  }
}

export const LIFECYCLE_STATES: LifecycleState[] = ['future', 'live', 'deprecated', 'removed'];
