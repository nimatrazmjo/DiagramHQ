/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createPresenceRoom,
  upsertPeerPresence,
  updatePeerCursor,
  updatePeerSelection,
  getRemoteCursorsForView,
  getRemoteSelections,
  getRemoteActiveObjects,
  pruneInactivePeers,
} from '@diagramhq/domain';
import {
  PresenceCursors,
  PresenceIndicators,
  type PresenceCursorItem,
  type PresencePeerBadge,
} from './components/canvas';

describe('Presence Integration & UI (F049)', () => {
  const WORKSPACE_ID = 'ws-collab-777';
  const VIEW_CONTEXT = 'view-c4-context';
  const VIEW_CONTAINER = 'view-c4-container';
  const NOW = 1_700_000_000;

  it('1. Acceptance Test: presence shows both users + cursors', () => {
    let room = createPresenceRoom(WORKSPACE_ID, NOW);

    // User 1 (Alice) connects and moves cursor
    room = upsertPeerPresence(
      room,
      {
        userId: 'u1',
        userName: 'Alice Miller',
        userColor: '#10b981',
        currentViewId: VIEW_CONTEXT,
      },
      NOW
    );
    room = updatePeerCursor(room, 'u1', { x: 250, y: 180, viewId: VIEW_CONTEXT }, NOW + 10);

    // User 2 (Bob) connects and moves cursor
    room = upsertPeerPresence(
      room,
      {
        userId: 'u2',
        userName: 'Bob Smith',
        userColor: '#6366f1',
        currentViewId: VIEW_CONTEXT,
      },
      NOW + 20
    );
    room = updatePeerCursor(room, 'u2', { x: 540, y: 390, viewId: VIEW_CONTEXT }, NOW + 30);

    // Both users exist in presence state
    expect(Object.keys(room.peers)).toHaveLength(2);
    expect(room.peers['u1']?.userName).toBe('Alice Miller');
    expect(room.peers['u2']?.userName).toBe('Bob Smith');

    // Both cursors are tracked and active in VIEW_CONTEXT
    const allCursors = getRemoteCursorsForView(room, VIEW_CONTEXT);
    expect(allCursors).toHaveLength(2);
    expect(allCursors.map((c) => c.userName)).toEqual(
      expect.arrayContaining(['Alice Miller', 'Bob Smith'])
    );

    // Alice sees Bob's cursor
    const cursorsSeenByAlice = getRemoteCursorsForView(room, VIEW_CONTEXT, 'u1');
    expect(cursorsSeenByAlice).toHaveLength(1);
    expect(cursorsSeenByAlice[0]?.userName).toBe('Bob Smith');
    expect(cursorsSeenByAlice[0]?.x).toBe(540);
    expect(cursorsSeenByAlice[0]?.y).toBe(390);

    // Bob sees Alice's cursor
    const cursorsSeenByBob = getRemoteCursorsForView(room, VIEW_CONTEXT, 'u2');
    expect(cursorsSeenByBob).toHaveLength(1);
    expect(cursorsSeenByBob[0]?.userName).toBe('Alice Miller');
    expect(cursorsSeenByBob[0]?.x).toBe(250);
    expect(cursorsSeenByBob[0]?.y).toBe(180);
  });

  it('2. tracks remote selections and current-object focus for multi-client editing', () => {
    let room = createPresenceRoom(WORKSPACE_ID, NOW);

    room = upsertPeerPresence(
      room,
      {
        userId: 'u1',
        userName: 'Alice',
        userColor: '#10b981',
        currentViewId: VIEW_CONTEXT,
      },
      NOW
    );
    room = upsertPeerPresence(
      room,
      {
        userId: 'u2',
        userName: 'Bob',
        userColor: '#6366f1',
        currentViewId: VIEW_CONTEXT,
      },
      NOW
    );

    // Alice selects node 'api-gateway' and sets it as current object
    room = updatePeerSelection(
      room,
      'u1',
      {
        selectedObjectIds: ['api-gateway'],
        currentObjectId: 'api-gateway',
      },
      NOW + 10
    );

    // Bob selects both 'api-gateway' and 'database', focusing 'database'
    room = updatePeerSelection(
      room,
      'u2',
      {
        selectedObjectIds: ['api-gateway', 'database'],
        currentObjectId: 'database',
      },
      NOW + 20
    );

    // Remote selections show both users on 'api-gateway'
    const selections = getRemoteSelections(room);
    expect(selections['api-gateway']).toHaveLength(2);
    expect(selections['database']).toHaveLength(1);
    expect(selections['database']?.[0]?.userName).toBe('Bob');

    // Remote active objects track individual focus
    const activeObjects = getRemoteActiveObjects(room);
    expect(activeObjects['api-gateway']?.[0]?.userName).toBe('Alice');
    expect(activeObjects['database']?.[0]?.userName).toBe('Bob');
  });

  it('3. isolates presence cursors across diagram view navigation', () => {
    let room = createPresenceRoom(WORKSPACE_ID, NOW);

    room = upsertPeerPresence(
      room,
      {
        userId: 'u1',
        userName: 'Alice',
        userColor: '#10b981',
        currentViewId: VIEW_CONTEXT,
      },
      NOW
    );
    room = updatePeerCursor(room, 'u1', { x: 100, y: 100, viewId: VIEW_CONTEXT }, NOW);

    room = upsertPeerPresence(
      room,
      {
        userId: 'u2',
        userName: 'Bob',
        userColor: '#6366f1',
        currentViewId: VIEW_CONTAINER,
      },
      NOW
    );
    room = updatePeerCursor(room, 'u2', { x: 400, y: 400, viewId: VIEW_CONTAINER }, NOW);

    // Only Alice is seen in Context view
    const contextCursors = getRemoteCursorsForView(room, VIEW_CONTEXT);
    expect(contextCursors).toHaveLength(1);
    expect(contextCursors[0]?.userName).toBe('Alice');

    // Only Bob is seen in Container view
    const containerCursors = getRemoteCursorsForView(room, VIEW_CONTAINER);
    expect(containerCursors).toHaveLength(1);
    expect(containerCursors[0]?.userName).toBe('Bob');
  });

  it('4. detects idle peers and prunes disconnected peers', () => {
    let room = createPresenceRoom(WORKSPACE_ID, NOW);

    room = upsertPeerPresence(
      room,
      { userId: 'u-live', userName: 'Live', userColor: '#10b981' },
      NOW
    );
    room = upsertPeerPresence(
      room,
      { userId: 'u-idle', userName: 'Idle', userColor: '#f59e0b' },
      NOW - 45_000 // 45s ago
    );
    room = upsertPeerPresence(
      room,
      { userId: 'u-dead', userName: 'Dead', userColor: '#6b7280' },
      NOW - 75_000 // 75s ago
    );

    const pruned = pruneInactivePeers(room, {
      idleTimeoutMs: 30_000,
      offlineTimeoutMs: 60_000,
      now: NOW,
    });

    expect(pruned.peers['u-live']?.status).toBe('active');
    expect(pruned.peers['u-idle']?.status).toBe('idle');
    expect(pruned.peers['u-dead']).toBeUndefined();
  });

  it('5. renders the <PresenceCursors /> overlay component', () => {
    const cursors: PresenceCursorItem[] = [
      {
        userId: 'u2',
        userName: 'Bob Smith',
        userColor: '#6366f1',
        x: 320,
        y: 210,
        currentObjectName: 'Auth Service',
        selectionCount: 2,
      },
    ];

    const html = renderToString(
      <PresenceCursors cursors={cursors} currentUserId="u1" />
    );

    expect(html).toContain('data-testid="presence-cursors-container"');
    expect(html).toContain('data-testid="presence-cursor-u2"');
    expect(html).toContain('Bob Smith');
    expect(html).toContain('Auth Service');
    expect(html).toContain('+2');
    expect(html).toContain('left:320px');
    expect(html).toContain('top:210px');
  });

  it('6. renders the <PresenceIndicators /> avatar stack and pulse', () => {
    const peers: PresencePeerBadge[] = [
      {
        userId: 'u1',
        userName: 'Alice Miller',
        userColor: '#10b981',
        status: 'active',
        role: 'Architect',
        currentObjectName: 'Edge Gateway',
      },
      {
        userId: 'u2',
        userName: 'Bob Smith',
        userColor: '#6366f1',
        status: 'idle',
        role: 'Developer',
      },
      {
        userId: 'u3',
        userName: 'Charlie Davis',
        userColor: '#f59e0b',
        status: 'active',
      },
    ];

    const html = renderToString(
      <PresenceIndicators peers={peers} currentUserId="local-user" maxVisible={2} />
    );

    expect(html).toContain('data-testid="presence-indicators"');
    expect(html).toContain('data-testid="presence-live-pulse"');
    expect(html).toContain('3 peers');
    expect(html).toContain('data-testid="presence-avatar-u1"');
    expect(html).toContain('AM'); // Initials for Alice Miller
    expect(html).toContain('data-testid="presence-avatar-u2"');
    expect(html).toContain('BS'); // Initials for Bob Smith
    expect(html).toContain('data-testid="presence-avatar-overflow"');
    expect(html).toContain('+1'); // 3 total - 2 visible = 1 overflow
  });
});
