import React from 'react';
import { type NodeProps } from '@xyflow/react';
import type { SystemNodeData, Technology, PersonaMode } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';
import { SecurityBadges } from './security-badges';
import { DataBadges } from './data-badges';
import { OwnershipBadges } from './ownership-badges';
import { TechnologyBadges } from './technology-badges';
import { PersonaBadges } from './persona-badges';
import { FlowBadges } from './flow-badges';
import { useDynamicNodeDimensions } from './node-dimension-utils';
import { IcePanelNodeShell } from './icepanel-node-shell';

function SystemGlyph(): JSX.Element {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

/**
 * SystemNode — IcePanel "Software System" object.
 * Internal systems can drill into their container/app diagram; external systems
 * render with the muted "External system" subtitle.
 */
export function SystemNode({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = (data ?? {}) as unknown as SystemNodeData;
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Software System';
  const isExternal = Boolean(nodeData.external);
  const technology = typeof nodeData.technology === 'string' && nodeData.technology.length > 0 ? (nodeData.technology as string) : undefined;
  const description = typeof nodeData.description === 'string' && nodeData.description.length > 0 ? nodeData.description : undefined;
  const canDrillDown = Boolean(nodeData.canDrillDown ?? !isExternal);
  const systemId = (nodeData.systemId as string) ?? id;
  const status = nodeData.status as string | undefined;
  const domain = typeof nodeData.domain === 'string' && nodeData.domain.length > 0 ? nodeData.domain : undefined;
  const systemType = typeof nodeData.systemType === 'string' && nodeData.systemType.length > 0 ? nodeData.systemType : undefined;

  const handleDrillDown = () => {
    if (typeof nodeData.onDrillDown === 'function') {
      (nodeData.onDrillDown as (id: string) => void)(systemId);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('system:drill-down', { detail: { systemId, level: 2 } }));
    }
  };

  const brandIcon = (nodeData.icon as string) || getTechnologyIconPath(technology || label) || undefined;
  const fontSize = (nodeData.fontSize as number) || (nodeData.labelFontSize as number) || ((nodeData.style as Record<string, unknown>)?.fontSize as number);

  const { cardRef, minHeight, minWidth } = useDynamicNodeDimensions(
    { label, description, fontSize, hasHeader: true, hasFooter: true },
    'system',
    id,
  );

  const critical = Boolean(nodeData.critical || (nodeData as Record<string, unknown>).criticality === 'tier-0');

  const subtitle = isExternal ? 'External System' : technology ? `System: ${technology}` : 'System';

  return (
    <IcePanelNodeShell
      nodeId={id}
      testId={isExternal ? 'external-system-node' : 'system-node'}
      variant="card"
      title={label}
      subtitle={subtitle}
      iconPath={brandIcon}
      fallbackGlyph={<SystemGlyph />}
      selected={selected}
      isEditing={nodeData.isEditing as boolean | undefined}
      onRename={(next) => (typeof nodeData.onRename === 'function' ? (nodeData.onRename as (v: string) => void)(next) : undefined)}
      onDrill={canDrillDown ? handleDrillDown : undefined}
      drillTestId="system-drill-down-btn"
      status={status}
      dashed={isExternal}
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
          <span className="sr-only">
            {isExternal ? (systemType ? `[${systemType}]` : '') : 'Internal'}
            {!isExternal && systemType ? `[Type: ${systemType}]` : ''}
            {domain ? `[Domain: ${domain}]` : ''}
            {critical ? '[Tier 0]' : ''}
            {description ? description : ''}
          </span>
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
