import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { C4ContainerBoundaryNodeData } from '@diagramhq/domain';

/**
 * C4ContainerBoundaryNode renders the enclosing container boundary in C4 Component Level 3 view.
 * It frames the components showing that they reside within a specific parent container / application.
 */
export function C4ContainerBoundaryNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4ContainerBoundaryNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Container';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.trim()
    ? nodeData.technology
    : undefined;
  const description = typeof nodeData.description === 'string' ? nodeData.description : undefined;

  return (
    <div
      data-testid="c4-container-boundary"
      className={`w-full h-full p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-950/10 pointer-events-none transition-all ${
        selected ? 'ring-2 ring-emerald-400 border-emerald-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
          {`[Container Boundary: ${label}]`}
        </span>
        {technology && (
          <span className="text-[10px] font-mono text-emerald-300/80 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {`[${technology}]`}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-slate-400/80 italic max-w-md">
          {description}
        </p>
      )}
    </div>
  );
}
