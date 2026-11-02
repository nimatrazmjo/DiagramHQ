import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { C4ContainerBoundaryNodeData } from '@diagramhq/domain';
import { DiagramNodeResizer } from './diagram-node-resizer';
import { getTechnologyIconPath } from '../../lib/icons';

function ZoomGlyph(): JSX.Element {
  return (
    <svg className="w-[18px] h-[18px] text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * C4ContainerBoundaryNode — the translucent container/app boundary that frames
 * the components on the Component (L3) diagram. IcePanel styling: header
 * top-left (zoom glyph · logo · name), muted subtitle bottom-centre.
 */
export function C4ContainerBoundaryNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4ContainerBoundaryNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Container';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.trim() ? nodeData.technology : undefined;
  const icon = ((nodeData as Record<string, unknown>).icon as string) || getTechnologyIconPath(technology || label) || undefined;
  const subtitle = technology ? `App: ${technology}` : 'App';

  return (
    <div
      data-testid="c4-container-boundary"
      style={selected ? { borderColor: '#2BB5E8', boxShadow: '0 0 0 1px #2BB5E8' } : undefined}
      className="w-full h-full min-w-[240px] min-h-[140px] rounded-[10px] border border-white/10 bg-white/[0.015] pointer-events-none relative transition-colors"
    >
      <DiagramNodeResizer isVisible={selected} minWidth={240} minHeight={140} color="#2BB5E8" />
      <div className="absolute top-2 left-2 flex items-center gap-2 max-w-[90%]">
        <ZoomGlyph />
        {icon ? <img src={icon} alt="" width={16} height={16} className="object-contain" /> : null}
        <span className="truncate text-[13px] font-semibold text-[#e7e9ea]">{label}</span>
      </div>
      <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-[#8b9196]">{subtitle}</div>
    </div>
  );
}
