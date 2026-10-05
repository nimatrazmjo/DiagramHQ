'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface LeftNavigatorProps {
  workspaceId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  name: string;
  pathSuffix: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

export function LeftNavigator({
  workspaceId,
  isOpen = false,
  onClose,
}: LeftNavigatorProps): JSX.Element {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: 'overview',
      name: 'Overview',
      pathSuffix: '',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: 'systems',
      name: 'Systems',
      pathSuffix: '/systems',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="6" rx="2" />
          <rect x="2" y="15" width="20" height="6" rx="2" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
          <circle cx="6" cy="18" r="1" fill="currentColor" />
          <line x1="10" y1="6" x2="18" y2="6" />
          <line x1="10" y1="18" x2="18" y2="18" />
        </svg>
      ),
    },
    {
      id: 'apps',
      name: 'Apps',
      pathSuffix: '/apps',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="2" width="16" height="20" rx="3" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
          <line x1="9" y1="6" x2="15" y2="6" />
        </svg>
      ),
    },
    {
      id: 'data',
      name: 'Data',
      pathSuffix: '/data',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
    {
      id: 'flows',
      name: 'Flows',
      pathSuffix: '/flows',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <circle cx="18" cy="6" r="3" />
          <path d="M6 9v12" />
          <path d="M18 9v3a3 3 0 0 1-3 3H6" />
        </svg>
      ),
    },
    {
      id: 'views',
      name: 'Views',
      pathSuffix: '/views',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      id: 'decisions',
      name: 'Decisions',
      pathSuffix: '/decisions',
      icon: (active) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#60a5fa' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <polyline points="9 15 11 17 15 13" />
        </svg>
      ),
    },
  ];

  const isItemActive = (pathSuffix: string): boolean => {
    const itemHref = `/workspace/${workspaceId}${pathSuffix}`;
    if (!pathname) return false;
    if (pathSuffix === '') {
      return pathname === itemHref || pathname === `${itemHref}/`;
    }
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  };

  const navContent = (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] border-r border-slate-800 text-slate-300 select-none">
      {/* Navigator Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-900 border border-slate-800 transition-colors"
          title="Return to Dashboard"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Dashboard</span>
        </Link>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Section Title */}
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Architecture Model
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Workspace navigation"
        className="flex-1 px-2 py-1 overflow-y-auto flex flex-col gap-0.5"
      >
        {navItems.map((item) => {
          const active = isItemActive(item.pathSuffix);
          const href = `/workspace/${workspaceId}${item.pathSuffix}`;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'text-white font-semibold bg-slate-800 border-l-[3px] border-blue-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-l-[3px] border-transparent'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center ${
                  active ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                {item.icon(active)}
              </span>
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Status Area */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          DiagramHQ
        </span>
        <span className="opacity-70 font-mono">v0.1</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view: fixed 240px width sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0 w-60 min-w-[240px] h-full relative">
        {navContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop overlay */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[80vw] h-full z-[51] shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

export default LeftNavigator;
