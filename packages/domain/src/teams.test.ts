import { describe, it, expect } from 'vitest';
import type { ArchitectureModel, ModelConnection, ModelObject } from './types';
import type {
  ArchitectureId,
  ConnectionId,
  ObjectId,
  OrgId,
  TeamId,
  VersionId,
  WorkspaceId,
} from './ids';
import {
  createTeam,
  addTeamMember,
  removeTeamMember,
  setTeamLead,
  isTeamMember,
  assignObjectOwnership,
  getObjectOwnership,
  isObjectOwnedByTeam,
  filterObjectsByOwner,
  filterModelByOwner,
} from './teams';

describe('Team Management & Object Ownership Domain (F054)', () => {
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

  it('1. creates a new team with slug and unique members', () => {
    const team = createTeam({
      orgId: ORG_ID,
      name: 'Platform Engineering',
      description: 'Infrastructure and foundation microservices',
      memberUserIds: ['user-alice', 'user-bob', 'user-alice'],
      leadUserId: 'user-alice',
    });

    expect(team.id).toMatch(/^team_/);
    expect(team.name).toBe('Platform Engineering');
    expect(team.slug).toBe('platform-engineering');
    expect(team.memberUserIds).toEqual(['user-alice', 'user-bob']);
    expect(team.leadUserId).toBe('user-alice');
  });

  it('2. adds and removes members, and sets team lead', () => {
    let team = createTeam({
      orgId: ORG_ID,
      name: 'Payments Core',
      memberUserIds: ['user-alice'],
    });

    // Add member
    team = addTeamMember(team, 'user-carol');
    expect(team.memberUserIds).toContain('user-carol');
    expect(isTeamMember(team, 'user-carol')).toBe(true);

    // Set lead (not in member list -> auto added)
    team = setTeamLead(team, 'user-dave');
    expect(team.leadUserId).toBe('user-dave');
    expect(team.memberUserIds).toContain('user-dave');

    // Remove lead
    team = removeTeamMember(team, 'user-dave');
    expect(team.leadUserId).toBeNull();
    expect(team.memberUserIds).not.toContain('user-dave');
  });

  it('3. assigns object ownership and retrieves it', () => {
    const obj = createDummyObject('app-gateway', 'API Gateway');
    const primaryTeam = 'team-platform' as TeamId;
    const backupTeam = 'team-sre' as TeamId;

    const ownedObj = assignObjectOwnership(obj, {
      primaryTeamId: primaryTeam,
      backupTeamId: backupTeam,
      leadContactUserId: 'user-alice',
      now: new Date('2026-10-02T12:00:00Z'),
    });

    const ownership = getObjectOwnership(ownedObj);
    expect(ownership).not.toBeNull();
    expect(ownership?.primaryTeamId).toBe(primaryTeam);
    expect(ownership?.backupTeamId).toBe(backupTeam);
    expect(ownership?.leadContactUserId).toBe('user-alice');
    expect(isObjectOwnedByTeam(ownedObj, primaryTeam)).toBe(true);
    expect(isObjectOwnedByTeam(ownedObj, backupTeam, { includeBackup: true })).toBe(true);
    expect(isObjectOwnedByTeam(ownedObj, backupTeam, { includeBackup: false })).toBe(false);
  });

  it('4. Acceptance Test: assign owner; filter by owner returns the set', () => {
    const teamA = 'team-platform' as TeamId;
    const teamB = 'team-checkout' as TeamId;

    const obj1 = assignObjectOwnership(createDummyObject('app-gateway', 'Gateway'), {
      primaryTeamId: teamA,
    });
    const obj2 = assignObjectOwnership(createDummyObject('app-auth', 'Auth'), {
      primaryTeamId: teamA,
    });
    const obj3 = assignObjectOwnership(createDummyObject('app-payment', 'Payment Svc'), {
      primaryTeamId: teamB,
    });
    const obj4 = createDummyObject('app-legacy', 'Legacy Monolith'); // unassigned

    const allObjects = [obj1, obj2, obj3, obj4];

    // Filter by teamA returns exactly obj1 and obj2
    const teamAObjects = filterObjectsByOwner(allObjects, teamA);
    expect(teamAObjects.map((o) => o.id)).toEqual(['app-gateway', 'app-auth']);

    // Filter by teamB returns obj3
    const teamBObjects = filterObjectsByOwner(allObjects, teamB);
    expect(teamBObjects.map((o) => o.id)).toEqual(['app-payment']);
  });

  it('5. filters entire architecture model including intra-team connections', () => {
    const teamA = 'team-platform' as TeamId;
    const teamB = 'team-checkout' as TeamId;

    const obj1 = assignObjectOwnership(createDummyObject('app-gateway', 'Gateway'), {
      primaryTeamId: teamA,
    });
    const obj2 = assignObjectOwnership(createDummyObject('app-auth', 'Auth'), {
      primaryTeamId: teamA,
    });
    const obj3 = assignObjectOwnership(createDummyObject('app-payment', 'Payment Svc'), {
      primaryTeamId: teamB,
    });

    const connInternal: ModelConnection = {
      id: 'con-1' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: obj1.id,
      targetObjectId: obj2.id,
      kind: 'sync',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const connCrossTeam: ModelConnection = {
      id: 'con-2' as ConnectionId,
      architectureId: ARCH_ID,
      versionId: VER_ID,
      sourceObjectId: obj1.id,
      targetObjectId: obj3.id,
      kind: 'sync',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const model: ArchitectureModel = {
      architecture: { id: ARCH_ID, workspaceId: 'ws-demo' as WorkspaceId, name: 'Arch', createdAt: new Date(), updatedAt: new Date() },
      version: { id: VER_ID, architectureId: ARCH_ID, name: 'v1', kind: 'main', status: 'draft', createdAt: new Date() },
      objects: [obj1, obj2, obj3],
      connections: [connInternal, connCrossTeam],
    };

    const filtered = filterModelByOwner(model, teamA);

    // Objects
    expect(filtered.objects.map((o) => o.id)).toEqual(['app-gateway', 'app-auth']);
    // Only internal connection between gateway and auth is kept
    expect(filtered.connections.map((c) => c.id)).toEqual(['con-1']);
  });

  it('6. parses legacy metadata format when extracting ownership', () => {
    const legacyObj: ModelObject = {
      ...createDummyObject('app-db', 'Database'),
      metadata: {
        team: 'team-infra',
        backupTeam: 'team-sre',
      },
    };

    const ownership = getObjectOwnership(legacyObj);
    expect(ownership?.primaryTeamId).toBe('team-infra');
    expect(ownership?.backupTeamId).toBe('team-sre');
    expect(isObjectOwnedByTeam(legacyObj, 'team-infra' as TeamId)).toBe(true);
  });
});
