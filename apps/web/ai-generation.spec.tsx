import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  generateArchitectureFromPrompt,
  applyGeneratedProposalToModel,
  rejectGeneratedProposal,
  type WorkspaceId,
  type ArchitectureId,
  type VersionId,
} from '@diagramhq/domain';
import {
  GenerationProposalCard,
  AIGenerationModal,
} from './components/canvas/ai-generation-modal';

describe('AI Architecture Generation Integration & UI (F063)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-ecommerce' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  it('1. Acceptance Test: a prompt yields a valid model on apply', () => {
    // Generate proposal from prompt
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Build a fintech payments processing pipeline with API gateway, worker, and database',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    expect(proposal.status).toBe('proposed');
    expect(proposal.generatedObjects.length).toBeGreaterThan(0);
    expect(proposal.generatedConnections.length).toBeGreaterThan(0);
    expect(proposal.generatedFlows.length).toBeGreaterThan(0);
    expect(proposal.generatedDocs.length).toBeGreaterThan(0);

    // Apply the proposal to the model
    const applied = applyGeneratedProposalToModel(proposal, [], []);

    // Verify model state is updated and valid
    expect(applied.appliedProposal.status).toBe('applied');
    expect(applied.updatedObjects.length).toBe(proposal.generatedObjects.length);
    expect(applied.updatedConnections.length).toBe(proposal.generatedConnections.length);

    // Objects have valid architectureId and versionId
    for (const obj of applied.updatedObjects) {
      expect(obj.architectureId).toBe(archId);
      expect(obj.versionId).toBe(v1);
    }
  });

  it('2. allows rejecting a proposal without modifying context', () => {
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Simple system',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    const rejected = rejectGeneratedProposal(proposal);
    expect(rejected.status).toBe('rejected');
  });

  it('3. renders <GenerationProposalCard /> with status and summary metrics', () => {
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Microservices architecture with Redis cache and PostgreSQL',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    const onApply = vi.fn();
    const onReject = vi.fn();

    const html = renderToString(
      <GenerationProposalCard
        proposal={proposal}
        onApply={onApply}
        onReject={onReject}
      />
    );

    expect(html).toContain('AI Generated Proposal');
    expect(html).toContain(proposal.title);
    expect(html).toContain('proposed');
    expect(html).toContain('Objects');
    expect(html).toContain('Connections');
    expect(html).toContain('Flows');
    expect(html).toContain('Apply to Architecture');
    expect(html).toContain('Reject Proposal');
  });

  it('4. renders <AIGenerationModal /> in open/closed state with tabs and generation trigger', () => {
    const proposal = generateArchitectureFromPrompt({
      prompt: 'Cloud-native streaming platform with Kafka and S3',
      workspaceId: wsId,
      architectureId: archId,
      versionId: v1,
    });

    const onClose = vi.fn();
    const onGenerate = vi.fn();
    const onApply = vi.fn();

    // Open modal with proposal
    const openHtml = renderToString(
      <AIGenerationModal
        isOpen={true}
        onClose={onClose}
        proposal={proposal}
        onGenerate={onGenerate}
        onApplyProposal={onApply}
      />
    );

    expect(openHtml).toContain('AI Architecture Generation');
    expect(openHtml).toContain('Describe the system you want to generate:');
    expect(openHtml).toContain('Components (');
    expect(openHtml).toContain('Connections (');
    expect(openHtml).toContain('Flows (');
    expect(openHtml).toContain('Docs (');

    // Closed modal
    const closedHtml = renderToString(
      <AIGenerationModal
        isOpen={false}
        onClose={onClose}
        onGenerate={onGenerate}
      />
    );
    expect(closedHtml).toBe('');
  });
});
