/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createTeam,
  assignObjectOwnership,
  filterObjectsByOwner,
  filterModelByOwner,
  getObjectOwnership,
} from '@diagramhq/domain';
import type {
  ArchitectureId,
  ArchitectureModel,
  ConnectionId,
  ModelConnection,
  ModelObject,
  ObjectId,
  OrgId,
  VersionId,
  WorkspaceId,
} from '@diagramhq/domain';
import {
  TeamBadge,
  OwnershipFilterSelector,
} from './components/canvas';

describe('Team Management & Ownership Integration & UI (F054)', () => {
  const ORG_ID = 'org-diagramhq' as OrgId;
  const ARCH_ID = 'arch-demo' as ArchitectureId;
  const VER_ID = 'ver-main' as VersionId;

  const createDummyObject = (id: string, name: string): ModelObject => ({
    id: id as ObjectId,
    architectureId: ARCH_ID,
    versionId: VER_ID,
    kind: 'application',
    name,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });

  it('1. Acceptance Test: assign owner; filter by owner returns the set (show everything owned by X)', () => {
    // 1. Create two distinct teams
    const platformTeam = createTeam({
      orgId: ORG_ID,
      name: 'Platform Engineering',
      memberUserIds: ['user-alice', 'user-bob'],
      leadUserId: 'user-alice',
    });

    const paymentsTeam = createTeam({
      orgId: ORG_ID,
      name: 'Payments Core',
      memberUserIds: ['user-charlie'],
    });

    // 2. Assign ownership to architecture objects
    const gateway = assignObjectOwnership(createDummyObject('app-gateway', 'API Gateway'), {
      primaryTeamId: platformTeam.id,
      backupTeamId: paymentsTeam.id,
    });
    expect(getObjectOwnership(gateway)?.primaryTeamId).toBe(platformTeam.id);
    expect(getObjectOwnership(gateway)?.backupTeamId).toBe(paymentsTeam.id);

    const authService = assignObjectOwnership(createDummyObject('app-auth', 'Auth Service'), {
      primaryTeamId: platformTeam.id,
    });

    const paymentProcessor = assignObjectOwnership(
      createDummyObject('app-payment', 'Payment Processor'),
      {
        primaryTeamId: paymentsTeam.id,
      }
    );

    const legacyDb = createDummyObject('app-legacy-db', 'Unassigned Database');

    const allObjects = [gateway, authService, paymentProcessor, legacyDb];

    // 3. Filter by Platform Engineering: returns gateway + auth service
    const platformOwned = filterObjectsByOwner(allObjects, platformTeam.id);
    expect(platformOwned.length).toBe(2);
    expect(platformOwned.map((o) => o.name)).toEqual(['API Gateway', 'Auth Service']);

    // 4. Filter by Payments Core: returns payment processor
    const paymentsOwned = filterObjectsByOwner(allObjects, paymentsTeam.id);
    expect(paymentsOwned.length).toBe(1);
    expect(paymentsOwned[0]?.name).toBe('Payment Processor');

    // 5. Filter by Payments Core with backup ownership included: returns gateway + payment processor
    const paymentsWithBackup = filterObjectsByOwner(allObjects, paymentsTeam.id, {
      includeBackup: true,
    });
    expect(paymentsWithBackup.length).toBe(2);
    expect(paymentsWithBackup.map((o) => o.name)).toContain('API Gateway');
    expect(paymentsWithBackup.map((o) => o.name)).toContain('Payment Processor');
  });

  it('2. filters an entire architecture model query by owner team', () => {
    const teamA = createTeam({ orgId: ORG_ID, name: 'Team Alpha' });
    const teamB = createTeam({ orgId: ORG_ID, name: 'Team Beta' });

    const objA1 = assignObjectOwnership(createDummyObject('obj-a1', 'Service A1'), {
      primaryTeamId: teamA.id,
    });
    const objA2 = assignObjectOwnership(createDummyObject('obj-a2', 'Service A2'), {
      primaryTeamId: teamA.id,
    });
    const objB1 = assignObjectOwnership(createDummyObject('obj-b1', 'Service B1'), {
      primaryTeamId: teamB.id,
    });

    const internalConn: ModelConnection = {
      id: 'conn-internal' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: objA1.id,
      targetObjectId: objA2.id,
      kind: 'sync',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const crossConn: ModelConnection = {
      id: 'conn-cross' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: objA1.id,
      targetObjectId: objB1.id,
      kind: 'async',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const model: ArchitectureModel = {
      architecture: { id: ARCH_ID, workspaceId: 'ws-demo' as WorkspaceId, name: 'Model', createdAt: new Date(), updatedAt: new Date() },
      version: { id: VER_ID, architectureId: ARCH_ID, name: 'v1', kind: 'main', status: 'draft', createdAt: new Date() },
      objects: [objA1, objA2, objB1],
      connections: [internalConn, crossConn],
    };

    const alphaSubset = filterModelByOwner(model, teamA.id);
    expect(alphaSubset.objects.map((o) => o.id)).toEqual(['obj-a1', 'obj-a2']);
    expect(alphaSubset.connections.map((c) => c.id)).toEqual(['conn-internal']);
  });

  it('3. renders <TeamBadge /> for primary and backup roles', () => {
    const team = createTeam({
      orgId: ORG_ID,
      name: 'Platform Engineering',
    });

    const primaryHtml = renderToString(<TeamBadge team={team} role="primary" />);
    expect(primaryHtml).toContain('data-testid="team-badge"');
    expect(primaryHtml).toContain('Platform Engineering');
    expect(primaryHtml).toContain('(Owner)');

    const backupHtml = renderToString(<TeamBadge team={team} role="backup" />);
    expect(backupHtml).toContain('Platform Engineering');
    expect(backupHtml).toContain('(Backup)');
  });

  it('4. renders <OwnershipFilterSelector /> component with team list', () => {
    const team1 = createTeam({ orgId: ORG_ID, name: 'Core SRE' });
    const team2 = createTeam({ orgId: ORG_ID, name: 'Data Platform' });

    const html = renderToString(
      <OwnershipFilterSelector
        teams={[team1, team2]}
        selectedTeamId={team1.id}
        onSelectTeam={() => {}}
        includeBackup={true}
        onToggleIncludeBackup={() => {}}
      />
    );

    expect(html).toContain('data-testid="ownership-filter-selector"');
    expect(html).toContain('Filter by Owner:');
    expect(html).toContain('Core SRE');
    expect(html).toContain('Data Platform');
    expect(html).toContain('data-testid="ownership-include-backup-checkbox"');
  });
});
