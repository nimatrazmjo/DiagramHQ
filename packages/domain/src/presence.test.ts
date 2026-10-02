import { describe, it, expect } from 'vitest';
import {
  createPresenceRoom,
  upsertPeerPresence,
  updatePeerCursor,
  updatePeerSelection,
  removePeerPresence,
  pruneInactivePeers,
  getActivePeersInView,
  getRemoteCursorsForView,
  getRemoteSelections,
  getRemoteActiveObjects,
} from './presence';

describe('Presence Domain Logic (F049)', () => {
  const WORKSPACE_ID = 'ws-test-123';
  const VIEW_1 = 'view-context-1';
  const VIEW_2 = 'view-container-2';
  const T0 = 100_000;

  it('1. creates an empty presence room for a workspace', () => {
    const room = createPresenceRoom(WORKSPACE_ID, T0);
    expect(room.workspaceId).toBe(WORKSPACE_ID);
    expect(room.peers).toEqual({});
    expect(room.updatedAt).toBe(T0);

    expect(() => createPresenceRoom('')).toThrow('Workspace ID cannot be empty');
  });

  it('2. adds and updates peer presence state', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);

    room = upsertPeerPresence(
      room,
      {
        userId: 'user-alice',
        userName: 'Alice',
        userColor: '#3b82f6',
        currentViewId: VIEW_1,
      },
      T0
    );

    const alice = room.peers['user-alice'];
    expect(alice).toBeDefined();
    expect(alice?.userName).toBe('Alice');
    expect(alice?.status).toBe('active');
    expect(alice?.currentViewId).toBe(VIEW_1);
    expect(alice?.cursor).toBeNull();
    expect(alice?.selectedObjectIds).toEqual([]);

    // Update with additional fields
    room = upsertPeerPresence(
      room,
      {
        userId: 'user-alice',
        userName: 'Alice M.',
        userColor: '#2563eb',
        role: 'Architect',
      },
      T0 + 1000
    );

    const aliceUpdated = room.peers['user-alice'];
    expect(aliceUpdated?.userName).toBe('Alice M.');
    expect(aliceUpdated?.userColor).toBe('#2563eb');
    expect(aliceUpdated?.role).toBe('Architect');
    expect(aliceUpdated?.currentViewId).toBe(VIEW_1); // preserved
  });

  it('3. updates peer cursor position and marks active', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);
    room = upsertPeerPresence(
      room,
      { userId: 'user-bob', userName: 'Bob', userColor: '#10b981', currentViewId: VIEW_1 },
      T0
    );

    room = updatePeerCursor(room, 'user-bob', { x: 350, y: 420 }, T0 + 500);
    const bob = room.peers['user-bob'];
    expect(bob?.cursor).toEqual({
      x: 350,
      y: 420,
      viewId: VIEW_1,
      lastActiveAt: T0 + 500,
    });
  });

  it('4. Acceptance Test: presence shows both users + cursors', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);

    // User A joins and moves cursor
    room = upsertPeerPresence(
      room,
      { userId: 'user-a', userName: 'User A', userColor: '#ef4444', currentViewId: VIEW_1 },
      T0
    );
    room = updatePeerCursor(room, 'user-a', { x: 120, y: 240, viewId: VIEW_1 }, T0 + 100);

    // User B joins and moves cursor
    room = upsertPeerPresence(
      room,
      { userId: 'user-b', userName: 'User B', userColor: '#8b5cf6', currentViewId: VIEW_1 },
      T0 + 200
    );
    room = updatePeerCursor(room, 'user-b', { x: 580, y: 310, viewId: VIEW_1 }, T0 + 300);

    // Both users are present in the room
    expect(Object.keys(room.peers)).toHaveLength(2);
    expect(room.peers['user-a']?.userName).toBe('User A');
    expect(room.peers['user-b']?.userName).toBe('User B');

    // From perspective of User A: User B's cursor is visible
    const cursorsForUserA = getRemoteCursorsForView(room, VIEW_1, 'user-a');
    expect(cursorsForUserA).toHaveLength(1);
    expect(cursorsForUserA[0]).toEqual({
      userId: 'user-b',
      userName: 'User B',
      userColor: '#8b5cf6',
      x: 580,
      y: 310,
      viewId: VIEW_1,
      lastActiveAt: T0 + 300,
    });

    // From perspective of User B: User A's cursor is visible
    const cursorsForUserB = getRemoteCursorsForView(room, VIEW_1, 'user-b');
    expect(cursorsForUserB).toHaveLength(1);
    expect(cursorsForUserB[0]).toEqual({
      userId: 'user-a',
      userName: 'User A',
      userColor: '#ef4444',
      x: 120,
      y: 240,
      viewId: VIEW_1,
      lastActiveAt: T0 + 100,
    });

    // From a spectator / canvas render perspective: all cursors are visible
    const allCursors = getRemoteCursorsForView(room, VIEW_1);
    expect(allCursors).toHaveLength(2);
    expect(allCursors.map((c) => c.userName)).toContain('User A');
    expect(allCursors.map((c) => c.userName)).toContain('User B');
  });

  it('5. isolates cursors and peers across different diagram views', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);
    room = upsertPeerPresence(
      room,
      { userId: 'user-a', userName: 'User A', userColor: '#ef4444', currentViewId: VIEW_1 },
      T0
    );
    room = updatePeerCursor(room, 'user-a', { x: 100, y: 100, viewId: VIEW_1 }, T0);

    room = upsertPeerPresence(
      room,
      { userId: 'user-b', userName: 'User B', userColor: '#8b5cf6', currentViewId: VIEW_2 },
      T0
    );
    room = updatePeerCursor(room, 'user-b', { x: 500, y: 500, viewId: VIEW_2 }, T0);

    // View 1 only sees User A
    const cursorsView1 = getRemoteCursorsForView(room, VIEW_1);
    expect(cursorsView1).toHaveLength(1);
    expect(cursorsView1[0]?.userId).toBe('user-a');

    // View 2 only sees User B
    const cursorsView2 = getRemoteCursorsForView(room, VIEW_2);
    expect(cursorsView2).toHaveLength(1);
    expect(cursorsView2[0]?.userId).toBe('user-b');

    // Active peers query matches
    expect(getActivePeersInView(room, VIEW_1).map((p) => p.userId)).toEqual(['user-a']);
    expect(getActivePeersInView(room, VIEW_2).map((p) => p.userId)).toEqual(['user-b']);
  });

  it('6. tracks remote selection and current-object focus', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);
    room = upsertPeerPresence(
      room,
      { userId: 'user-a', userName: 'User A', userColor: '#ef4444', currentViewId: VIEW_1 },
      T0
    );
    room = upsertPeerPresence(
      room,
      { userId: 'user-b', userName: 'User B', userColor: '#3b82f6', currentViewId: VIEW_1 },
      T0
    );

    // User A selects obj-1 and obj-2, focusing obj-1
    room = updatePeerSelection(
      room,
      'user-a',
      {
        selectedObjectIds: ['obj-1', 'obj-2'],
        currentObjectId: 'obj-1',
      },
      T0 + 100
    );

    // User B selects obj-2 and obj-3, focusing obj-2
    room = updatePeerSelection(
      room,
      'user-b',
      {
        selectedObjectIds: ['obj-2', 'obj-3'],
        currentObjectId: 'obj-2',
      },
      T0 + 200
    );

    // Inspect selections from perspective of third peer or canvas
    const selections = getRemoteSelections(room);
    expect(selections['obj-1']).toHaveLength(1);
    expect(selections['obj-1']?.[0]?.userName).toBe('User A');

    expect(selections['obj-2']).toHaveLength(2); // both selected obj-2!
    expect(selections['obj-2']?.map((p) => p.userName)).toContain('User A');
    expect(selections['obj-2']?.map((p) => p.userName)).toContain('User B');

    expect(selections['obj-3']).toHaveLength(1);
    expect(selections['obj-3']?.[0]?.userName).toBe('User B');

    // Inspect active object focus
    const activeObjects = getRemoteActiveObjects(room);
    expect(activeObjects['obj-1']?.[0]?.userName).toBe('User A');
    expect(activeObjects['obj-2']?.[0]?.userName).toBe('User B');
    expect(activeObjects['obj-3']).toBeUndefined();
  });

  it('7. removes peer presence on disconnect', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);
    room = upsertPeerPresence(
      room,
      { userId: 'user-temp', userName: 'Temp', userColor: '#ccc' },
      T0
    );
    expect(room.peers['user-temp']).toBeDefined();

    room = removePeerPresence(room, 'user-temp', T0 + 1000);
    expect(room.peers['user-temp']).toBeUndefined();
  });

  it('8. prunes inactive and disconnected peers based on thresholds', () => {
    let room = createPresenceRoom(WORKSPACE_ID, T0);
    room = upsertPeerPresence(
      room,
      { userId: 'user-active', userName: 'Active', userColor: '#10b981' },
      T0
    );
    room = upsertPeerPresence(
      room,
      { userId: 'user-idle', userName: 'Idle', userColor: '#f59e0b' },
      T0 - 35_000 // 35 seconds ago
    );
    room = upsertPeerPresence(
      room,
      { userId: 'user-dead', userName: 'Dead', userColor: '#6b7280' },
      T0 - 65_000 // 65 seconds ago
    );

    const pruned = pruneInactivePeers(room, {
      idleTimeoutMs: 30_000,
      offlineTimeoutMs: 60_000,
      now: T0,
    });

    expect(pruned.peers['user-active']?.status).toBe('active');
    expect(pruned.peers['user-idle']?.status).toBe('idle');
    expect(pruned.peers['user-dead']).toBeUndefined(); // evicted
  });
});
