'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectDirection = 'top' | 'right' | 'bottom' | 'left';

export interface QuickInsertHandleProps {
  nodeId: string;
  selected?: boolean;
  color?: string;
  title?: string;
  className?: string;
}

const DIRECTIONS: ConnectDirection[] = ['top', 'right', 'bottom', 'left'];

const DIRECTION_CONFIG: Record<
  ConnectDirection,
  {
    containerClass: string;
    title: string;
    ariaLabel: string;
  }
> = {
  right: {
    containerClass: '-right-6 top-1/2 -translate-y-1/2',
    title: 'Insert same object and connect to the right (+)',
    ariaLabel: 'Insert same object and connect to the right',
  },
  left: {
    containerClass: '-left-6 top-1/2 -translate-y-1/2',
    title: 'Insert same object and connect to the left (+)',
    ariaLabel: 'Insert same object and connect to the left',
  },
  top: {
    containerClass: '-top-6 left-1/2 -translate-x-1/2',
    title: 'Insert same object and connect above (+)',
    ariaLabel: 'Insert same object and connect above',
  },
  bottom: {
    containerClass: '-bottom-6 left-1/2 -translate-x-1/2',
    title: 'Insert same object and connect below (+)',
    ariaLabel: 'Insert same object and connect below',
  },
};

/**
 * Directional quick-insert handle button.
 *
 * When the user moves their mouse close to any of the 4 connection points
 * (top, right, bottom, left), the circular plus handle (+) appears at that
 * specific location. It does NOT show on general node hover in the center.
 */
export function QuickInsertHandle({
  nodeId,
  selected = false,
  color = '#38bdf8',
  title = 'Insert same object and connect (+)',
  className = '',
}: QuickInsertHandleProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDirection, setActiveDirection] = useState<ConnectDirection | null>(null);
  const isHoveringBtnRef = useRef(false);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      // Proximity checks for the 4 connection locations:
      // Right handle: (w, h / 2)
      const isNearRight =
        x >= w - 30 && x <= w + 28 && Math.abs(y - h / 2) <= Math.max(34, h * 0.4);

      // Left handle: (0, h / 2)
      const isNearLeft =
        x >= -28 && x <= 30 && Math.abs(y - h / 2) <= Math.max(34, h * 0.4);

      // Top handle: (w / 2, 0)
      const isNearTop =
        y >= -28 && y <= 30 && Math.abs(x - w / 2) <= Math.max(38, w * 0.35);

      // Bottom handle: (w / 2, h)
      const isNearBottom =
        y >= h - 30 && y <= h + 28 && Math.abs(x - w / 2) <= Math.max(38, w * 0.35);

      if (isNearRight) {
        setActiveDirection('right');
      } else if (isNearLeft) {
        setActiveDirection('left');
      } else if (isNearTop) {
        setActiveDirection('top');
      } else if (isNearBottom) {
        setActiveDirection('bottom');
      } else {
        if (!isHoveringBtnRef.current) {
          setActiveDirection(null);
        }
      }
    };

    const handleMouseLeave = () => {
      if (!isHoveringBtnRef.current) {
        setActiveDirection(null);
      }
    };

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleClick = useCallback(
    (dir: ConnectDirection, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('canvas:quick-connect-insert', {
            detail: {
              sourceNodeId: nodeId,
              direction: dir,
            },
          }),
        );
      }
    },
    [nodeId],
  );

  return (
    <div
      ref={containerRef}
      data-testid="quick-insert-handle"
      className={`pointer-events-none ${className}`}
    >
      {DIRECTIONS.map((dir) => {
        const isCurrent = activeDirection === dir;
        const config = DIRECTION_CONFIG[dir];

        return (
          <div
            key={dir}
            data-direction={dir}
            className={`absolute z-30 transition-all duration-150 ${config.containerClass} ${
              isCurrent
                ? 'opacity-100 scale-100 pointer-events-auto visible'
                : 'opacity-0 scale-75 pointer-events-none invisible'
            }`}
          >
            <button
              type="button"
              data-testid="quick-insert-btn"
              data-direction={dir}
              onClick={(e) => handleClick(dir, e)}
              onMouseEnter={() => {
                isHoveringBtnRef.current = true;
                setActiveDirection(dir);
              }}
              onMouseLeave={() => {
                isHoveringBtnRef.current = false;
              }}
              title={config.title}
              aria-label={config.ariaLabel}
              className="w-5 h-5 rounded-full hover:scale-110 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg border border-slate-950/80 transition-transform cursor-pointer"
              style={{ backgroundColor: color }}
            >
              <svg
                className="w-3 h-3 stroke-[2.8]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
