'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export interface TopBarProps {
  workspaceId?: string;
  workspaceName?: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  onToggleNavigator?: () => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export function TopBar({
  workspaceId,
  workspaceName = 'Workspace',
  user,
  onToggleNavigator,
  onToggleInspector,
  isInspectorOpen = false,
}: TopBarProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = user?.name || user?.email || 'Anonymous';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut({ callbackUrl: '/login' });
    } catch {
      // Fallback redirect if client signOut fails
      window.location.href = '/login';
    }
  };

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#0a0d14',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        color: '#f8fafc',
      }}
    >
      {/* Left section: Hamburger button & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={onToggleNavigator}
          aria-label="Toggle navigation drawer"
          className="flex md:hidden"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            backgroundColor: '#111827',
            color: '#cbd5e1',
            cursor: 'pointer',
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
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumbs / title: DiagramHQ / Workspace */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontWeight: 600,
              color: '#94a3b8',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#3b82f6',
                display: 'inline-block',
              }}
            />
            DiagramHQ
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          {workspaceId ? (
            <Link
              href={`/workspace/${workspaceId}`}
              style={{
                fontWeight: 600,
                color: '#f1f5f9',
                textDecoration: 'none',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {workspaceName}
            </Link>
          ) : (
            <span
              style={{
                fontWeight: 600,
                color: '#f1f5f9',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {workspaceName}
            </span>
          )}
        </nav>
      </div>

      {/* Middle section: Global Search Input */}
      <div
        style={{
          flex: 1,
          maxWidth: '440px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            color: '#64748b',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search objects, views, flows (⌘K)..."
          aria-label="Search objects, views, flows"
          style={{
            width: '100%',
            height: '32px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            paddingLeft: '32px',
            paddingRight: '48px',
            color: '#f8fafc',
            fontSize: '12px',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        />
        <kbd
          style={{
            position: 'absolute',
            right: '8px',
            fontSize: '10px',
            padding: '2px 5px',
            borderRadius: '4px',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            pointerEvents: 'none',
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Right section: AI Copilot, User Profile & Inspector Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* AI Copilot / Assistant button: "Ask AI" */}
        <button
          type="button"
          aria-label="Ask AI Assistant"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#e0e7ff',
            backgroundColor: '#1e1b4b',
            border: '1px solid #4338ca',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Sparkle icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a5b4fc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          </svg>
          <span style={{ fontWeight: 600 }}>Ask AI</span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#818cf8',
              boxShadow: '0 0 6px #818cf8',
            }}
          />
        </button>

        {/* User Session display & Sign Out */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: '6px',
            borderLeft: '1px solid #1e293b',
          }}
        >
          <div
            title={displayName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {initial}
            </div>
            <span
              className="hidden lg:inline"
              style={{
                fontSize: '12px',
                color: '#cbd5e1',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign Out"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#94a3b8',
              backgroundColor: 'transparent',
              border: '1px solid #334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Toggle Inspector Panel */}
        <button
          type="button"
          onClick={onToggleInspector}
          aria-label={isInspectorOpen ? 'Collapse inspector panel' : 'Expand inspector panel'}
          aria-pressed={isInspectorOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            backgroundColor: isInspectorOpen ? '#1e293b' : '#0f172a',
            border: isInspectorOpen ? '1px solid #3b82f6' : '1px solid #1e293b',
            color: isInspectorOpen ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer',
          }}
          title={isInspectorOpen ? 'Collapse inspector' : 'Open inspector'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TopBar;
