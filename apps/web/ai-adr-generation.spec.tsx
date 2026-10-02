import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  draftADRFromChange,
  acceptDraftedADR,
  type ArchitectureChangeSet,
  type ObjectId,
  type FlowId,
  type TeamId,
} from '@diagramhq/domain';
import {
  DraftedADRCard,
  ADRGenerationModal,
} from './components/canvas/ai-adr-modal';

describe('AI ADR Generation Integration & UI (F070)', () => {
  const sampleChange: ArchitectureChangeSet = {
    id: 'cs-sharding-pg-004',
    title: 'Partition Customer Database across Regional Shards',
    description: 'Scale storage horizontally across multi-region PostgreSQL instances',
    changes: {
      added: [
        {
          id: 'sto-db-eu',
          name: 'EU Customer DB Shard',
          kind: 'object',
        },
        {
          id: 'sto-db-us',
          name: 'US Customer DB Shard',
          kind: 'object',
        },
        {
          id: 'con-gateway-shard',
          name: 'Route by Geo-Partition',
          kind: 'connection',
        },
      ],
      modified: [],
      removed: [
        {
          id: 'sto-db-monolith',
          name: 'Monolithic PostgreSQL Instance',
          kind: 'object',
        },
      ],
      totalDirectChanges: 4,
    },
    affected: {
      affectedObjectIds: ['sto-db-monolith' as ObjectId],
      affectedFlowIds: ['flow-user-login' as FlowId],
      affectedTeamIds: ['team-data' as TeamId],
      counts: {
        objects: 1,
        flows: 1,
        teams: 1,
      },
    },
    createdAt: '2026-10-01T12:00:00.000Z',
  };

  it('1. Acceptance Test: Draft an ADR from a change set; generated ADR links to the change', () => {
    const draft = draftADRFromChange({
      changeSet: sampleChange,
      problemStatement: 'Single database instance reached 92% IOPS saturation during peak traffic.',
      businessGoals: ['Ensure GDPR locality compliance', 'Reduce query latency under 15ms'],
    });

    expect(draft).toBeDefined();
    expect(draft.title).toContain('EU Customer DB Shard');
    expect(draft.context).toContain('Single database instance reached 92% IOPS saturation');
    expect(draft.context).toContain('GDPR locality compliance');

    // Key Acceptance Criterion: Generated ADR links to the change!
    expect(draft.changeId).toBe(sampleChange.id);
    const changeLink = draft.attachments.find(
      (a) => a.targetType === 'change' && a.targetId === sampleChange.id
    );
    expect(changeLink).toBeDefined();
  });

  it('2. Acceptance Test: Human edits and accepts the drafted ADR', () => {
    const draft = draftADRFromChange({ changeSet: sampleChange });

    const accepted = acceptDraftedADR(draft, {
      title: 'ADR-089: Regional PostgreSQL Sharding Architecture',
      status: 'accepted',
      decision: 'Approved implementation of Citus-based PostgreSQL sharding across US and EU.',
    });

    expect(accepted.id).toBeDefined();
    expect(accepted.status).toBe('accepted');
    expect(accepted.title).toBe('ADR-089: Regional PostgreSQL Sharding Architecture');
    expect(accepted.decision).toContain('Citus-based PostgreSQL sharding');

    // Link to change remains intact
    const changeLink = accepted.attachments.find(
      (a) => a.targetType === 'change' && a.targetId === sampleChange.id
    );
    expect(changeLink).toBeDefined();
  });

  it('3. UI Component Rendering: DraftedADRCard and ADRGenerationModal', () => {
    const draft = draftADRFromChange({ changeSet: sampleChange });

    // Card rendering
    const cardHtml = renderToString(
      <DraftedADRCard draft={draft} onOpen={vi.fn()} onDiscard={vi.fn()} />
    );
    expect(cardHtml).toContain('Linked Change:');
    expect(cardHtml).toContain('cs-sharding-pg-004');
    expect(cardHtml).toContain('Review &amp; Accept');

    // Modal rendering
    const modalHtml = renderToString(
      <ADRGenerationModal
        isOpen={true}
        onClose={vi.fn()}
        draft={draft}
        onAccept={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(modalHtml).toContain('ADR Draft Review Dialog');
    expect(modalHtml).toContain('Review AI-Drafted ADR');
    expect(modalHtml).toContain('Linked Change Set:');
    expect(modalHtml).toContain('cs-sharding-pg-004');
    expect(modalHtml).toContain('Polymorphic Traceability Invariant Enforced');
    expect(modalHtml).toContain('ADR Title');
    expect(modalHtml).toContain('Context &amp; Problem Statement');
    expect(modalHtml).toContain('Architectural Decision');
    expect(modalHtml).toContain('Consequences &amp; Trade-offs');
    expect(modalHtml).toContain('Alternatives Considered');
    expect(modalHtml).toContain('Accept &amp; Commit ADR');
  });
});
