import { describe, it, expect } from 'vitest';
import {
  computeArchitectureChangeSet,
  type ComputeChangeSetInput,
} from './changes';
import type {
  ArchitectureId,
  ConnectionId,
  FlowId,
  ObjectId,
  TeamId,
  VersionId,
} from './ids';
import type { ModelObject, ModelConnection, FlowWithSteps } from './types';
import type { ObjectOwnership } from './teams';

describe('Architecture Changes & Impact Analysis (F059)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const ver1 = 'ver-1' as VersionId;
  const ver2 = 'ver-2' as VersionId;

  const teamSecurity = 'team-security' as TeamId;
  const teamData = 'team-data' as TeamId;
  const teamPlatform = 'team-platform' as TeamId;

  it('1. Acceptance Test: a change reports the correct affected sets (objects, flows, teams)', () => {
    // Base Objects
    const objGateway: ModelObject = {
      id: 'app-gateway' as ObjectId,
      architectureId: archId,
      versionId: ver1,
      name: 'API Gateway',
      kind: 'application',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      metadata: { ownerTeamId: teamPlatform },
    };

    const objAuth: ModelObject = {
      id: 'app-auth' as ObjectId,
      architectureId: archId,
      versionId: ver1,
      name: 'Authentication Service',
      kind: 'application',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const objDb: ModelObject = {
      id: 'sto-db' as ObjectId,
      architectureId: archId,
      versionId: ver1,
      name: 'User Database',
      kind: 'store',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Base Connections
    const connGatewayAuth: ModelConnection = {
      id: 'con-gw-auth' as ConnectionId,
      architectureId: archId,
      versionId: ver1,
      sourceObjectId: objGateway.id,
      targetObjectId: objAuth.id,
      label: 'OAuth Verify',
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    const connAuthDb: ModelConnection = {
      id: 'con-auth-db' as ConnectionId,
      architectureId: archId,
      versionId: ver1,
      sourceObjectId: objAuth.id,
      targetObjectId: objDb.id,
      label: 'Read Credentials',
      kind: 'sync',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Flows
    const flowLogin: FlowWithSteps = {
      id: 'flw-user-login' as FlowId,
      architectureId: archId,
      name: 'User Login Journey',
      type: 'user_journey',
      steps: [
        {
          id: 'step-1',
          flowId: 'flw-user-login' as FlowId,
          connectionId: connGatewayAuth.id,
          order: 1,
          label: 'Forward login request',
        },
        {
          id: 'step-2',
          flowId: 'flw-user-login' as FlowId,
          connectionId: connAuthDb.id,
          order: 2,
          label: 'Validate password hash',
        },
      ],
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Unrelated flow
    const flowUnrelated: FlowWithSteps = {
      id: 'flw-healthcheck' as FlowId,
      architectureId: archId,
      name: 'Health Check Flow',
      type: 'api_flow',
      steps: [],
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    };

    // Ownership records
    const ownerships: ObjectOwnership[] = [
      {
        objectId: objAuth.id,
        primaryTeamId: teamSecurity,
        updatedAt: new Date(),
      },
      {
        objectId: objDb.id,
        primaryTeamId: teamData,
        updatedAt: new Date(),
      },
    ];

    // Target changes:
    // 1. objAuth modified (name change)
    const objAuthModified: ModelObject = {
      ...objAuth,
      versionId: ver2,
      name: 'Authentication & Session Service',
    };

    // 2. Added new billing service
    const objBillingAdded: ModelObject = {
      id: 'app-billing' as ObjectId,
      architectureId: archId,
      versionId: ver2,
      name: 'Billing Service',
      kind: 'application',
      createdAt: new Date('2026-10-02T00:00:00Z'),
      updatedAt: new Date('2026-10-02T00:00:00Z'),
    };

    // 3. Modified connGatewayAuth (label change)
    const connGatewayAuthModified: ModelConnection = {
      ...connGatewayAuth,
      versionId: ver2,
      label: 'OAuth PKCE Verify',
    };

    // 4. Added new connection to billing
    const connGwBillingAdded: ModelConnection = {
      id: 'con-gw-billing' as ConnectionId,
      architectureId: archId,
      versionId: ver2,
      sourceObjectId: objGateway.id,
      targetObjectId: objBillingAdded.id,
      label: 'Process Charges',
      kind: 'sync',
      createdAt: new Date('2026-10-02T00:00:00Z'),
      updatedAt: new Date('2026-10-02T00:00:00Z'),
    };

    const input: ComputeChangeSetInput = {
      title: 'Auth Refactor & Billing Introduction',
      baseObjects: [objGateway, objAuth, objDb],
      targetObjects: [objGateway, objAuthModified, objDb, objBillingAdded],
      baseConnections: [connGatewayAuth, connAuthDb],
      targetConnections: [connGatewayAuthModified, connAuthDb, connGwBillingAdded],
      flows: [flowLogin, flowUnrelated],
      ownerships,
    };

    const changeSet = computeArchitectureChangeSet(input);

    // 1. Verify direct changes list
    expect(changeSet.changes.added).toHaveLength(2); // objBillingAdded + connGwBillingAdded
    expect(changeSet.changes.modified).toHaveLength(2); // objAuthModified + connGatewayAuthModified
    expect(changeSet.changes.removed).toHaveLength(0);
    expect(changeSet.changes.totalDirectChanges).toBe(4);

    // 2. Acceptance Test: a change reports the correct affected sets (objects, flows, teams)
    // Affected Objects must include:
    // - objAuth (directly modified)
    // - objBillingAdded (directly added)
    // - objGateway (endpoint of modified connGatewayAuth and added connGwBillingAdded)
    expect(changeSet.affected.affectedObjectIds).toContain(objAuth.id);
    expect(changeSet.affected.affectedObjectIds).toContain(objBillingAdded.id);
    expect(changeSet.affected.affectedObjectIds).toContain(objGateway.id);
    expect(changeSet.affected.counts.objects).toBeGreaterThanOrEqual(3);

    // Affected Flows:
    // - flowLogin traverses connGatewayAuth (modified) -> MUST be affected
    // - flowUnrelated does not touch changed connections or objects -> MUST NOT be affected
    expect(changeSet.affected.affectedFlowIds).toContain(flowLogin.id);
    expect(changeSet.affected.affectedFlowIds).not.toContain(flowUnrelated.id);
    expect(changeSet.affected.counts.flows).toBe(1);

    // Affected Teams:
    // - teamSecurity (owns objAuth)
    // - teamPlatform (owns objGateway via metadata)
    expect(changeSet.affected.affectedTeamIds).toContain(teamSecurity);
    expect(changeSet.affected.affectedTeamIds).toContain(teamPlatform);
    expect(changeSet.affected.counts.teams).toBeGreaterThanOrEqual(2);
  });

  it('2. correctly identifies removed connection impact on flows and endpoints', () => {
    const objA: ModelObject = {
      id: 'app-a' as ObjectId,
      architectureId: archId,
      versionId: ver1,
      name: 'Service A',
      kind: 'application',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const objB: ModelObject = {
      id: 'app-b' as ObjectId,
      architectureId: archId,
      versionId: ver1,
      name: 'Service B',
      kind: 'application',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const connAB: ModelConnection = {
      id: 'con-ab' as ConnectionId,
      architectureId: archId,
      versionId: ver1,
      sourceObjectId: objA.id,
      targetObjectId: objB.id,
      kind: 'sync',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const flowAB: FlowWithSteps = {
      id: 'flw-ab' as FlowId,
      architectureId: archId,
      name: 'A to B Flow',
      type: 'api_flow',
      steps: [
        {
          id: 'step-ab',
          flowId: 'flw-ab' as FlowId,
          connectionId: connAB.id,
          order: 1,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Remove connAB in target
    const changeSet = computeArchitectureChangeSet({
      baseObjects: [objA, objB],
      targetObjects: [objA, objB],
      baseConnections: [connAB],
      targetConnections: [],
      flows: [flowAB],
    });

    expect(changeSet.changes.removed).toHaveLength(1);
    expect(changeSet.changes.removed[0].id).toBe(connAB.id);
    expect(changeSet.affected.affectedObjectIds).toContain(objA.id);
    expect(changeSet.affected.affectedObjectIds).toContain(objB.id);
    expect(changeSet.affected.affectedFlowIds).toContain(flowAB.id);
  });
});
