import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createTestHarnessGraph } from './lib/test-harness-graph';
import {
  ModelNavRail,
  TechnologiesPage,
  DependenciesPage,
  DomainsPage,
  ObjectsPage,
  FlowsPage,
  ConnectionsPage,
  TeamsPage,
  HistoryPage,
  ModelViewLayout,
} from './components/model';

describe('Phase G — IcePanel Model-Level Pages & Left Nav Rail', () => {
  const { nodes, edges } = createTestHarnessGraph();

  describe('ModelNavRail', () => {
    it('renders all 9 vertical icon rail items for model navigation', () => {
      const html = renderToString(
        <ModelNavRail
          activeSection="technologies"
          onSelectSection={() => {}}
          counts={{ objects: 14, connections: 11, technologies: 15 }}
        />,
      );

      expect(html).toContain('data-testid="model-nav-rail"');
      expect(html).toContain('data-testid="model-nav-home"');
      expect(html).toContain('data-testid="model-nav-domains"');
      expect(html).toContain('data-testid="model-nav-objects"');
      expect(html).toContain('data-testid="model-nav-flows"');
      expect(html).toContain('data-testid="model-nav-connections"');
      expect(html).toContain('data-testid="model-nav-dependencies"');
      expect(html).toContain('data-testid="model-nav-teams"');
      expect(html).toContain('data-testid="model-nav-technologies"');
      expect(html).toContain('data-testid="model-nav-history"');

      // Check active styling token for technologies
      expect(html).toContain('bg-[#2BB5E8]/15');
    });
  });

  describe('TechnologiesPage', () => {
    it('renders the technologies table with Name, Description, Website, Assigned to, and Access', () => {
      const html = renderToString(
        <TechnologiesPage nodes={nodes} />,
      );

      expect(html).toContain('data-testid="model-page-technologies"');
      expect(html).toContain('data-testid="total-technologies-count"');
      expect(html).toContain('Total technologies: 15');
      expect(html).toContain('data-testid="manage-technologies-btn"');
      expect(html).toContain('data-testid="technologies-search-input"');
      expect(html).toContain('data-testid="technologies-table"');

      // Check common tech rows
      expect(html).toContain('data-testid="tech-row-postgresql"');
      expect(html).toContain('data-testid="tech-row-react"');
      expect(html).toContain('data-testid="tech-row-nodejs"');
      expect(html).toContain('data-testid="tech-row-redis"');
      expect(html).toContain('data-testid="tech-row-aws"');

      // Check Access badge
      expect(html).toContain('Public');
    });
  });

  describe('DependenciesPage', () => {
    it('renders 3-column interactive view (Incoming, Object-of-Focus, Outgoing) with domain and search filters', () => {
      const html = renderToString(
        <DependenciesPage nodes={nodes} edges={edges} />,
      );

      expect(html).toContain('data-testid="model-page-dependencies"');
      expect(html).toContain('data-testid="dependencies-domain-filter"');
      expect(html).toContain('data-testid="dependencies-search-input"');
      expect(html).toContain('data-testid="dependencies-focus-selector"');
      expect(html).toContain('data-testid="dependencies-3-column-view"');
      expect(html).toContain('data-testid="dependencies-incoming-col"');
      expect(html).toContain('data-testid="dependencies-focus-col"');
      expect(html).toContain('data-testid="dependencies-outgoing-col"');
      expect(html).toContain('data-testid="dependencies-focus-card"');
    });
  });

  describe('ModelViewLayout', () => {
    it('renders the model view layout with Left Rail and active page', () => {
      const html = renderToString(
        <ModelViewLayout
          initialSection="technologies"
          nodes={nodes}
          edges={edges}
          onSwitchToDiagram={() => {}}
        />,
      );

      expect(html).toContain('data-testid="model-view-container"');
      expect(html).toContain('data-testid="model-nav-rail"');
      expect(html).toContain('data-testid="model-page-technologies"');
    });
  });
});
