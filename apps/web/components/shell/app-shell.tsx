'use client';

import React, { useState, useEffect } from 'react';
import { TopBar } from './top-bar';
import { LeftNavigator } from './left-navigator';
import { InspectorPanel } from './inspector-panel';
import type { InspectorItem } from './inspector-panel';

export interface AppShellProps {
  workspaceId: string;
  workspaceName?: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  children: React.ReactNode;
  selectedItem?: InspectorItem | null;
  inspectorContent?: React.ReactNode;
}

export function AppShell({
  workspaceId,
  workspaceName,
  user,
  children,
  selectedItem = null,
  inspectorContent,
}: AppShellProps): JSX.Element {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Responsive default adjustment: on mobile viewports (<768px), inspector defaults to closed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setIsInspectorOpen(false);
      }
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0b0d12',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <TopBar
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        user={user}
        onToggleNavigator={() => setIsNavOpen((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
      />

      {/* Body Flex Container: height calc(100vh - 56px) */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Navigator (240px wide on desktop, slide-over drawer on mobile) */}
        <LeftNavigator
          workspaceId={workspaceId}
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-auto bg-slate-900 text-slate-100 relative"
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#0f172a',
            color: '#f1f5f9',
            position: 'relative',
          }}
        >
          {children}
        </main>

        {/* Inspector Panel (300px wide on desktop, collapsible) */}
        <InspectorPanel
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen((prev) => !prev)}
          selectedItem={selectedItem}
        >
          {inspectorContent}
        </InspectorPanel>
      </div>
    </div>
  );
}

export default AppShell;
