import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import WorkspaceOverviewPage from './app/workspace/[workspaceId]/page';
import { LeftNavigator } from './components/shell/left-navigator';

// Mock Next.js Link and navigation
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/workspace/ws-test-123',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
  signOut: vi.fn(),
}));

// Mock InfiniteCanvas in workspace overview to focus test on IA & layout
vi.mock('../../../components/canvas', () => ({
  InfiniteCanvas: () => <div data-testid="mock-infinite-canvas">Canvas</div>,
}));

describe('F140 — IA cleanup: hide plumbing, one brand, honest copy', () => {
  describe('1. Landing Page Copy & CTA Parity', () => {
    it('landing page file contains no stale "Phase 02" references', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const landingFilePath = path.resolve(__dirname, 'app/page.tsx');
      const content = fs.readFileSync(landingFilePath, 'utf8');

      expect(content).not.toContain('Phase 02');
      expect(content).not.toContain('phase 02');
      expect(content).toContain('DiagramHQ');
      expect(content).toContain('Open DiagramHQ Studio');
      expect(content).toContain('href="/studio"');
    });
  });

  describe('2. Dashboard Branding & Plumbing Hiding', () => {
    it('dashboard file brands as DiagramHQ and hides raw IDs/slugs behind developer affordances', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const dashboardFilePath = path.resolve(__dirname, 'app/dashboard/page.tsx');
      const content = fs.readFileSync(dashboardFilePath, 'utf8');

      // Unify brand name
      expect(content).not.toContain('>Architecture OS<');
      expect(content).toContain('DiagramHQ');
      expect(content).toContain('Open Studio');

      // Developer details affordances
      expect(content).toContain('data-testid="dev-session-details"');
      expect(content).toContain('data-testid="dev-org-details"');
    });
  });

  describe('3. Workspace Header Plumbing Hiding & Direct CTA', () => {
    it('renders workspace overview with 0 raw IDs in default primary view and includes Open Studio CTA', () => {
      const html = renderToString(<WorkspaceOverviewPage params={{ workspaceId: 'ws-prod-789' }} />);

      // Title & friendly description are visible
      expect(html).toContain('Workspace Overview');
      expect(html).toContain('Architecture model and diagram projections');

      // Direct CTA into studio
      expect(html).toContain('href="/studio"');
      expect(html).toContain('Open Studio');

      // Raw workspace ID is placed inside collapsible details with testid
      expect(html).toContain('data-testid="dev-workspace-details"');
      expect(html).toContain('Developer info');
      expect(html).toContain('Workspace ID: ws-prod-789');

      // Primary header subtitle does not leak raw ID directly
      expect(html).not.toContain('Workspace ID: <code class="text-slate-300 font-mono text-xs">ws-prod-789</code>');
    });
  });

  describe('4. Single Brand Across Shell Navigator', () => {
    it('renders DiagramHQ in left navigator footer (not Architecture OS)', () => {
      const html = renderToString(
        <LeftNavigator
          workspaceId="ws-123"
          isOpen={true}
          onClose={() => {}}
        />,
      );

      expect(html).toContain('DiagramHQ');
      expect(html).not.toContain('Architecture OS');
    });
  });
});
