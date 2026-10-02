import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createRoadmapItem,
  linkRoadmapItemToChange,
  unlinkRoadmapItemFromChange,
  getRoadmapItemsForChange,
  type ArchitectureRoadmapItem,
  type RoadmapItemId,
  type WorkspaceId,
  type TeamId,
} from '@diagramhq/domain';
import {
  RoadmapItemCard,
  RoadmapTimelinePanel,
} from './components/canvas/roadmap-panel';

describe('Architecture Roadmap Items Integration & UI (F119)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const securityTeamId = 'team-security' as TeamId;

  it('1. Acceptance Test: a roadmap item links to an architecture change', () => {
    // 1. Create roadmap item
    const item = createRoadmapItem({
      workspaceId: wsId,
      title: 'Zero-Trust mTLS Service Mesh',
      quarter: '2026-Q1',
      priority: 'high',
      ownerTeamId: securityTeamId,
    });

    expect(item.id.startsWith('rdm_')).toBe(true);
    expect(item.title).toBe('Zero-Trust mTLS Service Mesh');
    expect(item.quarter).toBe('2026-Q1');
    expect(item.linkedChangeSetIds).toHaveLength(0);

    // 2. Link roadmap item to architecture change set
    const changeSetId = 'chg-mtls-rollout';
    const linkedItem = linkRoadmapItemToChange(item, changeSetId);

    expect(linkedItem.linkedChangeSetIds).toHaveLength(1);
    expect(linkedItem.linkedChangeSetIds[0]).toBe(changeSetId);

    // 3. Find roadmap items for the change
    const found = getRoadmapItemsForChange([linkedItem], changeSetId);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(item.id);

    // Unlink change
    const unlinked = unlinkRoadmapItemFromChange(linkedItem, changeSetId);
    expect(unlinked.linkedChangeSetIds).toHaveLength(0);
  });

  it('2. renders <RoadmapItemCard /> with title, quarter badge, priority, and link/unlink action', () => {
    const item = createRoadmapItem({
      workspaceId: wsId,
      title: 'PostgreSQL 16 Partitioning',
      quarter: '2026-Q2',
      priority: 'critical',
      description: 'Partition ledger and ledger_entries tables by month.',
      linkedChangeSetIds: ['chg-db-partition'],
    });

    const onClick = vi.fn();
    const onLinkChange = vi.fn();

    // Render card linked to active change set
    const linkedHtml = renderToString(
      <RoadmapItemCard
        item={item}
        activeChangeSetId="chg-db-partition"
        onClick={onClick}
        onLinkChange={onLinkChange}
      />
    );

    expect(linkedHtml).toContain('PostgreSQL 16 Partitioning');
    expect(linkedHtml).toContain('2026-Q2');
    expect(linkedHtml).toContain('critical priority');
    expect(linkedHtml).toContain('Unlink Change');

    // Render card unlinked to active change set
    const unlinkedHtml = renderToString(
      <RoadmapItemCard
        item={item}
        activeChangeSetId="chg-other"
        onClick={onClick}
        onLinkChange={onLinkChange}
      />
    );
    expect(unlinkedHtml).toContain('Link Change');
  });

  it('3. renders <RoadmapTimelinePanel /> in populated and empty states', () => {
    const item1: ArchitectureRoadmapItem = {
      id: 'rdm_1' as RoadmapItemId,
      workspaceId: wsId,
      title: 'Envoy Gateway Rollout',
      quarter: '2026-Q1',
      status: 'completed',
      priority: 'high',
      linkedChangeSetIds: ['chg-envoy'],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const item2: ArchitectureRoadmapItem = {
      id: 'rdm_2' as RoadmapItemId,
      workspaceId: wsId,
      title: 'Kafka Streaming Cluster',
      quarter: '2026-Q2',
      status: 'in_progress',
      priority: 'medium',
      linkedChangeSetIds: [],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const onClose = vi.fn();

    // Populated state
    const populatedHtml = renderToString(
      <RoadmapTimelinePanel
        isOpen={true}
        onClose={onClose}
        items={[item1, item2]}
        activeChangeSetId="chg-envoy"
      />
    );

    expect(populatedHtml).toContain('Architecture Roadmap');
    expect(populatedHtml).toContain('2026-Q1');
    expect(populatedHtml).toContain('2026-Q2');
    expect(populatedHtml).toContain('Envoy Gateway Rollout');
    expect(populatedHtml).toContain('Kafka Streaming Cluster');
    expect(populatedHtml).toContain('50% complete');
    expect(populatedHtml).toContain('+ Add Roadmap Item');

    // Empty state
    const emptyHtml = renderToString(
      <RoadmapTimelinePanel
        isOpen={true}
        onClose={onClose}
        items={[]}
      />
    );

    expect(emptyHtml).toContain('No roadmap items scheduled');
    expect(emptyHtml).toContain('Create First Item');

    // Closed state
    const closedHtml = renderToString(
      <RoadmapTimelinePanel
        isOpen={false}
        onClose={onClose}
        items={[item1]}
      />
    );
    expect(closedHtml).toBe('');
  });
});
