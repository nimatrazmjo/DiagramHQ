import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  generateEditProposal,
  applyEditProposal,
  rejectEditProposal,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type ModelObject,
  type ModelConnection,
} from '@diagramhq/domain';
import {
  NLEditProposalCard,
  NLEditModal,
} from './components/canvas/nl-edit-modal';

describe('AI Natural-Language Editing Integration & UI (F064)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const nodeA: ModelObject = {
    id: 'app-service-a' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Service A',
    kind: 'application',
    position: { x: 100, y: 200 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const nodeB: ModelObject = {
    id: 'app-service-b' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Service B',
    kind: 'application',
    position: { x: 500, y: 200 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const connAB: ModelConnection = {
    id: 'con-ab-link' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: nodeA.id,
    targetObjectId: nodeB.id,
    label: 'Direct Link',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const objects = [nodeA, nodeB];
  const connections = [connAB];

  it('1. Acceptance Test: "add Redis between A and B" proposes exactly that; Reject changes nothing', () => {
    // Generate proposal
    const proposal = generateEditProposal({
      instruction: 'add Redis between Service A and Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: objects,
      currentConnections: connections,
    });

    // Explicit proposal verification
    expect(proposal.status).toBe('proposed');
    expect(proposal.changes.added.objects).toHaveLength(1);
    expect(proposal.changes.added.objects[0]?.name).toBe('Redis');
    expect(proposal.changes.added.connections).toHaveLength(2);
    expect(proposal.changes.removed.connectionIds).toContain(connAB.id);

    // Reject changes nothing
    const rejected = rejectEditProposal(proposal, 'Rejecting for benchmark test');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Rejecting for benchmark test');
    expect(objects).toHaveLength(2);
    expect(connections).toHaveLength(1);

    // Apply updates model
    const applied = applyEditProposal(proposal, objects, connections);
    expect(applied.appliedProposal.status).toBe('applied');
    expect(applied.updatedObjects).toHaveLength(3);
    expect(applied.updatedConnections).toHaveLength(2);
  });

  it('2. renders <NLEditProposalCard /> with added, modified, and removed breakdown', () => {
    const proposal = generateEditProposal({
      instruction: 'add Redis between Service A and Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: objects,
      currentConnections: connections,
    });

    const onApply = vi.fn();
    const onReject = vi.fn();

    const html = renderToString(
      <NLEditProposalCard
        proposal={proposal}
        onApply={onApply}
        onReject={onReject}
      />
    );

    expect(html).toContain('Proposed Model Modification');
    expect(html).toContain('add Redis between Service A and Service B');
    expect(html).toContain('+3 Added');
    expect(html).toContain('-1 Removed');
    expect(html).toContain('Apply Edit to Canvas');
    expect(html).toContain('Reject Edit');
  });

  it('3. renders <NLEditModal /> in open/closed and empty/populated states', () => {
    const onClose = vi.fn();
    const onPropose = vi.fn();

    // Closed
    const closedHtml = renderToString(
      <NLEditModal
        isOpen={false}
        onClose={onClose}
        onProposeEdit={onPropose}
      />
    );
    expect(closedHtml).toBe('');

    // Open without proposal
    const openEmptyHtml = renderToString(
      <NLEditModal
        isOpen={true}
        onClose={onClose}
        onProposeEdit={onPropose}
      />
    );
    expect(openEmptyHtml).toContain('Natural-Language Model Editing');
    expect(openEmptyHtml).toContain('No edit proposed yet');
    expect(openEmptyHtml).toContain('add Redis between A and B');

    // Open with proposal
    const proposal = generateEditProposal({
      instruction: 'remove Service B',
      architectureId: archId,
      versionId: v1,
      currentObjects: objects,
      currentConnections: connections,
    });

    const openWithProposalHtml = renderToString(
      <NLEditModal
        isOpen={true}
        onClose={onClose}
        proposal={proposal}
        onProposeEdit={onPropose}
      />
    );
    expect(openWithProposalHtml).toContain('remove Service B');
    expect(openWithProposalHtml).toContain('-2 Removed');
  });
});
