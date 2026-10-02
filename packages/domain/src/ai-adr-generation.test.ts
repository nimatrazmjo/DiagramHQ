import { describe, it, expect } from 'vitest';
import {
  draftADRFromChange,
  acceptDraftedADR,
  type GenerateADRInput,
} from './ai-adr-generation';
import type { ArchitectureChangeSet } from './changes';
import type { ObjectId, FlowId, TeamId } from './ids';

describe('AI ADR Generation Domain Logic (F070)', () => {
  const sampleChangeSet: ArchitectureChangeSet = {
    id: 'cs-kafka-migration-001',
    title: 'Migrate Payment Events to Apache Kafka Cluster',
    description: 'Transition asynchronous billing events from point-to-point HTTP to distributed Kafka broker',
    changes: {
      added: [
        {
          id: 'app-kafka-broker',
          name: 'Kafka Message Broker',
          kind: 'object',
          details: 'Apache Kafka 3.6 Event Streaming Cluster',
        },
        {
          id: 'con-billing-kafka',
          name: 'Publish Payment Events',
          kind: 'connection',
          details: 'Event publish queue',
        },
      ],
      modified: [
        {
          id: 'app-billing-service',
          name: 'Billing Microservice',
          kind: 'object',
          details: 'Updated with Kafka producer client',
        },
      ],
      removed: [
        {
          id: 'app-legacy-queue',
          name: 'Legacy RabbitMQ',
          kind: 'object',
        },
      ],
      totalDirectChanges: 4,
    },
    affected: {
      affectedObjectIds: ['app-billing-service' as ObjectId, 'app-analytics-service' as ObjectId],
      affectedFlowIds: ['flow-checkout' as FlowId],
      affectedTeamIds: ['team-payments' as TeamId],
      counts: {
        objects: 2,
        flows: 1,
        teams: 1,
      },
    },
    createdAt: '2026-10-01T12:00:00.000Z',
  };

  it('1. Acceptance Test: Drafts an ADR from a change set and establishes a direct link to the change', () => {
    const input: GenerateADRInput = {
      changeSet: sampleChangeSet,
      problemStatement: 'Payment webhook spikes caused HTTP 504 timeouts on downstream billing listeners.',
      businessGoals: ['Achieve 99.99% event delivery', 'Decouple billing producers from listeners'],
      author: {
        id: 'usr-architect',
        name: 'Chief Architect',
        email: 'architect@diagramhq.com',
      },
    };

    const draft = draftADRFromChange(input);

    expect(draft).toBeDefined();
    expect(draft.isDraft).toBe(true);
    expect(draft.changeId).toBe(sampleChangeSet.id);
    expect(draft.status).toBe('proposed');

    // Title synthesized
    expect(draft.title).toContain('Kafka Message Broker');

    // Context contains problem and objectives
    expect(draft.context).toContain('Payment webhook spikes');
    expect(draft.context).toContain('Achieve 99.99% event delivery');
    expect(draft.context).toContain('2 downstream architecture object(s)');

    // Decision contains added and modified components
    expect(draft.decision).toContain('Kafka Message Broker');
    expect(draft.decision).toContain('Billing Microservice');
    expect(draft.decision).toContain('Legacy RabbitMQ');

    // Key Acceptance Requirement: Links to the change!
    const changeAttachment = draft.attachments.find(
      (a) => a.targetType === 'change' && a.targetId === sampleChangeSet.id
    );
    expect(changeAttachment).toBeDefined();

    // Also links to affected objects
    const objAttachment = draft.attachments.find(
      (a) => a.targetType === 'object' && a.targetId === 'app-kafka-broker'
    );
    expect(objAttachment).toBeDefined();
  });

  it('2. Acceptance Test: Human edits and accepts the drafted ADR, generating official ADR linked to change', () => {
    const draft = draftADRFromChange({ changeSet: sampleChangeSet });

    // Human architect edits decisions and accepts
    const acceptedADR = acceptDraftedADR(draft, {
      title: 'ADR-042: Adopt Apache Kafka for Resilient Asynchronous Payment Processing',
      status: 'accepted',
      decision: 'Approved deployment of MSK Kafka cluster with SASL/SCRAM authentication.',
    });

    expect(acceptedADR.id).toBeDefined();
    expect(acceptedADR.status).toBe('accepted');
    expect(acceptedADR.title).toBe(
      'ADR-042: Adopt Apache Kafka for Resilient Asynchronous Payment Processing'
    );
    expect(acceptedADR.decision).toBe(
      'Approved deployment of MSK Kafka cluster with SASL/SCRAM authentication.'
    );

    // Invariant: Link to change is strictly preserved
    const changeLink = acceptedADR.attachments.find(
      (a) => a.targetType === 'change' && a.targetId === sampleChangeSet.id
    );
    expect(changeLink).toBeDefined();
  });

  it('3. Generates appropriate title and context when decommissioning components', () => {
    const decommissionChangeSet: ArchitectureChangeSet = {
      id: 'cs-decommission-002',
      title: 'Sunset Legacy Auth Proxy',
      changes: {
        added: [],
        modified: [],
        removed: [
          {
            id: 'app-legacy-auth',
            name: 'Legacy Auth Proxy',
            kind: 'object',
          },
        ],
        totalDirectChanges: 1,
      },
      affected: {
        affectedObjectIds: [],
        affectedFlowIds: [],
        affectedTeamIds: [],
        counts: { objects: 0, flows: 0, teams: 0 },
      },
      createdAt: '2026-10-01T12:00:00.000Z',
    };

    const draft = draftADRFromChange({ changeSet: decommissionChangeSet });

    expect(draft.title).toContain('Decommission Legacy Auth Proxy');
    expect(draft.decision).toContain('Decommission legacy component(s): **Legacy Auth Proxy**');
    expect(draft.attachments.some((a) => a.targetId === decommissionChangeSet.id)).toBe(true);
  });
});
