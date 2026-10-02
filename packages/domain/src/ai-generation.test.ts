import { describe, it, expect } from 'vitest';
import {
  generateArchitectureFromPrompt,
  applyGeneratedProposalToModel,
  rejectGeneratedProposal,
} from './ai-generation';
import type {
  WorkspaceId,
  ArchitectureId,
  VersionId,
} from './ids';

describe('AI Architecture Generation (F063)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  it('1. Acceptance Test: a prompt yields a valid model on apply', () => {
    // 1. Natural Language Prompt -> full architecture elements as a proposed changeset
    const prompt = 'Build a scalable e-commerce platform with storefront gateway, order processing, auth, and database.';
    const proposal = generateArchitectureFromPrompt({
      prompt,
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
      baseObjects: [],
      baseConnections: [],
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('proposed');
    expect(proposal.summary.objectsCount).toBeGreaterThanOrEqual(3);
    expect(proposal.summary.connectionsCount).toBeGreaterThanOrEqual(2);
    expect(proposal.summary.flowsCount).toBe(1);
    expect(proposal.summary.viewsCount).toBe(1);
    expect(proposal.summary.docsCount).toBe(1);

    // Verify all generated objects have valid C4 kinds, descriptions, and IDs
    for (const obj of proposal.generatedObjects) {
      expect(obj.id).toBeDefined();
      expect(['application', 'store', 'system', 'actor']).toContain(obj.kind);
      expect(obj.name.length).toBeGreaterThan(0);
      expect(obj.description?.length).toBeGreaterThan(0);
      expect(obj.position).toBeDefined();
    }

    // Verify all connections connect valid endpoints
    const generatedObjIds = new Set(proposal.generatedObjects.map((o) => o.id));
    for (const conn of proposal.generatedConnections) {
      expect(generatedObjIds.has(conn.sourceObjectId)).toBe(true);
      expect(generatedObjIds.has(conn.targetObjectId)).toBe(true);
      expect(conn.sourceObjectId).not.toBe(conn.targetObjectId); // no self-connections
      expect(conn.label?.length).toBeGreaterThan(0);
    }

    // Verify generated flow has numbered steps
    expect(proposal.generatedFlows).toHaveLength(1);
    const flow = proposal.generatedFlows[0];
    expect(flow?.steps.length).toBeGreaterThan(0);
    expect(flow?.steps[0]?.stepIndex).toBe(1);

    // Verify generated docs
    expect(proposal.generatedDocs).toHaveLength(1);
    expect(proposal.generatedDocs[0]?.content).toContain('# Architecture Overview');

    // Verify change set is computed with added objects
    expect(proposal.changeSet.changes.added.length).toBeGreaterThanOrEqual(5);

    // 2. Apply proposal to live model
    const { updatedObjects, updatedConnections, appliedProposal } = applyGeneratedProposalToModel(
      proposal,
      [],
      []
    );

    expect(appliedProposal.status).toBe('applied');
    expect(updatedObjects).toHaveLength(proposal.generatedObjects.length);
    expect(updatedConnections).toHaveLength(proposal.generatedConnections.length);

    // Invariant verification on updated model: all connections reference existing objects
    const finalObjIds = new Set(updatedObjects.map((o) => o.id));
    for (const conn of updatedConnections) {
      expect(finalObjIds.has(conn.sourceObjectId)).toBe(true);
      expect(finalObjIds.has(conn.targetObjectId)).toBe(true);
      expect(conn.sourceObjectId).not.toBe(conn.targetObjectId);
    }
  });

  it('2. supports rejecting a proposed changeset without mutating the model', () => {
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Event-driven real-time analytics with Kafka',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    expect(proposal.status).toBe('proposed');

    const rejected = rejectGeneratedProposal(proposal, 'Team decided on serverless batching instead');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Team decided on serverless batching instead');
  });

  it('3. prevents applying a proposal twice', () => {
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Simple web app with database',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    const { appliedProposal, updatedObjects, updatedConnections } = applyGeneratedProposalToModel(
      proposal,
      [],
      []
    );

    expect(() =>
      applyGeneratedProposalToModel(appliedProposal, updatedObjects, updatedConnections)
    ).toThrow('Proposal has already been applied');
  });

  it('4. throws if prompt is empty', () => {
    expect(() =>
      generateArchitectureFromPrompt({
        prompt: '',
        workspaceId: wsId,
        architectureId: archId,
        versionId: v1,
      })
    ).toThrow('Prompt cannot be empty');
  });
});
