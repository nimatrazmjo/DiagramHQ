import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ArchitectureId,
  type VersionId,
  createRepoSyncConfig,
  triggerRepoSync,
} from '@diagramhq/domain';
import {
  RepoSyncDrawer,
  SyncScheduleModal,
} from './components/canvas/repo-sync-panel';

describe('Repository Synchronization Canvas UI (F077)', () => {
  const archId = 'arch-sync-test' as ArchitectureId;
  const verId = 'ver-sync-test' as VersionId;

  const mockConfig = createRepoSyncConfig({
    owner: 'enterprise-org',
    repo: 'checkout-service',
    branch: 'main',
    targetArchitectureId: archId,
    targetVersionId: verId,
    intervalMinutes: 60,
  });

  const sampleFiles = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'checkout-service',
        dependencies: {
          pg: '^8.11.3',
        },
      }),
    },
  ];

  it('renders RepoSyncDrawer with clean state when no drift is detected', () => {
    const html = renderToString(
      <RepoSyncDrawer
        isOpen={true}
        onClose={vi.fn()}
        config={mockConfig}
        syncResult={null}
        onTriggerSync={vi.fn()}
      />
    );

    expect(html).toContain('Repository Synchronization');
    expect(html).toContain('enterprise-org/checkout-service (main)');
    expect(html).toContain('Up to Date (Clean)');
    expect(html).toContain('Sync Now');
    expect(html).toContain('Every 60 min');
  });

  it('renders RepoSyncDrawer with drift alert banner and action buttons when drift is detected', () => {
    const syncResult = triggerRepoSync({
      config: mockConfig,
      files: sampleFiles,
      trigger: 'manual',
    });

    const html = renderToString(
      <RepoSyncDrawer
        isOpen={true}
        onClose={vi.fn()}
        config={mockConfig}
        syncResult={syncResult}
        onTriggerSync={vi.fn()}
        onApplyModelRefresh={vi.fn()}
        onCreateChangeRequest={vi.fn()}
      />
    );

    expect(html).toContain('Architectural Drift Detected');
    expect(html).toContain('Apply Model Refresh');
    expect(html).toContain('Create Change Request (PR)');
    expect(html).toContain('Checkout Service');
    expect(html).toContain('Discovered Code Entities');
  });

  it('renders SyncScheduleModal with scan intervals and webhook instructions', () => {
    const html = renderToString(
      <SyncScheduleModal
        isOpen={true}
        onClose={vi.fn()}
        currentSchedule={mockConfig.schedule}
        onSaveSchedule={vi.fn()}
        webhookUrl="https://api.diagramhq.com/webhooks/github/sync"
      />
    );

    expect(html).toContain('Sync &amp; Freshness Schedule');
    expect(html).toContain('Automated Periodic Scan');
    expect(html).toContain('Every 1 hour (Default)');
    expect(html).toContain('https://api.diagramhq.com/webhooks/github/sync');
    expect(html).toContain('Save Schedule');
  });

  it('renders null when drawers and modals are closed', () => {
    const drawerHtml = renderToString(
      <RepoSyncDrawer
        isOpen={false}
        onClose={vi.fn()}
        config={mockConfig}
        onTriggerSync={vi.fn()}
      />
    );
    expect(drawerHtml).toBe('');

    const modalHtml = renderToString(
      <SyncScheduleModal
        isOpen={false}
        onClose={vi.fn()}
        onSaveSchedule={vi.fn()}
      />
    );
    expect(modalHtml).toBe('');
  });
});
