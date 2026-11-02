import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

/**
 * PersonNode — IcePanel "Actor" object (human / external user).
 */
export function PersonNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as PersonNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Actor';
  const role = typeof nodeData.role === 'string' && nodeData.role.length > 0 ? (nodeData.role as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const isExternal = Boolean(nodeData.external);
  const status = nodeData.status as string | undefined;
  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(role) || getTechnologyIconPath(label);
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, status: role, fontSize, hasHeader: true, hasFooter: true, paddingY: 28 },
    'person',
    id,
  );

  return (
    <IcePanelNodeShell
      nodeId={(nodeData.id as string) ?? id}
      testId="person-node"
      variant="actor"
      title={label}
      subtitle={isExternal ? 'External actor' : 'Actor'}
      iconPath={brandIcon || undefined}
      selected={selected}
      isEditing={Boolean(nodeData.isEditing)}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      status={status}
      minWidth={minWidth}
      minHeight={minHeight}
      cardRef={cardRef}
      style={nodeData.style as React.CSSProperties}
      fontSize={fontSize}
      dim={Boolean(nodeData.flowView && !nodeData.isInFlow)}
      highlight={Boolean(nodeData.flowView && nodeData.isInFlow)}
      overlays={
        <FlowBadges
          flowView={nodeData.flowView as boolean | undefined}
          isInFlow={nodeData.isInFlow as boolean | undefined}
          flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
          isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
        />
      }
    />
  );
}
