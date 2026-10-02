import React from 'react';

export interface PresencePeerBadge {
  userId: string;
  userName: string;
  userColor: string;
  status: 'active' | 'idle' | 'offline';
  role?: string;
  currentObjectName?: string | null;
  currentViewName?: string | null;
}

export interface PresenceIndicatorsProps {
  peers: PresencePeerBadge[];
  currentUserId?: string;
  maxVisible?: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

export function PresenceIndicators({
  peers,
  currentUserId,
  maxVisible = 5,
  className = '',
}: PresenceIndicatorsProps): JSX.Element {
  const filteredPeers = peers.filter(
    (p) => p.status !== 'offline' && (!currentUserId || p.userId !== currentUserId)
  );

  const visiblePeers = filteredPeers.slice(0, maxVisible);
  const overflowCount = Math.max(0, filteredPeers.length - maxVisible);

  return (
    <div
      data-testid="presence-indicators"
      aria-label="Active Collaborators"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/80 border border-slate-700/70 rounded-full backdrop-blur-md shadow-md ${className}`}
    >
      {/* Live Pulsing Dot */}
      <span
        data-testid="presence-live-pulse"
        className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"
        title="Live presence active"
      />

      <span
        data-testid="presence-peer-count"
        className="text-[11px] font-semibold text-slate-300 mr-1 select-none"
      >
        {`${filteredPeers.length} ${filteredPeers.length === 1 ? 'peer' : 'peers'}`}
      </span>

      {/* Avatar Stack */}
      <div className="flex items-center -space-x-1.5">
        {visiblePeers.map((peer) => {
          const color = peer.userColor || '#3b82f6';
          const initials = getInitials(peer.userName);
          const isIdle = peer.status === 'idle';

          return (
            <div
              key={peer.userId}
              data-testid={`presence-avatar-${peer.userId}`}
              title={`${peer.userName}${peer.role ? ` (${peer.role})` : ''}${
                peer.currentObjectName ? ` · Viewing ${peer.currentObjectName}` : ''
              }${isIdle ? ' (Idle)' : ''}`}
              className="relative group cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 transition-transform group-hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>

              {/* Status dot */}
              <span
                className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ring-1 ring-slate-900 ${
                  isIdle ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />

              {/* Tooltip on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                <div className="px-2 py-1 bg-slate-950 text-slate-200 text-[10px] rounded shadow-lg whitespace-nowrap border border-slate-800">
                  <div className="font-semibold text-white">{peer.userName}</div>
                  {peer.currentObjectName && (
                    <div className="text-slate-400">
                      Object: <span className="text-slate-200">{peer.currentObjectName}</span>
                    </div>
                  )}
                  {peer.currentViewName && (
                    <div className="text-slate-400">
                      View: <span className="text-slate-200">{peer.currentViewName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {overflowCount > 0 && (
          <div
            data-testid="presence-avatar-overflow"
            className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-300 ring-2 ring-slate-900"
          >
            {`+${overflowCount}`}
          </div>
        )}
      </div>
    </div>
  );
}
