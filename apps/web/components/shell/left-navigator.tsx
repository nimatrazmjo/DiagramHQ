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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#0a0d14',
        borderRight: '1px solid #1e293b',
        color: '#cbd5e1',
        userSelect: 'none',
      }}
    >
      {/* Navigator Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            transition: 'color 0.15s ease, background-color 0.15s ease',
          }}
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
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
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
      <div
        style={{
          padding: '12px 16px 6px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#64748b',
        }}
      >
        Architecture Model
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Workspace navigation"
        style={{
          flex: 1,
          padding: '4px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {navItems.map((item) => {
          const active = isItemActive(item.pathSuffix);
          const href = `/workspace/${workspaceId}${item.pathSuffix}`;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? '#ffffff' : '#94a3b8',
                backgroundColor: active ? '#1e293b' : 'transparent',
                borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? '#60a5fa' : '#64748b',
                }}
              >
                {item.icon(active)}
              </span>
              <span style={{ flex: 1 }}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Status Area */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #1e293b',
          fontSize: '11px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }}
          />
          Architecture OS
        </span>
        <span style={{ opacity: 0.7 }}>v0.1</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view: fixed 240px width sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: '240px',
          minWidth: '240px',
          height: '100%',
          position: 'relative',
        }}
      >
        {navContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop overlay */}
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(2px)',
            }}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            style={{
              position: 'relative',
              width: '260px',
              maxWidth: '80vw',
              height: '100%',
              zIndex: 51,
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

export default LeftNavigator;
