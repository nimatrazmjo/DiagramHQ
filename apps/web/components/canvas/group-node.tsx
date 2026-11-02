import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { GroupNodeData } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function GroupGlyph(): JSX.Element {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 2" />
    </svg>
  );
}

/**
 * GroupNode — IcePanel "Group" boundary (e.g. a deployment / Docker container
 * group) that visually contains child objects.
 */
export function GroupNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as GroupNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Group';
  const groupKind = typeof nodeData.groupKind === 'string' && (nodeData.groupKind as string).length > 0 ? (nodeData.groupKind as string) : 'group';
  const technology = typeof (nodeData as Record<string, unknown>).technology === 'string' && ((nodeData as Record<string, unknown>).technology as string).length > 0
    ? ((nodeData as Record<string, unknown>).technology as string)
    : undefined;
  const status = (nodeData as Record<string, unknown>).status as string | undefined;
  const brandIcon = ((nodeData as Record<string, unknown>).icon as string) || getTechnologyIconPath(technology || groupKind);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, kind: groupKind, hasHeader: true, hasFooter: false, paddingY: 32 },
    'group',
    id,
  );

  const techLabel = technology || (groupKind !== 'group' ? groupKind : undefined);
  const subtitle = techLabel ? `Group: ${techLabel}` : 'Group';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="group-node"
      variant="boundary"
      boundaryUppercase
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon || undefined}
      fallbackGlyph={<GroupGlyph />}
      selected={selected}
      isEditing={Boolean(nodeData.isEditing)}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      status={status}
      minWidth={minWidth}
      minHeight={minHeight}
      cardRef={cardRef}
      style={nodeData.style as React.CSSProperties}
    />
  );
}
