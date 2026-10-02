'use client';

import React, { useState, useRef, useEffect } from 'react';

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
 * ShapePalette renders an interactive node creation dropdown and template picker
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      data-testid="shape-palette"
      className={`flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/95 border border-slate-700/80 shadow-xl backdrop-blur-md text-xs text-slate-200 ${className}`}
    >
      {/* Insert Dropdown Container */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          data-testid="insert-dropdown-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled}
          title="Insert object or service into diagram"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium text-xs transition-all ${
            isOpen
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/30'
              : 'bg-slate-950/70 border-slate-700/80 text-slate-200 hover:border-slate-500 hover:text-white hover:bg-slate-800/80'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span className="text-sky-400 font-bold text-sm leading-none">+</span>
          <span>Insert</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-400' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        <div
          style={{ display: isOpen ? 'block' : 'none' }}
          className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-slate-900/98 border border-slate-700/90 shadow-2xl backdrop-blur-xl p-1.5 z-50"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800 mb-1 flex items-center justify-between select-none">
            <span>Insert Object</span>
            <span className="text-[9px] text-slate-500">7 types</span>
          </div>

          <div className="flex flex-col gap-0.5">
            {SHAPES.map((shape) => (
              <button
                key={shape.kind}
                type="button"
                data-testid={`add-${shape.kind}-btn`}
                onClick={() => {
                  onAddShape(shape.kind);
                  setIsOpen(false);
                }}
                disabled={disabled}
                title={shape.title}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-slate-800/90 text-slate-200 hover:text-white group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="w-6 h-6 rounded-md bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0">
                  {shape.icon}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-100 group-hover:text-sky-300">
                      {shape.label}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                      {shape.shortLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {shape.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

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
