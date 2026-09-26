import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LeftNavigator } from './components/shell/left-navigator';
import { TopBar } from './components/shell/top-bar';
import { InspectorPanel } from './components/shell/inspector-panel';
import { AppShell } from './components/shell/app-shell';
import { isProtectedRoute } from './middleware';

vi.mock('@/auth', () => ({
  auth: vi.fn((handler) => handler),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/workspace/ws_123'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

describe('Application Shell (F008)', () => {
  describe('Test 1: LeftNavigator', () => {
    it('renders all 7 navigation items: Overview, Systems, Apps, Data, Flows, Views, Decisions with correct hrefs', () => {
      const workspaceId = 'ws_123';
      const html = renderToString(React.createElement(LeftNavigator, { workspaceId }));

      // 1. Overview
      expect(html).toContain('Overview');
      expect(html).toContain('href="/workspace/ws_123"');

      // 2. Systems
      expect(html).toContain('Systems');
      expect(html).toContain('href="/workspace/ws_123/systems"');

      // 3. Apps
      expect(html).toContain('Apps');
      expect(html).toContain('href="/workspace/ws_123/apps"');

      // 4. Data
      expect(html).toContain('Data');
      expect(html).toContain('href="/workspace/ws_123/data"');

      // 5. Flows
      expect(html).toContain('Flows');
      expect(html).toContain('href="/workspace/ws_123/flows"');

      // 6. Views
      expect(html).toContain('Views');
      expect(html).toContain('href="/workspace/ws_123/views"');

      // 7. Decisions
      expect(html).toContain('Decisions');
      expect(html).toContain('href="/workspace/ws_123/decisions"');

      // Also contains link back to dashboard
      expect(html).toContain('href="/dashboard"');
      expect(html).toContain('Dashboard');
    });

    it('renders mobile navigation drawer when isOpen is true', () => {
      const workspaceId = 'ws_123';
      const closedHtml = renderToString(
        React.createElement(LeftNavigator, { workspaceId, isOpen: false }),
      );
      expect(closedHtml).not.toContain('role="dialog"');

      const openHtml = renderToString(
        React.createElement(LeftNavigator, {
          workspaceId,
          isOpen: true,
          onClose: vi.fn(),
        }),
      );
      expect(openHtml).toContain('role="dialog"');
      expect(openHtml).toContain('aria-label="Navigation drawer"');
      expect(openHtml).toContain('aria-label="Close navigation"');
    });
  });

  describe('Test 2: TopBar', () => {
    it('renders search input, AI Copilot trigger, and user account elements', () => {
      const workspaceId = 'ws_123';
      const user = {
        name: 'Jane Architect',
        email: 'jane@diagramhq.com',
      };

      const html = renderToString(
        React.createElement(TopBar, {
          workspaceId,
          workspaceName: 'Production Core',
          user,
          isInspectorOpen: true,
        }),
      );

      // Search input element
      expect(html).toContain('type="search"');
      expect(html).toContain('placeholder="Search objects, views, flows (⌘K)..."');
      expect(html).toContain('aria-label="Search objects, views, flows"');
      expect(html).toContain('⌘K');

      // AI Copilot trigger
      expect(html).toContain('Ask AI');
      expect(html).toContain('aria-label="Ask AI Assistant"');

      // User account elements
      expect(html).toContain('Jane Architect');
      expect(html).toContain('Sign Out');
      expect(html).toContain('aria-label="Sign Out"');

      // Breadcrumb elements
      expect(html).toContain('DiagramHQ');
      expect(html).toContain('Production Core');
      expect(html).toContain('href="/workspace/ws_123"');

      // Inspector toggle button
      expect(html).toContain('aria-label="Collapse inspector panel"');
      expect(html).toContain('aria-pressed="true"');
    });

    it('falls back to email or Anonymous if user name is missing', () => {
      const htmlWithEmail = renderToString(
        React.createElement(TopBar, {
          workspaceId: 'ws_123',
          user: { email: 'dev@diagramhq.com' },
        }),
      );
      expect(htmlWithEmail).toContain('dev@diagramhq.com');

      const htmlAnon = renderToString(
        React.createElement(TopBar, {
          workspaceId: 'ws_123',
        }),
      );
      expect(htmlAnon).toContain('Anonymous');
    });
  });

  describe('Test 3: InspectorPanel', () => {
    it('renders open state with properties tabs and empty selection state, and collapse toggle', () => {
      const onToggle = vi.fn();
      const openHtml = renderToString(
        React.createElement(InspectorPanel, {
          isOpen: true,
          onToggle,
          selectedItem: null,
        }),
      );

      // Open state panel
      expect(openHtml).toContain('aria-label="Object Inspector"');
      expect(openHtml).toContain('Inspector');

      // Collapse toggle button
      expect(openHtml).toContain('aria-label="Collapse inspector"');

      // Property tabs navigation
      expect(openHtml).toContain('Properties');
      expect(openHtml).toContain('Hierarchy');
      expect(openHtml).toContain('Metadata');

      // Empty selection state placeholder
      expect(openHtml).toContain(
        'Select an object on the canvas or navigator to view and edit its properties.',
      );
    });

    it('renders collapsed strip with expand toggle when isOpen is false', () => {
      const onToggle = vi.fn();
      const collapsedHtml = renderToString(
        React.createElement(InspectorPanel, {
          isOpen: false,
          onToggle,
        }),
      );

      expect(collapsedHtml).toContain('aria-label="Inspector collapsed strip"');
      expect(collapsedHtml).toContain('aria-label="Expand inspector panel"');
      expect(collapsedHtml).not.toContain('aria-label="Object Inspector"');
    });

    it('renders item details when selectedItem is provided', () => {
      const itemHtml = renderToString(
        React.createElement(InspectorPanel, {
          isOpen: true,
          onToggle: vi.fn(),
          selectedItem: {
            id: 'sys_payment_gateway',
            name: 'Payment Gateway',
            type: 'System',
          },
        }),
      );

      expect(itemHtml).toContain('Payment Gateway');
      expect(itemHtml).toContain('sys_payment_gateway');
      expect(itemHtml).toContain('System');
      expect(itemHtml).toContain('Active / Synced');
    });
  });

  describe('Test 4: AppShell', () => {
    it('integrates the components with main content area and responsive classes', () => {
      const html = renderToString(
        React.createElement(AppShell, {
          workspaceId: 'ws_123',
          workspaceName: 'Main Architecture',
          user: { name: 'Bob Engineer', email: 'bob@diagramhq.com' },
          children: React.createElement('div', { id: 'test-canvas-content' }, 'Active Canvas Viewport'),
        }),
      );

      // TopBar integration
      expect(html).toContain('Main Architecture');
      expect(html).toContain('Bob Engineer');
      expect(html).toContain('Ask AI');

      // LeftNavigator integration
      expect(html).toContain('Overview');
      expect(html).toContain('Systems');
      expect(html).toContain('Apps');
      expect(html).toContain('Data');
      expect(html).toContain('Flows');
      expect(html).toContain('Views');
      expect(html).toContain('Decisions');

      // Responsive classes on navigator
      expect(html).toContain('hidden md:flex flex-col flex-shrink-0');

      // Main content area and responsive classes
      expect(html).toContain('flex-1 overflow-auto bg-slate-900 text-slate-100 relative');
      expect(html).toContain('id="test-canvas-content"');
      expect(html).toContain('Active Canvas Viewport');

      // Inspector panel integration
      expect(html).toContain('Inspector');
      expect(html).toContain('Properties');
    });
  });

  describe('Test 5: Middleware recognizes /workspace/ws_123 as a protected route', () => {
    it('identifies /workspace and its subroutes as protected', () => {
      expect(isProtectedRoute('/workspace/ws_123')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/systems')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/apps')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/data')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/flows')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/views')).toBe(true);
      expect(isProtectedRoute('/workspace/ws_123/decisions')).toBe(true);
    });

    it('preserves existing protected routes', () => {
      expect(isProtectedRoute('/dashboard')).toBe(true);
      expect(isProtectedRoute('/dashboard/workspaces')).toBe(true);
      expect(isProtectedRoute('/architectures')).toBe(true);
      expect(isProtectedRoute('/architectures/arch_123')).toBe(true);
    });

    it('identifies public and auth routes as not protected', () => {
      expect(isProtectedRoute('/')).toBe(false);
      expect(isProtectedRoute('/login')).toBe(false);
      expect(isProtectedRoute('/api/auth/signin')).toBe(false);
      expect(isProtectedRoute('/api/auth/session')).toBe(false);
      expect(isProtectedRoute('/pricing')).toBe(false);
    });
  });
});
