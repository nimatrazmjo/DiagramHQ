import React from 'react';

export interface CollabPeer {
  id: string;
  name: string;
  color?: string;
  isCurrentUser?: boolean;
}

export interface CollaborationBannerProps {
  isConnected?: boolean;
  isSyncing?: boolean;
  peerCount?: number;
  peers?: CollabPeer[];
  operationCount?: number;
  conflictCount?: number;
  currentUserName?: string;
  onSyncNow?: () => void;
}

export function CollaborationBanner({
  isConnected = true,
  isSyncing = false,
  peerCount = 1,
  peers = [],
  operationCount = 0,
  conflictCount = 0,
  currentUserName,
  onSyncNow,
}: CollaborationBannerProps): JSX.Element {
  const statusColor = isConnected
    ? isSyncing
      ? 'bg-amber-400'
      : 'bg-emerald-400'
    : 'bg-rose-400';

  const statusText = isConnected
    ? isSyncing
      ? 'Syncing...'
      : 'Live Collaboration'
    : 'Disconnected';

  return (
    <div
      data-testid="collab-banner"
      aria-label="Collaboration Status"
      className="fixed bottom-4 left-6 z-30 flex items-center gap-3 px-3.5 py-2 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl shadow-xl text-xs text-slate-200 pointer-events-auto"
    >
      {/* Live Indicator Dot */}
      <div className="flex items-center gap-1.5">
        <span
          data-testid="collab-status-dot"
          className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}
        />
        <span
          data-testid="collab-status-text"
          className="font-medium text-slate-300 select-none"
        >
          {statusText}
        </span>
      </div>

      <div className="h-3 w-px bg-slate-800" />

      {/* Peer Count & Avatars */}
      <div className="flex items-center gap-1.5" data-testid="collab-peer-container">
        <span className="text-slate-400 select-none">
          {peerCount === 1 ? '1 editor' : `${peerCount} editors`}
        </span>
        {peers.length > 0 && (
          <div className="flex -space-x-1.5 items-center">
            {peers.slice(0, 4).map((peer) => (
              <span
                key={peer.id}
                title={peer.name}
                data-testid={`collab-peer-${peer.id}`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border border-slate-800"
                style={{ backgroundColor: peer.color ?? '#6366f1' }}
              >
                {peer.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Operations Synced */}
      {operationCount > 0 && (
        <>
          <div className="h-3 w-px bg-slate-800" />
          <span
            data-testid="collab-op-counter"
            className="text-[11px] font-mono text-cyan-300"
          >
            {`${operationCount} ops`}
          </span>
        </>
      )}

      {/* Conflict Resolution Badge */}
      {conflictCount > 0 && (
        <span
          data-testid="collab-conflict-badge"
          className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono"
        >
          {`${conflictCount} LWW resolved`}
        </span>
      )}

      {/* Current User Badge */}
      {currentUserName && (
        <span
          data-testid="collab-user-badge"
          className="text-slate-400 text-[11px] truncate max-w-[100px]"
        >
          {`as ${currentUserName}`}
        </span>
      )}

      {/* Manual Sync Trigger */}
      {onSyncNow && (
        <button
          type="button"
          data-testid="collab-sync-button"
          onClick={onSyncNow}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors ml-1"
        >
          Sync
        </button>
      )}
    </div>
  );
}
