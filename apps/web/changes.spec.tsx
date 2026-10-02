import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  computeArchitectureChangeSet,
  type ComputeChangeSetInput,
  type ModelObject,
  type ModelConnection,
  type FlowWithSteps,
  type ObjectOwnership,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type FlowId,
  type TeamId,
} from '@diagramhq/domain';
import { ImpactAnalysisBadge, ChangeSetSummary } from './components/canvas/change-set-summary';

describe('Architecture Changes & Impact Analysis Integration & UI (F059)', () => {
  const archId = 'arch-demo' as ArchitectureId;
  const v1 = 'v1' as VersionId;
  const v2 = 'v2' as VersionId;

  const teamData = 'team-data' as TeamId;
  const teamPlatform = 'team-platform' as TeamId;

  const objApi: ModelObject = {
    id: 'app-api' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Customer API',
    kind: 'application',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    metadata: { ownerTeamId: teamPlatform },
  };

  const objDb: ModelObject = {
    id: 'sto-db' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Postgres DB',
    kind: 'store',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const connApiDb: ModelConnection = {
    id: 'con-api-db' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: objApi.id,
    targetObjectId: objDb.id,
    label: 'SQL Queries',
    kind: 'sync',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const flowData: FlowWithSteps = {
    id: 'flw-customer-fetch' as FlowId,
    architectureId: archId,
    name: 'Customer Profile Fetch',
    type: 'api_flow',
    steps: [
      {
        id: 'step-1',
        flowId: 'flw-customer-fetch' as FlowId,
        connectionId: connApiDb.id,
        stepIndex: 1,
      },
    ],
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const ownerships: ObjectOwnership[] = [
    {
      objectId: objDb.id,
      primaryTeamId: teamData,
      updatedAt: new Date(),
    },
  ];

  it('1. Acceptance Test: a change reports the correct affected sets (objects, flows, teams)', () => {
    // Target change: objDb modified
    const objDbModified: ModelObject = {
      ...objDb,
      versionId: v2,
      name: 'PostgreSQL 16 High-Availability Cluster',
    };

    const input: ComputeChangeSetInput = {
      title: 'Upgrade Database Cluster',
      baseObjects: [objApi, objDb],
      targetObjects: [objApi, objDbModified],
      baseConnections: [connApiDb],
      targetConnections: [connApiDb],
      flows: [flowData],
      ownerships,
    };

    const changeSet = computeArchitectureChangeSet(input);

    // Direct changes
    expect(changeSet.changes.modified).toHaveLength(1);
    expect(changeSet.changes.modified[0]!.id).toBe(objDb.id);
    expect(changeSet.changes.totalDirectChanges).toBe(1);

    // Affected sets
    expect(changeSet.affected.affectedObjectIds).toContain(objDb.id);
    expect(changeSet.affected.affectedFlowIds).toContain(flowData.id);
    expect(changeSet.affected.affectedTeamIds).toContain(teamData);

    expect(changeSet.affected.counts.objects).toBe(1);
    expect(changeSet.affected.counts.flows).toBe(1);
    expect(changeSet.affected.counts.teams).toBe(1);
  });

  it('2. renders <ImpactAnalysisBadge /> with compact affected counters', () => {
    const objDbModified: ModelObject = {
      ...objDb,
      versionId: v2,
      name: 'PostgreSQL 16 High-Availability Cluster',
    };

    const changeSet = computeArchitectureChangeSet({
      title: 'Upgrade Database Cluster',
      baseObjects: [objApi, objDb],
      targetObjects: [objApi, objDbModified],
      baseConnections: [connApiDb],
      targetConnections: [connApiDb],
      flows: [flowData],
      ownerships,
    });

    const html = renderToString(<ImpactAnalysisBadge changeSet={changeSet} />);

    expect(html).toContain('crisis_alert');
    expect(html).toContain('1 changes');
    expect(html).toContain('1 objs');
    expect(html).toContain('1 flows');
    expect(html).toContain('1 teams');
  });

  it('3. renders <ChangeSetSummary /> with direct changes and affected impact lists', () => {
    const objDbModified: ModelObject = {
      ...objDb,
      versionId: v2,
      name: 'PostgreSQL 16 High-Availability Cluster',
    };

    const changeSet = computeArchitectureChangeSet({
      title: 'Upgrade Database Cluster',
      description: 'Major PostgreSQL version upgrade with HA failover.',
      baseObjects: [objApi, objDb],
      targetObjects: [objApi, objDbModified],
      baseConnections: [connApiDb],
      targetConnections: [connApiDb],
      flows: [flowData],
      ownerships,
    });

    const onClose = vi.fn();
    const onOpenPr = vi.fn();

    const html = renderToString(
      <ChangeSetSummary
        changeSet={changeSet}
        onClose={onClose}
        onOpenPr={onOpenPr}
      />
    );

    expect(html).toContain('Upgrade Database Cluster');
    expect(html).toContain('Major PostgreSQL version upgrade with HA failover.');
    expect(html).toContain('Direct Changes (1)');
    expect(html).toContain('Impact Analysis (3)');
    expect(html).toContain('PostgreSQL 16 High-Availability Cluster');
    expect(html).toContain('Create Pull Request');
  });
});
