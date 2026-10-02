/**
 * DiagramHQ - Presence Domain Logic (F049)
 *
 * Pure, framework-agnostic presence state management for multi-user collaboration.
 * Tracks live cursors, object selections, active viewports, and peer heartbeats.
 */

export interface CursorPosition {
  x: number;
  y: number;
  viewId?: string;
  lastActiveAt: number;
}

export type PeerActivityStatus = 'active' | 'idle' | 'offline';

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  avatarUrl?: string;
  role?: string;
  status: PeerActivityStatus;
  cursor: CursorPosition | null;
  selectedObjectIds: string[];
  selectedConnectionIds: string[];
  currentObjectId: string | null;
  currentViewId: string | null;
  lastHeartbeatAt: number;
}

export interface PresenceRoomState {
  workspaceId: string;
  peers: Record<string, UserPresence>;
  updatedAt: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  viewId?: string;
  lastActiveAt: number;
}

export interface PeerIdentity {
  userId: string;
  userName: string;
  userColor: string;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30_000; // 30 seconds
const DEFAULT_OFFLINE_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Creates an empty presence room for a given workspace.
 */
export function createPresenceRoom(
  workspaceId: string,
  now: number = Date.now()
): PresenceRoomState {
  if (!workspaceId.trim()) {
    throw new Error('Workspace ID cannot be empty');
  }

  return {
    workspaceId,
    peers: {},
    updatedAt: now,
  };
}

/**
 * Adds or updates a user's presence state within the room.
 */
export function upsertPeerPresence(
  room: PresenceRoomState,
  peer: Partial<UserPresence> & { userId: string; userName: string; userColor: string },
  now: number = Date.now()
): PresenceRoomState {
  const existing = room.peers[peer.userId];
  const updatedPeer: UserPresence = {
    userId: peer.userId,
    userName: peer.userName,
    userColor: peer.userColor,
    avatarUrl: peer.avatarUrl ?? existing?.avatarUrl,
    role: peer.role ?? existing?.role,
    status: peer.status ?? existing?.status ?? 'active',
    cursor: peer.cursor !== undefined ? peer.cursor : (existing?.cursor ?? null),
    selectedObjectIds: peer.selectedObjectIds ?? existing?.selectedObjectIds ?? [],
    selectedConnectionIds:
      peer.selectedConnectionIds ?? existing?.selectedConnectionIds ?? [],
    currentObjectId:
      peer.currentObjectId !== undefined
        ? peer.currentObjectId
        : (existing?.currentObjectId ?? null),
    currentViewId:
      peer.currentViewId !== undefined
        ? peer.currentViewId
        : (existing?.currentViewId ?? null),
    lastHeartbeatAt: now,
  };

  return {
    ...room,
    peers: {
      ...room.peers,
      [peer.userId]: updatedPeer,
    },
    updatedAt: now,
  };
}

/**
 * Updates a specific peer's cursor position and marks them active.
 */
export function updatePeerCursor(
  room: PresenceRoomState,
  userId: string,
  cursor: { x: number; y: number; viewId?: string } | null,
  now: number = Date.now()
): PresenceRoomState {
  const existing = room.peers[userId];
  if (!existing) {
    return room;
  }

  const newCursor: CursorPosition | null = cursor
    ? {
        x: cursor.x,
        y: cursor.y,
        viewId: cursor.viewId ?? existing.currentViewId ?? undefined,
        lastActiveAt: now,
      }
    : null;

  return {
    ...room,
    peers: {
      ...room.peers,
      [userId]: {
        ...existing,
        cursor: newCursor,
        status: 'active',
        lastHeartbeatAt: now,
      },
    },
    updatedAt: now,
  };
}

/**
 * Updates a specific peer's selection and active object focus.
 */
export function updatePeerSelection(
  room: PresenceRoomState,
  userId: string,
  selection: {
    selectedObjectIds?: string[];
    selectedConnectionIds?: string[];
    currentObjectId?: string | null;
    currentViewId?: string | null;
  },
  now: number = Date.now()
): PresenceRoomState {
  const existing = room.peers[userId];
  if (!existing) {
    return room;
  }

  return {
    ...room,
    peers: {
      ...room.peers,
      [userId]: {
        ...existing,
        selectedObjectIds: selection.selectedObjectIds ?? existing.selectedObjectIds,
        selectedConnectionIds:
          selection.selectedConnectionIds ?? existing.selectedConnectionIds,
        currentObjectId:
          selection.currentObjectId !== undefined
            ? selection.currentObjectId
            : existing.currentObjectId,
        currentViewId:
          selection.currentViewId !== undefined
            ? selection.currentViewId
            : existing.currentViewId,
        status: 'active',
        lastHeartbeatAt: now,
      },
    },
    updatedAt: now,
  };
}

/**
 * Removes a peer from the presence room (e.g. on disconnect).
 */
export function removePeerPresence(
  room: PresenceRoomState,
  userId: string,
  now: number = Date.now()
): PresenceRoomState {
  if (!room.peers[userId]) {
    return room;
  }

  const nextPeers = { ...room.peers };
  delete nextPeers[userId];

  return {
    ...room,
    peers: nextPeers,
    updatedAt: now,
  };
}

/**
 * Prunes inactive peers based on idle and offline thresholds.
 * Peers older than `offlineTimeoutMs` are removed; peers older than `idleTimeoutMs` are set to 'idle'.
 */
export function pruneInactivePeers(
  room: PresenceRoomState,
  options: {
    idleTimeoutMs?: number;
    offlineTimeoutMs?: number;
    now?: number;
  } = {}
): PresenceRoomState {
  const now = options.now ?? Date.now();
  const idleTimeout = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const offlineTimeout = options.offlineTimeoutMs ?? DEFAULT_OFFLINE_TIMEOUT_MS;

  let changed = false;
  const nextPeers: Record<string, UserPresence> = {};

  for (const [id, peer] of Object.entries(room.peers)) {
    const elapsed = now - peer.lastHeartbeatAt;
    if (elapsed >= offlineTimeout) {
      // Evict disconnected peer
      changed = true;
      continue;
    } else if (elapsed >= idleTimeout) {
      if (peer.status !== 'idle') {
        changed = true;
        nextPeers[id] = {
          ...peer,
          status: 'idle',
        };
      } else {
        nextPeers[id] = peer;
      }
    } else {
      nextPeers[id] = peer;
    }
  }

  if (!changed) {
    return room;
  }

  return {
    ...room,
    peers: nextPeers,
    updatedAt: now,
  };
}

/**
 * Gets all peers currently active or idle in a specific view.
 */
export function getActivePeersInView(
  room: PresenceRoomState,
  viewId: string,
  excludeUserId?: string
): UserPresence[] {
  return Object.values(room.peers).filter((peer) => {
    if (excludeUserId && peer.userId === excludeUserId) return false;
    return peer.status !== 'offline' && peer.currentViewId === viewId;
  });
}

/**
 * Extracts remote cursor positions for rendering on a specific diagram view canvas.
 */
export function getRemoteCursorsForView(
  room: PresenceRoomState,
  viewId: string,
  excludeUserId?: string
): RemoteCursor[] {
  const cursors: RemoteCursor[] = [];

  for (const peer of Object.values(room.peers)) {
    if (excludeUserId && peer.userId === excludeUserId) {
      continue;
    }
    if (peer.status === 'offline' || !peer.cursor) {
      continue;
    }
    // Match view if specified on cursor or peer
    const cursorView = peer.cursor.viewId ?? peer.currentViewId;
    if (cursorView === viewId) {
      cursors.push({
        userId: peer.userId,
        userName: peer.userName,
        userColor: peer.userColor,
        x: peer.cursor.x,
        y: peer.cursor.y,
        viewId: cursorView,
        lastActiveAt: peer.cursor.lastActiveAt,
      });
    }
  }

  return cursors;
}

/**
 * Returns a map of objectId -> list of peers who currently have that object selected.
 */
export function getRemoteSelections(
  room: PresenceRoomState,
  excludeUserId?: string
): Record<string, PeerIdentity[]> {
  const map: Record<string, PeerIdentity[]> = {};

  for (const peer of Object.values(room.peers)) {
    if (excludeUserId && peer.userId === excludeUserId) {
      continue;
    }
    if (peer.status === 'offline') {
      continue;
    }
    for (const objId of peer.selectedObjectIds) {
      if (!map[objId]) {
        map[objId] = [];
      }
      map[objId]!.push({
        userId: peer.userId,
        userName: peer.userName,
        userColor: peer.userColor,
      });
    }
  }

  return map;
}

/**
 * Returns a map of objectId -> list of peers who currently have that object focused (current-object).
 */
export function getRemoteActiveObjects(
  room: PresenceRoomState,
  excludeUserId?: string
): Record<string, PeerIdentity[]> {
  const map: Record<string, PeerIdentity[]> = {};

  for (const peer of Object.values(room.peers)) {
    if (excludeUserId && peer.userId === excludeUserId) {
      continue;
    }
    if (peer.status === 'offline' || !peer.currentObjectId) {
      continue;
    }
    const objId = peer.currentObjectId;
    if (!map[objId]) {
      map[objId] = [];
    }
    map[objId]!.push({
      userId: peer.userId,
      userName: peer.userName,
      userColor: peer.userColor,
    });
  }

  return map;
}
