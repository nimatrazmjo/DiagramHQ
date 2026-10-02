import { describe, it, expect } from 'vitest';
import {
  createRepoSyncConfig,
  isSyncDue,
  computeNextSyncTime,
  evaluateRepoSyncDrift,
  triggerRepoSync,
  applySyncToModel,
} from './repo-sync';
import { createId, type ArchitectureId, type VersionId, type ObjectId } from './ids';
import type { ArchitectureModel } from './types';

describe('Repository Synchronization Engine (F077)', () => {
  const archId = createId('arch') as ArchitectureId;
  const verId = createId('ver') as VersionId;

  const sampleFiles = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'payments-service',
        dependencies: {
          express: '^4.19.2',
          pg: '^8.11.3',
          ioredis: '^5.3.2',
        },
      }),
    },
    {
      path: 'docker-compose.yml',
      content: `
version: '3.8'
services:
  payments-db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
  payments-cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`,
    },
    {
      path: 'src/routes/payment.routes.ts',
      content: `
router.get('/payments', listPayments);
router.post('/payments/charge', processPayment);
router.get('/payments/:id', getPayment);
`,
    },
  ];

  const baseModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: createId('ws'),
      name: 'E-Commerce Platform',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: createId('app') as ObjectId,
        architectureId: archId,
        versionId: verId,
        kind: 'application',
        name: 'API Gateway',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  };

  it('creates repo sync configuration with default schedule and target model', () => {
    const config = createRepoSyncConfig({
      owner: 'acme',
      repo: 'payments-service',
      targetArchitectureId: archId,
      targetVersionId: verId,
      intervalMinutes: 30,
    });

    expect(config.id).toContain('sync_acme_payments-service');
    expect(config.provider).toBe('github');
    expect(config.branch).toBe('main');
    expect(config.schedule?.intervalMinutes).toBe(30);
    expect(config.schedule?.enabled).toBe(true);
    expect(config.schedule?.nextRunAt).toBeDefined();
    expect(config.feedDrift).toBe(true);
  });

  it('calculates whether sync is due based on schedule timestamps', () => {
    const past = new Date(Date.now() - 1000 * 60 * 10);
    const future = new Date(Date.now() + 1000 * 60 * 60);

    expect(isSyncDue({ intervalMinutes: 60, enabled: true, nextRunAt: past })).toBe(true);
    expect(isSyncDue({ intervalMinutes: 60, enabled: true, nextRunAt: future })).toBe(false);
    expect(isSyncDue({ intervalMinutes: 60, enabled: false, nextRunAt: past })).toBe(false);

    const nextTime = computeNextSyncTime(60, new Date('2026-10-02T12:00:00Z'));
    expect(nextTime.toISOString()).toBe('2026-10-02T13:00:00.000Z');
  });

  it('triggers sync via webhook and evaluates architectural drift', () => {
    const config = createRepoSyncConfig({
      owner: 'acme',
      repo: 'payments-service',
      targetArchitectureId: archId,
      targetVersionId: verId,
    });

    const result = triggerRepoSync({
      config,
      files: sampleFiles,
      trigger: 'webhook',
      webhook: {
        event: 'push',
        ref: 'refs/heads/main',
        commitSha: 'c0ffee1234567890',
        pusher: 'developer-jane',
      },
      currentModel: baseModel,
    });

    expect(result.trigger).toBe('webhook');
    expect(result.commitSha).toBe('c0ffee1234567890');
    expect(result.status).toBe('drift_detected');
    expect(result.driftReport.hasDrift).toBe(true);
    expect(result.driftReport.items.length).toBeGreaterThan(0);

    // Should detect newly added code objects not in base model
    const driftNames = result.driftReport.items.map((i) => i.entityName);
    expect(driftNames).toContain('Payments Service');
    expect(result.driftReport.items.some((i) => i.driftKind === 'code_added_not_in_model')).toBe(true);
    expect(result.driftReport.items[0].evidence.length).toBeGreaterThan(0);
  });

  it('detects model objects removed from repository codebase', () => {
    const legacyModel: ArchitectureModel = {
      ...baseModel,
      objects: [
        {
          id: createId('app') as ObjectId,
          architectureId: archId,
          versionId: verId,
          kind: 'application',
          name: 'Decommissioned Service',
          metadata: {
            codeMapping: {
              repo: 'payments-service',
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const config = createRepoSyncConfig({
      owner: 'acme',
      repo: 'payments-service',
      targetArchitectureId: archId,
      targetVersionId: verId,
    });

    const result = triggerRepoSync({
      config,
      files: sampleFiles,
      trigger: 'manual',
      currentModel: legacyModel,
    });

    const removalDrift = result.driftReport.items.find(
      (i) => i.driftKind === 'model_object_removed_from_code'
    );
    expect(removalDrift).toBeDefined();
    expect(removalDrift?.entityName).toBe('Decommissioned Service');
    expect(removalDrift?.severity).toBe('high');
  });

  it('applies sync refresh proposals directly to update the architecture model', () => {
    const config = createRepoSyncConfig({
      owner: 'acme',
      repo: 'payments-service',
      targetArchitectureId: archId,
      targetVersionId: verId,
      autoApplyProposals: true,
    });

    const result = triggerRepoSync({
      config,
      files: sampleFiles,
      trigger: 'schedule',
      currentModel: baseModel,
      autoApply: true,
    });

    expect(result.modelUpdated).toBe(true);
    expect(result.refreshedModel).toBeDefined();

    const refreshed = result.refreshedModel!;
    expect(refreshed.objects.length).toBeGreaterThan(baseModel.objects.length);

    const addedService = refreshed.objects.find((o) => o.name === 'Payments Service');
    expect(addedService).toBeDefined();
    expect(addedService?.kind).toBe('application');
    expect(addedService?.metadata?.codeMapping).toBeDefined();
    const codeMap = addedService?.metadata?.codeMapping as Record<string, unknown> | undefined;
    expect(codeMap?.repo).toBe('payments-service');

    const addedDb = refreshed.objects.find((o) => o.name.includes('PostgreSQL DB'));
    expect(addedDb).toBeDefined();
    expect(addedDb?.kind).toBe('store');

    // Connections should be established
    expect(refreshed.connections.length).toBeGreaterThan(0);

    // Direct invocation verification for pure functions
    const standaloneDrift = evaluateRepoSyncDrift(result.scanResult, baseModel);
    expect(standaloneDrift.hasDrift).toBe(true);

    const directApplied = applySyncToModel(baseModel, {
      config,
      commitSha: 'direct-sha',
      changeSummary: result.changeSummary,
    });
    expect(directApplied.objects.length).toBeGreaterThan(baseModel.objects.length);
  });
});
