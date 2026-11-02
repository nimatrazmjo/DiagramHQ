import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { ApplicationNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function AppGlyph(): JSX.Element {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

/**
 * AppNode — IcePanel "App" (container) object. Drills into its component diagram.
 */
export function AppNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as ApplicationNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Application';
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0 ? (nodeData.technology as string) : undefined;
  const runtime = typeof nodeData.runtime === 'string' && nodeData.runtime.length > 0 ? (nodeData.runtime as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const canDrillDown = Boolean(nodeData.canDrillDown);
  const applicationId = (nodeData.applicationId as string) ?? id;
  const status = nodeData.status as string | undefined;

  const handleDrillDown = () => {
    if (typeof nodeData.onDrillDown === 'function') {
      (nodeData.onDrillDown as (id: string) => void)(applicationId);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('application:drill-down', { detail: { applicationId, level: 3 } }));
    }
  };

  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(technology || runtime || label) || undefined;
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, technology, runtime, fontSize, hasHeader: true, hasFooter: true },
    'app',
    id,
  );

  const techLabel = technology || runtime;
  const subtitle = techLabel ? `App: ${techLabel}` : 'App';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId="app-node"
      variant="card"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon}
      fallbackGlyph={<AppGlyph />}
      selected={selected}
      isEditing={Boolean(nodeData.isEditing)}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      onDrill={canDrillDown ? handleDrillDown : undefined}
      drillTestId="app-drill-down-btn"
      status={status}
      minWidth={minWidth}
      minHeight={minHeight}
      cardRef={cardRef}
      style={nodeData.style as React.CSSProperties}
      fontSize={fontSize}
      dim={Boolean(nodeData.flowView && !nodeData.isInFlow)}
      highlight={Boolean(nodeData.flowView && nodeData.isInFlow)}
      onDoubleClick={canDrillDown ? handleDrillDown : undefined}
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
