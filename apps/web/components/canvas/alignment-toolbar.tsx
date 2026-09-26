'use client';

import React from 'react';
import type { AlignAxis } from '@diagramhq/domain';

export interface AlignmentToolbarProps {
  onAlign: (axis: AlignAxis) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  canDistribute: boolean;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

const alignButtons: Array<{ axis: AlignAxis; label: string; title: string }> = [
  { axis: 'left', label: '⊢', title: 'Align Left' },
  { axis: 'centerH', label: '⊣⊢', title: 'Align Center (Horizontal)' },
  { axis: 'right', label: '⊣', title: 'Align Right' },
  { axis: 'top', label: '⊤', title: 'Align Top' },
  { axis: 'centerV', label: '⊥⊤', title: 'Align Center (Vertical)' },
  { axis: 'bottom', label: '⊥', title: 'Align Bottom' },
];

/**
 * Alignment + distribution + snap-to-grid toolbar, shown when 2+ canvas
 * objects are selected (F014).
 */
export function AlignmentToolbar({
  onAlign,
  onDistribute,
  canDistribute,
  snapEnabled,
  onToggleSnap,
}: AlignmentToolbarProps): JSX.Element {
  return (
    <div
      data-testid="alignment-toolbar"
      className="flex items-center gap-1 p-1 rounded-md bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs text-slate-200"
    >
      {alignButtons.map(({ axis, label, title }) => (
        <button
          key={axis}
          type="button"
          data-testid={`align-${axis}-btn`}
          onClick={() => onAlign(axis)}
          title={title}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          {label}
        </button>
      ))}

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      <button
        type="button"
        data-testid="distribute-horizontal-btn"
        onClick={() => onDistribute('horizontal')}
        disabled={!canDistribute}
        title="Distribute Horizontally"
        className="px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 hover:text-white"
      >
        ↔ Dist.
      </button>
      <button
        type="button"
        data-testid="distribute-vertical-btn"
        onClick={() => onDistribute('vertical')}
        disabled={!canDistribute}
        title="Distribute Vertically"
        className="px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 hover:text-white"
      >
        ↕ Dist.
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      <button
        type="button"
        data-testid="snap-to-grid-btn"
        onClick={onToggleSnap}
        title="Toggle Snap to Grid"
        className={`px-2 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
          snapEnabled
            ? 'bg-violet-600 hover:bg-violet-700 text-white border border-violet-500'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
        }`}
      >
        {snapEnabled ? '✦ SNAP' : '⌗ Snap'}
      </button>
    </div>
  );
}

export default AlignmentToolbar;
