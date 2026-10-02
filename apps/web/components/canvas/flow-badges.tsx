import React from 'react';

export interface FlowBadgesProps {
  flowView?: boolean;
  isInFlow?: boolean;
  flowStepNumbers?: number[];
  isActiveStepParticipant?: boolean;
}

export function FlowBadges(props: FlowBadgesProps): JSX.Element | null {
  if (!props.flowView || !props.isInFlow) return null;

  const numbers = props.flowStepNumbers ?? [];
  if (numbers.length === 0) return null;

  const label =
    numbers.length === 1
      ? `Step #${numbers[0]}`
      : `Steps: ${numbers.map((n) => `#${n}`).join(', ')}`;

  const activeStyles = props.isActiveStepParticipant
    ? 'text-cyan-200 bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/50 shadow-md shadow-cyan-500/40 animate-pulse'
    : 'text-sky-300 bg-sky-950/80 border-sky-600/70 shadow-sm shadow-sky-500/20';

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-sky-800/40"
      data-testid="flow-badges"
    >
      <span
        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${activeStyles}`}
        data-testid="badge-flow-step"
      >
        <svg
          className="w-3 h-3 text-sky-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="uppercase tracking-wider">{label}</span>
      </span>
    </div>
  );
}
