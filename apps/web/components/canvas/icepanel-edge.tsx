import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

/**
 * IcePanelEdge renders a connection edge matching IcePanel's visual design.
 * Features:
 * - Smooth step orthogonal path with subtle glow and directional arrow
 * - Centered pill badge displaying Protocol badge and Action description
 * - Clickable selection ring with interactive styling
 */
export function IcePanelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
  selected,
}: EdgeProps): JSX.Element {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const edgeData = (data ?? {}) as Record<string, unknown>;
  const rawProtocol = (edgeData.protocol as string) || (edgeData.kind as string);
  const rawDescription = (edgeData.description as string) || (edgeData.label as string);

  // Parse label if formatted as "Protocol: Description" or similar
  let protocol: string | undefined = rawProtocol || undefined;
  let description: string | undefined = rawDescription || undefined;
  if (!protocol && typeof label === 'string' && label.includes(':')) {
    const parts = label.split(':');
    protocol = parts[0]?.trim() || undefined;
    description = parts.slice(1).join(':').trim() || undefined;
  } else if (!description && typeof label === 'string') {
    description = label;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: selected ? '#38bdf8' : (style.stroke as string) || '#64748b',
          strokeWidth: selected ? 2.5 : (style.strokeWidth as number) || 1.75,
          filter: selected ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))' : undefined,
        }}
        markerEnd={markerEnd}
      />
      {(protocol || description) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nopan nodrag flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-sans border backdrop-blur-md shadow-lg select-none cursor-pointer transition-all ${
              selected
                ? 'bg-slate-900 border-sky-400 text-sky-200 ring-2 ring-sky-500/40 shadow-sky-500/20 scale-105'
                : 'bg-slate-900/95 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            {protocol && (
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[9px] font-semibold uppercase tracking-wider">
                {protocol}
              </span>
            )}
            {description && (
              <span className="truncate max-w-[150px] text-slate-200 font-medium">
                {description}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
