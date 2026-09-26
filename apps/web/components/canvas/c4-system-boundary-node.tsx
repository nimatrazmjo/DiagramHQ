import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { C4SystemBoundaryNodeData } from '@diagramhq/domain';

/**
 * C4SystemBoundaryNode renders the enclosing system boundary in C4 Container Level 2 view.
 * It provides context that the contained apps, services, databases, and queues belong to this system.
 */
export function C4SystemBoundaryNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4SystemBoundaryNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Software System';
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;

  return (
    <div
      data-testid="c4-system-boundary"
      className={`w-full h-full p-4 rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-950/10 pointer-events-none transition-all ${
        selected ? 'ring-2 ring-blue-400 border-blue-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
          {`[System Boundary: ${label}]`}
        </span>
      </div>
      {description && (
        <p className="text-xs text-slate-400/80 italic max-w-md">
          {description}
        </p>
      )}
    </div>
  );
}
