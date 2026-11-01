'use client';

import React from 'react';

export interface QuickInsertHandleProps {
  nodeId: string;
  selected?: boolean;
  color?: string;
  title?: string;
  className?: string;
}

/**
 * Quick-insert handle button positioned at the node's right edge.
 *
 * When hovered or when the node is selected, renders a circular plus handle (+)
 * matching the DiagramHQ IcePanel interaction model. Clicking it automatically
 * duplicates the node type and connects it via an outgoing relationship.
 */
export function QuickInsertHandle({
  nodeId,
  selected = false,
  color = '#38bdf8',
  title = 'Insert same object and connect (+)',
  className = '',
}: QuickInsertHandleProps): JSX.Element {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('canvas:quick-connect-insert', {
          detail: {
            sourceNodeId: nodeId,
            direction: 'right',
          },
        }),
      );
    }
  };

  return (
    <div
      data-testid="quick-insert-handle"
      className={`absolute -right-6 top-1/2 -translate-y-1/2 z-20 transition-all duration-150 ${
        selected
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto scale-90'
      } ${className}`}
    >
      <button
        type="button"
        data-testid="quick-insert-btn"
        onClick={handleClick}
        title={title}
        aria-label="Insert same object and connect"
        className="w-5 h-5 rounded-full bg-sky-400 hover:bg-sky-300 active:scale-95 text-slate-950 flex items-center justify-center shadow-md border border-slate-950 transition-all cursor-pointer"
        style={{ backgroundColor: color }}
      >
        <svg
          className="w-3 h-3 stroke-[2.8]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
