import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createMainBranch,
  forkBranch,
  addObjectToBranch,
  detectMergeConflicts,
  mergeBranchOntoMain,
  type ArchitectureBranch,
  type ArchitectureMergeConflict,
  type ModelObject,
  type WorkspaceId,
  type ArchitectureId,
  type ObjectId,
  type VersionId,
} from '@diagramhq/domain';
import { ConflictResolutionBanner, MergeBranchModal } from './components/canvas/merge-modal';

describe('Architecture Branch Merge & Conflict Detection Integration & UI (F061)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'v1' as VersionId;

  const baseGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const baseAuth: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 300, y: 300 },
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  it('1. Acceptance Test: merge applies to main; a conflict is detected', () => {
    // 1. Base main branch
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
    });
    const baseState = mainBranch.state;

    // 2. Feature branch adds billing service
    const featBilling = forkBranch(mainBranch, 'feat/billing');
    const billingObj: ModelObject = {
      id: 'app-billing' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Stripe Billing Service',
      kind: 'application',
      position: { x: 500, y: 500 },
      createdAt: new Date('2026-10-02T00:00:00Z'),
      updatedAt: new Date('2026-10-02T00:00:00Z'),
    };
    const updatedFeatBilling = addObjectToBranch(featBilling, billingObj);

    // Clean merge applies to main
    const cleanMerge = mergeBranchOntoMain(baseState, updatedFeatBilling, mainBranch);
    expect(cleanMerge.success).toBe(true);
    expect(cleanMerge.mergedBranch?.state.objects).toHaveLength(3);
    expect(cleanMerge.mergedBranch?.state.objects.some((o) => o.name === 'Stripe Billing Service')).toBe(true);

    // 3. Concurrent conflicting modifications on the same object id
    const mainModifiedAuth: ModelObject = {
      ...baseAuth,
      name: 'IAM OAuth2 Server',
    };
    const mainWithAuthChange: ArchitectureBranch = {
      ...mainBranch,
      state: {
        ...mainBranch.state,
        objects: [baseGateway, mainModifiedAuth],
      },
    };

    const featModifiedAuth: ModelObject = {
      ...baseAuth,
      name: 'Auth0 Federation Gateway',
    };
    const featWithAuthChange: ArchitectureBranch = {
      ...featBilling,
      state: {
        ...featBilling.state,
        objects: [baseGateway, featModifiedAuth],
      },
    };

    // Conflict detection
    const conflicts = detectMergeConflicts(baseState, featWithAuthChange, mainWithAuthChange);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.entityId).toBe(baseAuth.id);
    expect(conflicts[0]?.conflictType).toBe('both_modified');

    const failedMerge = mergeBranchOntoMain(baseState, featWithAuthChange, mainWithAuthChange);
    expect(failedMerge.success).toBe(false);
    expect(failedMerge.hasConflicts).toBe(true);
    expect(failedMerge.conflicts).toHaveLength(1);
  });

  it('2. renders <ConflictResolutionBanner /> with conflict details and actions', () => {
    const mockConflicts: ArchitectureMergeConflict[] = [
      {
        entityId: baseAuth.id,
        entityKind: 'object',
        entityName: 'Authentication Service',
        conflictType: 'both_modified',
        conflictingFields: ['name'],
      },
    ];

    const onApplyStrategy = vi.fn();
    const html = renderToString(
      <ConflictResolutionBanner
        conflicts={mockConflicts}
        onApplyStrategy={onApplyStrategy}
      />
    );

    expect(html).toContain('1 merge conflict(s) detected');
    expect(html).toContain('Accept Incoming (Theirs)');
    expect(html).toContain('Keep Current (Ours)');
  });

  it('3. renders <MergeBranchModal /> in clean and conflicting modes', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway],
    });
    const featBranch = forkBranch(mainBranch, 'feat/microservices');

    const onConfirmMerge = vi.fn();
    const onClose = vi.fn();

    // Clean mode
    const cleanHtml = renderToString(
      <MergeBranchModal
        sourceBranch={featBranch}
        targetBranch={mainBranch}
        onClose={onClose}
        onConfirmMerge={onConfirmMerge}
      />
    );

    expect(cleanHtml).toContain('Merge feat/microservices into main');
    expect(cleanHtml).toContain('Ready to merge cleanly');
    expect(cleanHtml).toContain('Confirm Merge');

    // Conflicting mode
    const mockConflicts: ArchitectureMergeConflict[] = [
      {
        entityId: baseGateway.id,
        entityKind: 'object',
        entityName: 'Edge API Gateway',
        conflictType: 'both_modified',
        conflictingFields: ['name'],
        sourceValue: { ...baseGateway, name: 'Incoming Gateway' },
        targetValue: { ...baseGateway, name: 'Current Gateway' },
      },
    ];

    const conflictHtml = renderToString(
      <MergeBranchModal
        sourceBranch={featBranch}
        targetBranch={mainBranch}
        conflicts={mockConflicts}
        onClose={onClose}
        onConfirmMerge={onConfirmMerge}
      />
    );

    expect(conflictHtml).toContain('1 merge conflict(s) detected');
    expect(conflictHtml).toContain('Edge API Gateway');
    expect(conflictHtml).toContain('Apply Resolutions &amp; Merge');
  });
});
