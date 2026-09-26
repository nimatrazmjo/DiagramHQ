'use client';

import React, { useState } from 'react';
import type { LayoutEngineName } from '@diagramhq/domain';

export interface LayoutMenuProps {
  engines: LayoutEngineName[];
  onApply: (engine: LayoutEngineName) => void;
  disabled?: boolean;
}

const engineLabels: Partial<Record<LayoutEngineName, string>> = {
  grid: 'Grid',
  radial: 'Radial',
  forceDirected: 'Force-Directed',
  hierarchical: 'Hierarchical',
  tree: 'Tree',
  layered: 'Layered',
  LR: 'Left → Right',
  TB: 'Top → Bottom',
};

/**
 * Auto-layout menu (F015): lists every registered layout engine and applies
 * the chosen one to the whole graph on click. Always available (not gated
 * by selection) — re-layout is an explicit, whole-graph action; manual
 * positions are left untouched until this is used.
 */
export function LayoutMenu({ engines, onApply, disabled = false }: LayoutMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div data-testid="layout-menu" className="relative">
      <button
        type="button"
        data-testid="layout-menu-toggle"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        title="Auto-layout"
        className="px-2 h-7 flex items-center justify-center gap-1 rounded bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ⇄ Layout ▾
      </button>
      {isOpen && (
        <div
          data-testid="layout-menu-list"
          className="absolute bottom-full left-0 mb-1 flex flex-col gap-0.5 p-1 rounded-md bg-slate-900/95 border border-slate-700/80 shadow-md backdrop-blur-sm min-w-[160px] z-10"
        >
          {engines.map((engine) => (
            <button
              key={engine}
              type="button"
              data-testid={`layout-option-${engine}`}
              onClick={() => {
                onApply(engine);
                setIsOpen(false);
              }}
              className="px-2 py-1.5 text-left rounded text-xs text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {engineLabels[engine] ?? engine}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LayoutMenu;
