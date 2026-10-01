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
    <header className="h-14 bg-[#0a0d14] border-b border-slate-800 flex items-center justify-between px-4 gap-3 sticky top-0 z-30 text-slate-100 select-none">
      {/* Left section: Hamburger button & Breadcrumbs */}
      <div className="flex items-center gap-2.5">
        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={onToggleNavigator}
          aria-label="Toggle navigation drawer"
          className="inline-flex md:hidden items-center justify-center p-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors"
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs whitespace-nowrap">
          <Link
            href="/dashboard"
            className="font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span className="w-2 h-2 rounded-[2px] bg-blue-500 inline-block shadow-[0_0_6px_#3b82f6]" />
            DiagramHQ
          </Link>
          <span className="text-slate-600">/</span>
          {workspaceId ? (
            <Link
              href={`/workspace/${workspaceId}`}
              className="font-semibold text-slate-100 hover:text-blue-400 transition-colors max-w-[180px] truncate"
            >
              {workspaceName}
            </Link>
          ) : (
            <span className="font-semibold text-slate-100 max-w-[180px] truncate">
              {workspaceName}
            </span>
          )}
        </nav>
      </div>

      {/* Middle section: Global Search Input */}
      <div className="hidden sm:flex flex-1 max-w-md items-center relative mx-2">
        <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-500">
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
          className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md pl-8 pr-12 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        <kbd className="absolute right-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 pointer-events-none font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Right section: AI Copilot, User Profile & Inspector Toggle */}
      <div className="flex items-center gap-2.5">
        {/* AI Copilot / Assistant button: "Ask AI" */}
        <button
          type="button"
          aria-label="Ask AI Assistant"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 transition-colors shadow-sm"
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
          <span className="font-semibold">Ask AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
        </button>

        {/* User Session display & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div title={displayName} className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-semibold">
              {initial}
            </div>
            <span className="hidden lg:inline text-xs text-slate-300 max-w-[120px] truncate">
              {displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign Out"
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 border border-slate-700 transition-colors"
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
          className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors ${
            isInspectorOpen
              ? 'bg-slate-800 border-blue-500 text-blue-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
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
