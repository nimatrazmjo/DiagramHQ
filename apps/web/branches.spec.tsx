import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createMainBranch,
  forkBranch,
  addObjectToBranch,
  addAdrToBranch,
  type ArchitectureBranch,
  type ModelObject,
  type BranchAdr,
  type WorkspaceId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from '@diagramhq/domain';
import { BranchBadge, BranchSelector } from './components/canvas/branch-selector';

describe('Architecture Branches Integration & UI (F057)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-test' as ArchitectureId;
  const verId = 'ver-test' as VersionId;

  const sampleObject: ModelObject = {
    id: 'app-main' as ObjectId,
    architectureId: archId,
    versionId: verId,
    name: 'Main Gateway App',
    kind: 'application',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const sampleAdr: BranchAdr = {
    id: 'adr-01',
    title: 'ADR-01: Microservices Architecture',
    status: 'accepted',
    context: 'Scale requirements dictate independent deployments.',
    decision: 'Break apart monolith.',
    createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
  };

  it('1. Acceptance Test: a branch is independent of main', () => {
    // 1. Create main branch with initial object
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [sampleObject],
      adrs: [sampleAdr],
    });

    // 2. Fork feature branch off main
    const featureBranch = forkBranch(mainBranch, 'feat/payment-service');

    // 3. Mutate feature branch by adding a new object and ADR
    const paymentObject: ModelObject = {
      id: 'app-payment' as ObjectId,
      architectureId: archId,
      versionId: verId,
      name: 'Stripe Payment Processor',
      kind: 'application',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };
    const paymentAdr: BranchAdr = {
      id: 'adr-02',
      title: 'ADR-02: Stripe Integration',
      status: 'proposed',
      context: 'Payment gateway integration.',
      decision: 'Use Stripe webhooks.',
      createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    };

    let updatedFeature = addObjectToBranch(featureBranch, paymentObject);
    updatedFeature = addAdrToBranch(updatedFeature, paymentAdr);

    // 4. Assert feature branch contains new entities
    expect(updatedFeature.state.objects.length).toBe(2);
    expect(updatedFeature.state.adrs.length).toBe(2);
    expect(updatedFeature.state.objects.some((o) => o.name === 'Stripe Payment Processor')).toBe(true);

    // 5. Assert main branch remains completely unpolluted and independent
    expect(mainBranch.state.objects.length).toBe(1);
    expect(mainBranch.state.adrs.length).toBe(1);
    expect(mainBranch.state.objects.some((o) => o.name === 'Stripe Payment Processor')).toBe(false);
  });

  it('2. renders <BranchBadge /> for main and feature branches', () => {
    const mainBranch = createMainBranch(wsId, archId);
    const htmlMain = renderToString(<BranchBadge currentBranch={mainBranch} />);

    expect(htmlMain).toContain('main');
    expect(htmlMain).toContain('default');
    expect(htmlMain).toContain('fork_right');

    const featureBranch = forkBranch(mainBranch, 'feat/analytics');
    const htmlFeature = renderToString(<BranchBadge currentBranch={featureBranch} />);

    expect(htmlFeature).toContain('feat/analytics');
    expect(htmlFeature).toContain('feature');
  });

  it('3. renders <BranchSelector /> listing branches and entity counts', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [sampleObject],
      adrs: [sampleAdr],
    });
    const featureBranch = forkBranch(mainBranch, 'feat/auth-v2');

    const branches: ArchitectureBranch[] = [mainBranch, featureBranch];
    const onSelect = vi.fn();

    const html = renderToString(
      <BranchSelector
        branches={branches}
        currentBranchId={mainBranch.id}
        onSelectBranch={onSelect}
      />
    );

    expect(html).toContain('Switch Architecture Branch');
    expect(html).toContain('main');
    expect(html).toContain('feat/auth-v2');
    expect(html).toContain('1 objects');
    expect(html).toContain('1 ADRs');
    expect(html).toContain('check'); // Active checkmark on main
  });
});
