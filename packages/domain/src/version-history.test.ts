import { describe, it, expect } from 'vitest';
import type { ArchitectureId, ConnectionId, ModelConnection, ModelObject, ObjectId, VersionId } from './';
import {
  createLiveVersion,
  createNumberedSnapshot,
  mutateLiveVersion,
  assertVersionEditable,
  SnapshotImmutableError,
  listArchitectureSnapshots,
  findSnapshotByVersionNumber,
  restoreSnapshotToLive,
} from './version-history';

describe('Version History & Snapshot Immutability Domain (F055)', () => {
  const ARCH_ID = 'arch-payments' as ArchitectureId;
  const LIVE_VER_ID = 'ver-live' as VersionId;
  const RESTORED_VER_ID = 'ver-restored' as VersionId;

  const createDummyObject = (id: string, name: string): ModelObject => ({
    id: id as ObjectId,
    architectureId: ARCH_ID,
    versionId: LIVE_VER_ID,
    kind: 'application',
    name,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });

  const createDummyConnection = (
    id: string,
    sourceId: string,
    targetId: string
  ): ModelConnection => ({
    id: id as ConnectionId,
    architectureId: ARCH_ID,
    versionId: LIVE_VER_ID,
    sourceObjectId: sourceId as ObjectId,
    targetObjectId: targetId as ObjectId,
    kind: 'sync',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });

  it('1. creates a live version and captures an immutable numbered snapshot', () => {
    const obj1 = createDummyObject('app-gw', 'API Gateway');
    const obj2 = createDummyObject('app-auth', 'Auth Service');
    const conn1 = createDummyConnection('conn-1', 'app-gw', 'app-auth');

    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'main', [obj1, obj2], [conn1]);

    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.0.0',
      label: 'Production Release 1.0',
      description: 'Initial stable launch',
      createdBy: 'user-lead',
      now: 1_700_800_000_000,
    });

    expect(snapshot.id).toMatch(/^snp_/);
    expect(snapshot.versionNumber).toBe('v1.0.0');
    expect(snapshot.label).toBe('Production Release 1.0');
    expect(snapshot.isImmutable).toBe(true);
    expect(snapshot.snapshotData.objects.length).toBe(2);
    expect(snapshot.snapshotData.connections.length).toBe(1);
  });

  it('2. Acceptance Test: snapshot stays immutable while live edits continue', () => {
    // 1. Initial live version with 2 objects
    const obj1 = createDummyObject('app-gw', 'API Gateway');
    const obj2 = createDummyObject('app-auth', 'Auth Service');
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'main', [obj1, obj2]);

    // 2. Take numbered snapshot "v1.0"
    const snapshotV1 = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Release 1.0',
      createdBy: 'alice',
      now: 1_700_800_000_000,
    });

    // 3. Mutate live version:
    //    - Modify name of obj1
    //    - Remove obj2
    //    - Add new obj3
    mutateLiveVersion(live, (draft) => {
      draft.objects[0]!.name = 'API Gateway Enterprise (Modified)';
      draft.objects = draft.objects.filter((o) => o.id !== ('app-auth' as ObjectId));
      draft.objects.push(createDummyObject('app-billing', 'Stripe Billing Worker'));
    });

    // 4. Assert Live Version reflects all mutations
    expect(live.objects.length).toBe(2);
    expect(live.objects[0]?.name).toBe('API Gateway Enterprise (Modified)');
    expect(live.objects.find((o) => o.id === ('app-auth' as ObjectId))).toBeUndefined();
    expect(live.objects.find((o) => o.id === ('app-billing' as ObjectId))).toBeDefined();

    // 5. Assert Snapshot V1 remains strictly unchanged!
    expect(snapshotV1.snapshotData.objects.length).toBe(2);
    expect(snapshotV1.snapshotData.objects[0]?.name).toBe('API Gateway');
    expect(snapshotV1.snapshotData.objects[1]?.name).toBe('Auth Service');
    expect(
      snapshotV1.snapshotData.objects.find((o) => o.id === ('app-auth' as ObjectId))
    ).toBeDefined();
    expect(
      snapshotV1.snapshotData.objects.find((o) => o.id === ('app-billing' as ObjectId))
    ).toBeUndefined();
  });

  it('3. throws SnapshotImmutableError when asserting editability on a snapshot', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID);
    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v2.0',
      label: 'Release 2.0',
      createdBy: 'bob',
    });

    // Live version is editable
    expect(() => assertVersionEditable(live)).not.toThrow();

    // Snapshot throws error
    expect(() => assertVersionEditable(snapshot)).toThrow(SnapshotImmutableError);
  });

  it('4. prevents modification of snapshot frozen objects', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'main', [
      createDummyObject('app-1', 'Initial'),
    ]);
    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Freeze Test',
      createdBy: 'alice',
    });

    // Frozen objects throw TypeError when mutated in strict mode
    expect(() => {
      // @ts-expect-error - testing runtime freeze
      snapshot.snapshotData.objects[0].name = 'Hacked';
    }).toThrow(TypeError);
  });

  it('5. lists and finds snapshots by version number', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID);

    const snap1 = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Release 1',
      createdBy: 'alice',
      now: 1_000,
    });

    const snap2 = createNumberedSnapshot(live, {
      versionNumber: 'v1.1',
      label: 'Release 1.1',
      createdBy: 'bob',
      now: 2_000,
    });

    const snapshots = [snap1, snap2];

    const listed = listArchitectureSnapshots(snapshots, ARCH_ID, 'desc');
    expect(listed.map((s) => s.versionNumber)).toEqual(['v1.1', 'v1.0']);

    const found = findSnapshotByVersionNumber(snapshots, ARCH_ID, 'v1.0');
    expect(found?.id).toBe(snap1.id);

    const notFound = findSnapshotByVersionNumber(snapshots, ARCH_ID, 'v9.9');
    expect(notFound).toBeNull();
  });

  it('6. restores a snapshot to a new live editable version', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'main', [
      createDummyObject('app-gw', 'API Gateway'),
      createDummyObject('app-auth', 'Auth Service'),
    ]);

    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Golden Master',
      createdBy: 'alice',
    });

    const restoredLive = restoreSnapshotToLive(snapshot, RESTORED_VER_ID, 'main (restored v1.0)');

    expect(restoredLive.id).toBe(RESTORED_VER_ID);
    expect(restoredLive.name).toBe('main (restored v1.0)');
    expect(restoredLive.isLive).toBe(true);
    expect(restoredLive.objects.length).toBe(2);
    expect(restoredLive.objects[0]?.versionId).toBe(RESTORED_VER_ID);

    // Restored live is editable without affecting original snapshot
    mutateLiveVersion(restoredLive, (draft) => {
      draft.objects.push(createDummyObject('app-new', 'New Service'));
    });
    expect(restoredLive.objects.length).toBe(3);
    expect(snapshot.snapshotData.objects.length).toBe(2);
  });
});
