import { describe, expect, it } from 'vitest';
import { type ObjectId, type ConnectionId, type ArchitectureId, type VersionId, type WorkspaceId } from './ids';
import type { ArchitectureModel } from './types';
import {
  lintArchitectureModel,
  type ArchitectureLintRule,
} from './linting';

describe('Architecture Linting Engine (F085)', () => {
  const architectureId = 'arch-lint-test' as ArchitectureId;
  const versionId = 'ver-lint-v1' as VersionId;
  const workspaceId = 'ws-test' as WorkspaceId;

  // Helper to create base model
  const createBaseModel = (): ArchitectureModel => ({
    architecture: {
      id: architectureId,
      workspaceId,
      name: 'E-Commerce Platform',
      defaultVersionId: versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: versionId,
      architectureId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [],
    connections: [],
  });

  // ==========================================================================
  // Acceptance Test 1: Clean model is clean
  // ==========================================================================
  it('clean model produces zero findings and a 100% health score', () => {
    const cleanModel = createBaseModel();

    cleanModel.objects = [
      {
        id: 'obj_user' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Shopper',
        kind: 'actor',
        description: 'Customer browsing products and purchasing items.',
        position: { x: 100, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_web' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Web Storefront',
        kind: 'application',
        description: 'Next.js e-commerce client bundle.',
        metadata: { technology: 'Next.js' },
        position: { x: 200, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_api' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Order API Gateway',
        kind: 'application',
        description: 'REST API service managing checkouts.',
        metadata: { technology: 'Node.js' },
        position: { x: 300, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_db' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Database',
        kind: 'store',
        description: 'PostgreSQL relational datastore.',
        metadata: { technology: 'PostgreSQL' },
        position: { x: 400, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    cleanModel.connections = [
      {
        id: 'conn_user_web' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_user' as unknown as ObjectId,
        targetObjectId: 'obj_web' as unknown as ObjectId,
        label: 'Browses catalog',
        kind: 'sync',
        description: 'HTTPS traffic',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conn_web_api' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_web' as unknown as ObjectId,
        targetObjectId: 'obj_api' as unknown as ObjectId,
        label: 'Submits order',
        kind: 'sync',
        description: 'REST JSON payload',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conn_api_db' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_api' as unknown as ObjectId,
        targetObjectId: 'obj_db' as unknown as ObjectId,
        label: 'Persists ledger',
        kind: 'data',
        description: 'TCP SQL queries',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const report = lintArchitectureModel(cleanModel);

    expect(report.summary.isClean).toBe(true);
    expect(report.summary.totalFindings).toBe(0);
    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.infoCount).toBe(0);
    expect(report.summary.healthScore).toBe(100);
    expect(report.findings).toHaveLength(0);
  });

  // ==========================================================================
  // Acceptance Test 2: Seeded violations produce expected findings across error, warning, info
  // ==========================================================================
  it('seeded violations produce expected findings at error, warning, and info levels', () => {
    const violatingModel = createBaseModel();

    violatingModel.objects = [
      // 1. Orphaned application with missing technology and missing description (Warning + Warning + Info)
      {
        id: 'obj_orphaned_legacy' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Legacy Sync Worker',
        kind: 'application',
        description: '', // Missing description -> info
        metadata: {}, // Missing technology -> warning
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2. Datastore A
      {
        id: 'obj_store_pg' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'User Database',
        kind: 'store',
        description: 'Postgres DB',
        metadata: { technology: 'PostgreSQL' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 3. Datastore B
      {
        id: 'obj_store_redis' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Session Cache',
        kind: 'store',
        description: 'Redis in-memory cache',
        metadata: { technology: 'Redis' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 4. Component with circular / invalid hierarchy: parented to a component which is parented to it
      {
        id: 'obj_comp_parent' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: 'obj_comp_child' as unknown as ObjectId,
        name: 'Cart Controller',
        kind: 'component',
        description: 'Handles cart actions',
        metadata: {},
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_comp_child' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: 'obj_comp_parent' as unknown as ObjectId,
        name: 'Cart Validation Subroutine',
        kind: 'component',
        description: 'Validates cart stock',
        metadata: {},
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    violatingModel.connections = [
      // Error 1: Direct Store-to-Store coupling
      {
        id: 'conn_direct_store_sync' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_store_pg' as unknown as ObjectId,
        targetObjectId: 'obj_store_redis' as unknown as ObjectId,
        label: 'Direct replication',
        kind: 'data',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Error 2: Dangling Connection referencing non-existent target
      {
        id: 'conn_dangling' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_comp_parent' as unknown as ObjectId,
        targetObjectId: 'obj_nonexistent' as unknown as ObjectId,
        label: 'Calls dead service',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Warning: Self-referencing loop
      {
        id: 'conn_self_loop' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_comp_child' as unknown as ObjectId,
        targetObjectId: 'obj_comp_child' as unknown as ObjectId,
        label: 'Recursive retry',
        kind: 'sync',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const report = lintArchitectureModel(violatingModel);

    expect(report.summary.isClean).toBe(false);
    expect(report.summary.totalFindings).toBeGreaterThan(0);
    expect(report.summary.errorCount).toBeGreaterThanOrEqual(3); // store-to-store, dangling, circular hierarchy
    expect(report.summary.warningCount).toBeGreaterThanOrEqual(3); // orphan, missing tech, self-loop
    expect(report.summary.infoCount).toBeGreaterThanOrEqual(1); // missing description, missing actor
    expect(report.summary.healthScore).toBeLessThan(70);

    // Verify presence of specific canonical findings
    const ruleIds = report.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('ARCH-001'); // Dangling
    expect(ruleIds).toContain('ARCH-002'); // Store to store
    expect(ruleIds).toContain('ARCH-003'); // Invalid hierarchy
    expect(ruleIds).toContain('ARCH-004'); // Orphaned object
    expect(ruleIds).toContain('ARCH-005'); // Missing technology
    expect(ruleIds).toContain('ARCH-006'); // Self loop
    expect(ruleIds).toContain('ARCH-008'); // Missing description

    // Verify finding content has actionable remediation
    const storeToStoreFinding = report.findings.find((f) => f.ruleId === 'ARCH-002');
    expect(storeToStoreFinding).toBeDefined();
    expect(storeToStoreFinding?.severity).toBe('error');
    expect(storeToStoreFinding?.remediation).toContain('application service');
  });

  // ==========================================================================
  // Filtering & Configuration Tests
  // ==========================================================================
  it('filters findings by severityThreshold', () => {
    const model = createBaseModel();
    // Only an orphaned app (warning) with no description (info)
    model.objects = [
      {
        id: 'obj_1' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Worker',
        kind: 'application',
        description: '',
        metadata: { technology: 'Go' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Filter to only error severity
    const errorReport = lintArchitectureModel(model, { severityThreshold: 'error' });
    expect(errorReport.findings.every((f) => f.severity === 'error')).toBe(true);
    expect(errorReport.findings).toHaveLength(0); // no errors present

    // Filter to warning severity
    const warningReport = lintArchitectureModel(model, { severityThreshold: 'warning' });
    expect(warningReport.findings.every((f) => f.severity === 'error' || f.severity === 'warning')).toBe(true);
    expect(warningReport.findings.some((f) => f.severity === 'warning')).toBe(true);
  });

  it('supports ignoring rules and adding custom rules', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_1' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Isolated Node',
        kind: 'application',
        description: 'Has a description',
        metadata: { technology: 'Rust' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // ARCH-004 is Orphaned Object. Ignore it.
    const ignoredReport = lintArchitectureModel(model, {
      ignoredRuleIds: ['ARCH-004', 'ARCH-009'],
    });
    expect(ignoredReport.findings.find((f) => f.ruleId === 'ARCH-004')).toBeUndefined();

    // Custom rule
    const customRule: ArchitectureLintRule = {
      id: 'CUSTOM-RUST-BAN',
      name: 'Prohibit Rust',
      category: 'best-practice',
      defaultSeverity: 'error',
      description: 'Disallows rust stack.',
      evaluate: (m) => {
        const found = m.objects.filter((o) => o.metadata?.technology === 'Rust');
        return found.map((o) => ({
          id: `finding-${o.id}-rust`,
          ruleId: 'CUSTOM-RUST-BAN',
          ruleName: 'Prohibit Rust',
          category: 'best-practice',
          severity: 'error',
          targetId: o.id,
          targetType: 'object',
          targetName: o.name,
          message: 'Rust is prohibited in this workspace.',
          remediation: 'Migrate to TypeScript or Go.',
        }));
      },
    };

    const customReport = lintArchitectureModel(model, {
      customRules: [customRule],
      ignoredRuleIds: ['ARCH-004', 'ARCH-009'],
    });
    expect(customReport.findings.find((f) => f.ruleId === 'CUSTOM-RUST-BAN')).toBeDefined();
    expect(customReport.summary.errorCount).toBe(1);
  });
});
