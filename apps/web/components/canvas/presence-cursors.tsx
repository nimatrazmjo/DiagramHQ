import React from 'react';

export interface PresenceCursorItem {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  viewId?: string;
  currentObjectName?: string | null;
  selectionCount?: number;
}

export interface PresenceCursorsProps {
  cursors: PresenceCursorItem[];
  currentUserId?: string;
  containerWidth?: number;
  containerHeight?: number;
}

export function PresenceCursors({
  cursors,
  currentUserId,
}: PresenceCursorsProps): JSX.Element {
  const visibleCursors = cursors.filter(
    (c) => !currentUserId || c.userId !== currentUserId
  );

  return (
    <div
      data-testid="presence-cursors-container"
      aria-label="Remote Cursors"
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
    >
      {visibleCursors.map((cursor) => {
        const color = cursor.userColor || '#3b82f6';
        return (
          <div
            key={cursor.userId}
            data-testid={`presence-cursor-${cursor.userId}`}
            className="absolute transition-transform duration-75 ease-out will-change-transform"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              transform: 'translate(0, 0)',
            }}
          >
            {/* Custom SVG Cursor Arrow */}
            <svg
              className="w-5 h-5 drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name and context pill */}
            <div
              className="ml-3 -mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white shadow-md select-none whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              <span data-testid={`presence-cursor-name-${cursor.userId}`}>
                {cursor.userName}
              </span>
              {cursor.currentObjectName && (
                <span
                  data-testid={`presence-cursor-object-${cursor.userId}`}
                  className="px-1 py-0.2 bg-black/20 rounded text-[10px] opacity-90"
                >
                  {cursor.currentObjectName}
                </span>
              )}
              {cursor.selectionCount !== undefined && cursor.selectionCount > 1 && (
                <span
                  data-testid={`presence-cursor-selection-${cursor.userId}`}
                  className="px-1 bg-black/25 rounded-full text-[9px]"
                >
                  {`+${cursor.selectionCount}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
