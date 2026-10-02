import { describe, it, expect } from 'vitest';
import {
  detectMergeConflicts,
  mergeBranchOntoMain,
} from './merge';
import { createMainBranch, forkBranch, addObjectToBranch } from './branches';
import type {
  ArchitectureId,
  ConnectionId,
  ObjectId,
  VersionId,
  WorkspaceId,
} from './ids';
import type { ModelObject, ModelConnection } from './types';

describe('Architecture Merge & Conflict Detection (F061)', () => {
  const wsId = 'ws-test' as WorkspaceId;
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  const baseGateway: ModelObject = {
    id: 'app-gateway' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Edge API Gateway',
    kind: 'application',
    position: { x: 100, y: 100 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseAuth: ModelObject = {
    id: 'app-auth' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Authentication Service',
    kind: 'application',
    position: { x: 300, y: 300 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseConn: ModelConnection = {
    id: 'con-gw-auth' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: baseGateway.id,
    targetObjectId: baseAuth.id,
    label: 'Authorize',
    kind: 'sync',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('1. Acceptance Test: merge applies to main; a conflict is detected', () => {
    // -------------------------------------------------------------------------
    // Part A: Clean merge applies to main
    // -------------------------------------------------------------------------
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
      connections: [baseConn],
    });
    const baseState = mainBranch.state;

    // Fork feature branch
    const featBilling = forkBranch(mainBranch, 'feat/billing');
    const newBillingObj: ModelObject = {
      id: 'app-billing' as ObjectId,
      architectureId: archId,
      versionId: v1,
      name: 'Billing Service',
      kind: 'application',
      position: { x: 500, y: 500 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedFeatBilling = addObjectToBranch(featBilling, newBillingObj);

    const cleanMergeResult = mergeBranchOntoMain(baseState, updatedFeatBilling, mainBranch);

    expect(cleanMergeResult.success).toBe(true);
    expect(cleanMergeResult.hasConflicts).toBe(false);
    expect(cleanMergeResult.conflicts).toHaveLength(0);
    expect(cleanMergeResult.mergedBranch?.state.objects).toHaveLength(3);
    expect(cleanMergeResult.mergedBranch?.state.objects.map((o) => o.name)).toContain('Billing Service');
    expect(cleanMergeResult.mergedSourceBranch?.status).toBe('merged');

    // -------------------------------------------------------------------------
    // Part B: Conflict is detected on the same object ID
    // -------------------------------------------------------------------------
    // Concurrent edit on main: 'app-auth' renamed to 'Enterprise IAM Service'
    const modifiedMainAuth: ModelObject = {
      ...baseAuth,
      name: 'Enterprise IAM Service',
    };
    const concurrentMain = {
      ...mainBranch,
      state: {
        ...mainBranch.state,
        objects: [baseGateway, modifiedMainAuth],
      },
    };

    // Concurrent edit on feature branch: same 'app-auth' ID renamed to 'OAuth0 Provider'
    const modifiedFeatAuth: ModelObject = {
      ...baseAuth,
      name: 'Auth0 Provider',
    };
    const featAuthBranch = forkBranch(mainBranch, 'feat/auth0');
    const concurrentFeat = {
      ...featAuthBranch,
      state: {
        ...featAuthBranch.state,
        objects: [baseGateway, modifiedFeatAuth],
      },
    };

    // Detect conflicts
    const detectedConflicts = detectMergeConflicts(baseState, concurrentFeat, concurrentMain);
    expect(detectedConflicts).toHaveLength(1);
    expect(detectedConflicts[0].entityId).toBe(baseAuth.id);
    expect(detectedConflicts[0].conflictType).toBe('both_modified');
    expect(detectedConflicts[0].conflictingFields).toContain('name');

    // Attempting merge without resolution strategy fails and reports conflict
    const conflictingMerge = mergeBranchOntoMain(baseState, concurrentFeat, concurrentMain);
    expect(conflictingMerge.success).toBe(false);
    expect(conflictingMerge.hasConflicts).toBe(true);
    expect(conflictingMerge.conflicts).toHaveLength(1);
    expect(conflictingMerge.conflicts[0].entityId).toBe(baseAuth.id);

    // -------------------------------------------------------------------------
    // Part C: Resolving conflict completes merge
    // -------------------------------------------------------------------------
    const resolvedMerge = mergeBranchOntoMain(baseState, concurrentFeat, concurrentMain, {
      strategy: 'theirs', // Pick feature branch's value ('Auth0 Provider')
    });

    expect(resolvedMerge.success).toBe(true);
    expect(resolvedMerge.hasConflicts).toBe(false);
    const resolvedAuth = resolvedMerge.mergedBranch?.state.objects.find((o) => o.id === baseAuth.id);
    expect(resolvedAuth?.name).toBe('Auth0 Provider');
  });

  it('2. supports manual per-entity resolution choices', () => {
    const mainBranch = createMainBranch(wsId, archId, {
      objects: [baseGateway, baseAuth],
    });
    const baseState = mainBranch.state;

    const modifiedMainAuth: ModelObject = {
      ...baseAuth,
      name: 'Enterprise IAM Service',
    };
    const concurrentMain = {
      ...mainBranch,
      state: { ...mainBranch.state, objects: [baseGateway, modifiedMainAuth] },
    };

    const modifiedFeatAuth: ModelObject = {
      ...baseAuth,
      name: 'Auth0 Provider',
    };
    const feat = forkBranch(mainBranch, 'feat/test');
    const concurrentFeat = {
      ...feat,
      state: { ...feat.state, objects: [baseGateway, modifiedFeatAuth] },
    };

    const manualResult = mergeBranchOntoMain(baseState, concurrentFeat, concurrentMain, {
      manualResolutions: [{ entityId: baseAuth.id, chosenValue: 'target' }],
    });

    expect(manualResult.success).toBe(true);
    const resolved = manualResult.mergedBranch?.state.objects.find((o) => o.id === baseAuth.id);
    expect(resolved?.name).toBe('Enterprise IAM Service');
  });
});
