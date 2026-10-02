import { describe, it, expect } from 'vitest';
import {
  createRoadmapItem,
  linkRoadmapItemToChange,
  unlinkRoadmapItemFromChange,
  updateRoadmapItemStatus,
  getRoadmapItemsForChange,
  groupRoadmapItemsByQuarter,
  calculateRoadmapProgress,
} from './roadmap-items';
import type { WorkspaceId, TeamId } from './ids';

describe('Architecture Roadmap Items (F119)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const platformTeamId = 'team-platform' as TeamId;
  const securityTeamId = 'team-security' as TeamId;

  it('1. Acceptance Test: a roadmap item links to an architecture change', () => {
    // 1. Create roadmap item targeting Q1
    const item = createRoadmapItem({
      workspaceId: wsId,
      title: 'Zero-Trust mTLS Migration',
      quarter: '2026-Q1',
      description: 'Enforce mutual TLS across all microservice ingress and egress channels.',
      priority: 'high',
      ownerTeamId: securityTeamId,
      tags: ['security', 'compliance'],
    });

    expect(item.id.startsWith('rdm_')).toBe(true);
    expect(item.title).toBe('Zero-Trust mTLS Migration');
    expect(item.quarter).toBe('2026-Q1');
    expect(item.status).toBe('planned');
    expect(item.linkedChangeSetIds).toHaveLength(0);

    // 2. Link roadmap item to architecture change set
    const changeSetId = 'chg-mtls-rollout';
    const linkedItem = linkRoadmapItemToChange(item, changeSetId);

    expect(linkedItem.linkedChangeSetIds).toHaveLength(1);
    expect(linkedItem.linkedChangeSetIds).toContain(changeSetId);

    // Link a second change set
    const doubleLinked = linkRoadmapItemToChange(linkedItem, 'chg-cert-rotation');
    expect(doubleLinked.linkedChangeSetIds).toHaveLength(2);

    // 3. Find roadmap items for a specific change set
    const matched = getRoadmapItemsForChange([doubleLinked], changeSetId);
    expect(matched).toHaveLength(1);
    expect(matched[0]?.id).toBe(item.id);
    expect(matched[0]?.title).toBe('Zero-Trust mTLS Migration');

    // Unlink change set
    const unlinked = unlinkRoadmapItemFromChange(doubleLinked, changeSetId);
    expect(unlinked.linkedChangeSetIds).toHaveLength(1);
    expect(unlinked.linkedChangeSetIds).not.toContain(changeSetId);
  });

  it('2. groups roadmap items chronologically by quarter', () => {
    const q1Item = createRoadmapItem({
      workspaceId: wsId,
      title: 'API Gateway Envoy Upgrade',
      quarter: '2026-Q1',
      ownerTeamId: platformTeamId,
    });

    const q2Item = createRoadmapItem({
      workspaceId: wsId,
      title: 'PostgreSQL 16 Multi-AZ Partitioning',
      quarter: '2026-Q2',
      ownerTeamId: platformTeamId,
    });

    const q3Item = createRoadmapItem({
      workspaceId: wsId,
      title: 'Kafka Event Streaming Ingestion',
      quarter: '2026-Q3',
      ownerTeamId: platformTeamId,
    });

    const grouped = groupRoadmapItemsByQuarter([q3Item, q1Item, q2Item]);
    const quarters = Object.keys(grouped);

    expect(quarters).toEqual(['2026-Q1', '2026-Q2', '2026-Q3']);
    expect(grouped['2026-Q1']).toHaveLength(1);
    expect(grouped['2026-Q1']?.[0]?.title).toBe('API Gateway Envoy Upgrade');
  });

  it('3. updates status and computes roadmap progress metrics', () => {
    let item1 = createRoadmapItem({
      workspaceId: wsId,
      title: 'Item 1',
      quarter: '2026-Q1',
    });
    item1 = updateRoadmapItemStatus(item1, 'completed');

    let item2 = createRoadmapItem({
      workspaceId: wsId,
      title: 'Item 2',
      quarter: '2026-Q1',
    });
    item2 = updateRoadmapItemStatus(item2, 'in_progress');

    const item3 = createRoadmapItem({
      workspaceId: wsId,
      title: 'Item 3',
      quarter: '2026-Q2',
    });

    const item4 = createRoadmapItem({
      workspaceId: wsId,
      title: 'Item 4',
      quarter: '2026-Q3',
      status: 'deferred',
    });

    const metrics = calculateRoadmapProgress([item1, item2, item3, item4]);
    expect(metrics.total).toBe(4);
    expect(metrics.completed).toBe(1);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.planned).toBe(1);
    expect(metrics.deferred).toBe(1);
    expect(metrics.percentComplete).toBe(25);
  });

  it('4. validates required title and quarter fields', () => {
    expect(() =>
      createRoadmapItem({
        workspaceId: wsId,
        title: '',
        quarter: '2026-Q1',
      })
    ).toThrow('Roadmap item title cannot be empty');

    expect(() =>
      createRoadmapItem({
        workspaceId: wsId,
        title: 'Title',
        quarter: '',
      })
    ).toThrow('Roadmap item quarter cannot be empty');
  });
});
