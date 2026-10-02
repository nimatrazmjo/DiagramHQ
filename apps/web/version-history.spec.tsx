/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createLiveVersion,
  createNumberedSnapshot,
  mutateLiveVersion,
  assertVersionEditable,
  SnapshotImmutableError,
} from '@diagramhq/domain';
import type {
  ArchitectureId,
  ModelObject,
  ObjectId,
  VersionId,
} from '@diagramhq/domain';
import {
  SnapshotBadge,
  VersionTimeline,
} from './components/canvas';

describe('Version History & Immutability Integration & UI (F055)', () => {
  const ARCH_ID = 'arch-payments' as ArchitectureId;
  const LIVE_VER_ID = 'ver-live' as VersionId;

  const createDummyObject = (id: string, name: string): ModelObject => ({
    id: id as ObjectId,
    architectureId: ARCH_ID,
    versionId: LIVE_VER_ID,
    kind: 'application',
    name,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });

  it('1. Acceptance Test: snapshot stays immutable while live edits continue', () => {
    // 1. Setup live version with 2 objects
    const obj1 = createDummyObject('app-gw', 'Edge API Gateway');
    const obj2 = createDummyObject('app-auth', 'Auth Service');
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'main', [obj1, obj2]);

    // 2. Create immutable numbered snapshot v1.0
    const snapshotV1 = createNumberedSnapshot(live, {
      versionNumber: 'v1.0.0',
      label: 'Production Core v1.0.0',
      description: 'First production release with edge gateway and auth',
      createdBy: 'user-lead-architect',
      now: 1_700_900_000_000,
    });

    expect(snapshotV1.isImmutable).toBe(true);
    expect(snapshotV1.snapshotData.objects.length).toBe(2);

    // 3. Continue live edits (mutate live version)
    mutateLiveVersion(live, (draft) => {
      // Modify first object
      draft.objects[0]!.name = 'Edge API Gateway 2.0';
      // Add a third object
      draft.objects.push(createDummyObject('app-db', 'Primary Postgres DB'));
    });

    // 4. Verify live version has updated state
    expect(live.objects.length).toBe(3);
    expect(live.objects[0]?.name).toBe('Edge API Gateway 2.0');
    expect(live.objects[2]?.name).toBe('Primary Postgres DB');

    // 5. Verify snapshot remains completely immutable and untouched
    expect(snapshotV1.snapshotData.objects.length).toBe(2);
    expect(snapshotV1.snapshotData.objects[0]?.name).toBe('Edge API Gateway');
    expect(snapshotV1.snapshotData.objects[1]?.name).toBe('Auth Service');
    expect(snapshotV1.snapshotData.objects[2]).toBeUndefined();
  });

  it('2. throws SnapshotImmutableError when attempting to assert editability on snapshot', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID);
    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Stable',
      createdBy: 'alice',
    });

    expect(() => assertVersionEditable(live)).not.toThrow();
    expect(() => assertVersionEditable(snapshot)).toThrow(SnapshotImmutableError);
  });

  it('3. renders <SnapshotBadge /> with lock icon and metadata', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID);
    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.2.0',
      label: 'Q4 Release',
      createdBy: 'bob',
    });

    const html = renderToString(<SnapshotBadge snapshot={snapshot} />);
    expect(html).toContain('data-testid="snapshot-badge"');
    expect(html).toContain('data-version-number="v1.2.0"');
    expect(html).toContain('lock');
    expect(html).toContain('v1.2.0');
    expect(html).toContain('Q4 Release');
  });

  it('4. renders <VersionTimeline /> with live editable indicator and snapshot items', () => {
    const live = createLiveVersion(ARCH_ID, LIVE_VER_ID, 'Production Core');
    const snapshot = createNumberedSnapshot(live, {
      versionNumber: 'v1.0',
      label: 'Initial Release',
      createdBy: 'alice',
    });

    const html = renderToString(
      <VersionTimeline
        liveVersion={live}
        snapshots={[snapshot]}
        onSelectSnapshot={() => {}}
        onCreateSnapshot={() => {}}
        onRestoreSnapshot={() => {}}
      />
    );

    expect(html).toContain('data-testid="version-timeline"');
    expect(html).toContain('Version History');
    expect(html).toContain('data-testid="create-snapshot-btn"');
    expect(html).toContain('data-testid="live-version-item"');
    expect(html).toContain('Live Editable');
    expect(html).toContain('Production Core');
    expect(html).toContain('data-testid="snapshot-item"');
    expect(html).toContain('v1.0');
    expect(html).toContain('Initial Release');
    expect(html).toContain('data-testid="view-snapshot-v1.0"');
    expect(html).toContain('data-testid="restore-snapshot-v1.0"');
  });
});
