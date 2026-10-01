'use client';

import React from 'react';

export type ShapeKind =
  | 'system'
  | 'application'
  | 'database'
  | 'queue'
  | 'person'
  | 'component'
  | 'group';

export interface ShapePaletteProps {
  onAddShape: (kind: ShapeKind) => void;
  onOpenTemplates?: () => void;
  onDeleteSelected?: () => void;
  hasSelection?: boolean;
  disabled?: boolean;
  className?: string;
}

const SHAPES: Array<{
  kind: ShapeKind;
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  title: string;
}> = [
  {
    kind: 'system',
    label: 'System',
    shortLabel: 'System',
    icon: '🏢',
    colorClass: 'hover:bg-blue-900/60 hover:text-blue-300 border-blue-500/30 text-blue-400',
    title: 'Add Software System (C4 boundary)',
  },
  {
    kind: 'application',
    label: 'Service',
    shortLabel: 'App',
    icon: '⚡',
    colorClass: 'hover:bg-sky-900/60 hover:text-sky-300 border-sky-500/30 text-sky-400',
    title: 'Add Application / Microservice / API',
  },
  {
    kind: 'database',
    label: 'Database',
    shortLabel: 'DB',
    icon: '🗄️',
    colorClass: 'hover:bg-emerald-900/60 hover:text-emerald-300 border-emerald-500/30 text-emerald-400',
    title: 'Add Database / Persistent Store',
  },
  {
    kind: 'queue',
    label: 'Queue',
    shortLabel: 'Queue',
    icon: '📬',
    colorClass: 'hover:bg-amber-900/60 hover:text-amber-300 border-amber-500/30 text-amber-400',
    title: 'Add Message Queue / Event Bus / Kafka Topic',
  },
  {
    kind: 'person',
    label: 'Actor',
    shortLabel: 'Actor',
    icon: '👤',
    colorClass: 'hover:bg-pink-900/60 hover:text-pink-300 border-pink-500/30 text-pink-400',
    title: 'Add Person / User / External Actor',
  },
  {
    kind: 'component',
    label: 'Component',
    shortLabel: 'Comp',
    icon: '🧩',
    colorClass: 'hover:bg-yellow-900/60 hover:text-yellow-300 border-yellow-500/30 text-yellow-400',
    title: 'Add C4 Internal Component',
  },
  {
    kind: 'group',
    label: 'Group',
    shortLabel: 'Group',
    icon: '▢',
    colorClass: 'hover:bg-slate-800 hover:text-slate-200 border-slate-600/30 text-slate-300',
    title: 'Add Boundary Group / Network Zone',
  },
];

/**
 * ShapePalette renders an interactive node creation bar and template picker
 * for drawing diagrams directly on the canvas without requiring auth.
 */
export function ShapePalette({
  onAddShape,
  onOpenTemplates,
  onDeleteSelected,
  hasSelection = false,
  disabled = false,
  className = '',
}: ShapePaletteProps): JSX.Element {
  return (
    <div
      data-testid="shape-palette"
      className={`flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/95 border border-slate-700/80 shadow-xl backdrop-blur-md text-xs text-slate-200 ${className}`}
    >
      <div className="flex items-center gap-1 pl-1 pr-1.5 text-[11px] font-mono font-medium text-slate-400 select-none">
        <span className="text-slate-500">Insert:</span>
      </div>

      {SHAPES.map((shape) => (
        <button
          key={shape.kind}
          type="button"
          data-testid={`add-${shape.kind}-btn`}
          onClick={() => onAddShape(shape.kind)}
          disabled={disabled}
          title={shape.title}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border bg-slate-950/60 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${shape.colorClass}`}
        >
          <span className="text-xs" aria-hidden="true">
            {shape.icon}
          </span>
          <span className="hidden sm:inline">{shape.label}</span>
          <span className="sm:hidden">{shape.shortLabel}</span>
        </button>
      ))}

      {onOpenTemplates && (
        <>
          <div className="w-px h-5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            data-testid="open-templates-btn"
            onClick={onOpenTemplates}
            disabled={disabled}
            title="Load starter architecture template (13 available)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/40 bg-violet-950/40 hover:bg-violet-900/60 text-violet-300 hover:text-white transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>⊞</span>
            <span>Templates</span>
          </button>
        </>
      )}

      {hasSelection && onDeleteSelected && (
        <>
          <div className="w-px h-5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            data-testid="delete-selected-btn"
            onClick={onDeleteSelected}
            disabled={disabled}
            title="Delete selected objects (Del / Backspace)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>🗑</span>
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
}

export default ShapePalette;
