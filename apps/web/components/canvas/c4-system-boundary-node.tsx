import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { C4SystemBoundaryNodeData } from '@diagramhq/domain';
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
 * C4SystemBoundaryNode — the translucent system boundary that encloses the apps,
 * stores and queues of a system on the Container (L2) diagram. Rendered the
 * IcePanel way: header top-left (zoom glyph · logo · name), muted subtitle
 * bottom-centre. Non-interactive backdrop (children handle pointer events).
 */
export function C4SystemBoundaryNode({ data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as C4SystemBoundaryNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Software System';
  const technology = typeof (nodeData as Record<string, unknown>).technology === 'string'
    ? ((nodeData as Record<string, unknown>).technology as string)
    : undefined;
  const icon = ((nodeData as Record<string, unknown>).icon as string) || getTechnologyIconPath(technology || label) || undefined;
  const subtitle = technology ? `System  ${technology}` : 'System';

  return (
    <div
      data-testid="c4-system-boundary"
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
