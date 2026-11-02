'use client';

import React, { useState } from 'react';
import type { CanvasNode, CanvasEdge, ModelObject } from '@diagramhq/domain';
import { ModelNavRail, type ModelSection } from './model-nav-rail';
import { HomePage } from './home-page';
import { DomainsPage } from './domains-page';
import { ObjectsPage } from './objects-page';
import { FlowsPage } from './flows-page';
import { ConnectionsPage } from './connections-page';
import { DependenciesPage } from './dependencies-page';
import { TeamsPage } from './teams-page';
import { TechnologiesPage } from './technologies-page';
import { HistoryPage } from './history-page';

export interface ModelViewLayoutProps {
  initialSection?: ModelSection;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  allModelObjects?: ModelObject[];
  onSelectNode?: (nodeId: string) => void;
  onSwitchToDiagram: () => void;
  onTriggerFlowPlay?: (flowId: string) => void;
}

export function ModelViewLayout({
  initialSection = 'technologies',
  nodes,
  edges,
  allModelObjects = [],
  onSelectNode,
  onSwitchToDiagram,
  onTriggerFlowPlay,
}: ModelViewLayoutProps): JSX.Element {
  const [activeSection, setActiveSection] = useState<ModelSection>(initialSection);

  const counts: Partial<Record<ModelSection, number>> = {
    objects: Math.max(nodes.length, allModelObjects.length),
    connections: edges.length,
    technologies: 15,
  };

  return (
    <div
      data-testid="model-view-container"
      className="flex-1 flex h-full w-full overflow-hidden bg-[#0b0d0f] relative"
    >
      {/* Vertical Icon Rail on Left (Model Side) */}
      <ModelNavRail
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        counts={counts}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeSection === 'home' && (
          <HomePage
            nodes={nodes}
            edges={edges}
            allModelObjects={allModelObjects}
            onSelectSection={setActiveSection}
            onSwitchToDiagram={onSwitchToDiagram}
          />
        )}
        {activeSection === 'domains' && <DomainsPage nodes={nodes} />}
        {activeSection === 'objects' && (
          <ObjectsPage
            nodes={nodes}
            allModelObjects={allModelObjects}
            onSelectNode={onSelectNode}
          />
        )}
        {activeSection === 'flows' && <FlowsPage onTriggerPlay={onTriggerFlowPlay} />}
        {activeSection === 'connections' && <ConnectionsPage edges={edges} nodes={nodes} />}
        {activeSection === 'dependencies' && (
          <DependenciesPage
            nodes={nodes}
            edges={edges}
            allModelObjects={allModelObjects}
            onSelectNode={onSelectNode}
          />
        )}
        {activeSection === 'teams' && <TeamsPage />}
        {activeSection === 'technologies' && (
          <TechnologiesPage
            nodes={nodes}
            allModelObjects={allModelObjects}
            onSelectObject={onSelectNode}
          />
        )}
        {activeSection === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}
