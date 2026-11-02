import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { ComponentNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function ComponentGlyph(): JSX.Element {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}

/**
 * ComponentNode — IcePanel "Component" object (inside a container's diagram).
 */
export function ComponentNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as ComponentNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Component';
  const rec = nodeData as unknown as Record<string, unknown>;
  const technology = typeof rec.technology === 'string' && (rec.technology as string).length > 0 ? (rec.technology as string) : undefined;
  const componentType = typeof rec.componentType === 'string' && (rec.componentType as string).length > 0 ? (rec.componentType as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const status = nodeData.status as string | undefined;

  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(technology || componentType || label) || undefined;
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, technology, fontSize, hasHeader: true, hasFooter: true },
    'component',
    id,
  );

  const subtitle = technology ? `Component: ${technology}` : 'Component';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="component-node"
      variant="card"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon}
      fallbackGlyph={<ComponentGlyph />}
      selected={selected}
      isEditing={nodeData.isEditing as boolean | undefined}
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
        <>
          <SecurityBadges {...(nodeData as unknown as React.ComponentProps<typeof SecurityBadges>)} />
          <DataBadges {...(nodeData as unknown as React.ComponentProps<typeof DataBadges>)} />
          <OwnershipBadges {...(nodeData as unknown as React.ComponentProps<typeof OwnershipBadges>)} />
          <TechnologyBadges technologyView={nodeData.technologyView as boolean | undefined} technologies={nodeData.technologies as Technology[] | undefined} />
          <PersonaBadges personaView={nodeData.personaView as boolean | undefined} personaMode={nodeData.personaMode as PersonaMode | undefined} />
          <FlowBadges
            flowView={nodeData.flowView as boolean | undefined}
            isInFlow={nodeData.isInFlow as boolean | undefined}
            flowStepNumbers={nodeData.flowStepNumbers as number[] | undefined}
            isActiveStepParticipant={nodeData.isActiveStepParticipant as boolean | undefined}
          />
        </>
      }
    />
  );
}
