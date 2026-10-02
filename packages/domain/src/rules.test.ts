import { describe, expect, it } from 'vitest';
import { type ObjectId, type ConnectionId, type ArchitectureId, type VersionId, type WorkspaceId } from './ids';
import type { ArchitectureModel } from './types';
import {
  evaluateArchitectureRules,
  RULE_OWNER_REQUIRED,
  RULE_EXTERNAL_API_AUTH,
  RULE_NO_CROSS_SERVICE_DB_ACCESS,
  RULE_PII_FLOW_RESTRICTIONS,
} from './rules';

describe('Architecture Rules Engine (F086)', () => {
  const architectureId = 'arch-rules-test' as ArchitectureId;
  const versionId = 'ver-rules-v1' as VersionId;
  const workspaceId = 'ws-test' as WorkspaceId;

  const createBaseModel = (): ArchitectureModel => ({
    architecture: {
      id: architectureId,
      workspaceId,
      name: 'Governance Test Platform',
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
  // Test 1: Compliant model satisfies all 4 canonical rules
  // ==========================================================================
  it('compliant model satisfies all 4 canonical rules with zero violations', () => {
    const compliantModel = createBaseModel();

    compliantModel.objects = [
      {
        id: 'obj_customer' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Customer Actor',
        kind: 'actor',
        description: 'External customer',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_order_svc' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Order Service',
        kind: 'application',
        description: 'Microservice managing orders',
        metadata: {
          technology: 'Node.js',
          owner: 'Checkout Team', // Rule 1 satisfied
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_order_db' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Order Database',
        kind: 'store',
        description: 'PostgreSQL DB for orders',
        metadata: {
          technology: 'PostgreSQL',
          owner: 'Checkout Team', // Rule 1 satisfied
          ownerServiceId: 'obj_order_svc', // Rule 3 owner established
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    compliantModel.connections = [
      // External ingress with valid auth scheme (Rule 2 satisfied)
      {
        id: 'conn_ingress' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_customer' as unknown as ObjectId,
        targetObjectId: 'obj_order_svc' as unknown as ObjectId,
        label: 'Submit Order',
        kind: 'sync',
        description: 'Authenticated HTTPS',
        metadata: {
          auth: 'OAuth2 / Bearer Token',
          protocol: 'https',
          encrypted: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Private DB connection by owning service (Rule 3 satisfied)
      {
        id: 'conn_svc_db' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_order_svc' as unknown as ObjectId,
        targetObjectId: 'obj_order_db' as unknown as ObjectId,
        label: 'Read/Write',
        kind: 'data',
        description: 'SQL over TLS',
        metadata: {
          protocol: 'tcp-tls',
          encrypted: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const report = evaluateArchitectureRules(compliantModel);

    expect(report.isCompliant).toBe(true);
    expect(report.totalViolations).toBe(0);
    expect(report.errorCount).toBe(0);
    expect(report.violations).toHaveLength(0);
    expect(report.ruleSummaries.every((r) => r.passed)).toBe(true);
  });

  // ==========================================================================
  // Test 2: Rule 1 - Owner Required fires on unowned service
  // ==========================================================================
  it('Rule 1 (Owner Required): fires when service or datastore lacks owner metadata', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_unowned_svc' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Billing Gateway',
        kind: 'application',
        description: 'Payment integration',
        metadata: { technology: 'Go' }, // NO owner or team
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const violations = RULE_OWNER_REQUIRED.evaluate(model);

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('ORG-RULE-001');
    expect(violations[0].targetId).toBe('obj_unowned_svc');
    expect(violations[0].reason).toContain('no designated owner');
    expect(violations[0].remediation).toContain('metadata.owner');
  });

  // ==========================================================================
  // Test 3: Rule 2 - External API Auth Required fires on unauthenticated ingress
  // ==========================================================================
  it('Rule 2 (External API Auth): fires when external actor connection has no authentication', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_actor' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Public Guest User',
        kind: 'actor',
        description: 'Anonymous visitor',
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_gateway' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'API Gateway',
        kind: 'application',
        description: 'Edge reverse proxy',
        metadata: { owner: 'Infra Team' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      {
        id: 'conn_unauth' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_actor' as unknown as ObjectId,
        targetObjectId: 'obj_gateway' as unknown as ObjectId,
        label: 'Invoke /api/admin/users',
        kind: 'sync',
        description: 'No auth specified',
        metadata: { auth: 'none' }, // Unauthenticated ingress
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const violations = RULE_EXTERNAL_API_AUTH.evaluate(model);

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('ORG-RULE-002');
    expect(violations[0].targetId).toBe('conn_unauth');
    expect(violations[0].reason).toContain('does not enforce an authentication scheme');
    expect(violations[0].remediation).toContain('OAuth2');
  });

  // ==========================================================================
  // Test 4: Rule 3 - No Cross-Service DB Access fires when foreign service connects
  // ==========================================================================
  it('Rule 3 (No Cross-Service DB Access): fires when foreign service connects directly to private datastore', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_owner_svc' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Service',
        kind: 'application',
        description: 'Owner service',
        metadata: { owner: 'Orders Team' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_orders_db' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Orders Database',
        kind: 'store',
        description: 'Private DB',
        metadata: {
          owner: 'Orders Team',
          ownerServiceId: 'obj_owner_svc', // Owned by Orders Service
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_foreign_svc' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Inventory Service',
        kind: 'application',
        description: 'Foreign microservice',
        metadata: { owner: 'Inventory Team' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      // Direct foreign access to Orders Database
      {
        id: 'conn_cross_access' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_foreign_svc' as unknown as ObjectId,
        targetObjectId: 'obj_orders_db' as unknown as ObjectId,
        label: 'Direct Query',
        kind: 'data',
        description: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const violations = RULE_NO_CROSS_SERVICE_DB_ACCESS.evaluate(model);

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('ORG-RULE-003');
    expect(violations[0].targetId).toBe('conn_cross_access');
    expect(violations[0].reason).toContain("directly accesses datastore 'Orders Database'");
    expect(violations[0].remediation).toContain('Expose an API or event interface');
  });

  // ==========================================================================
  // Test 5: Rule 4 - PII Flow Restrictions fires on unencrypted or unapproved transfer
  // ==========================================================================
  it('Rule 4 (PII Flow Restrictions): fires when sensitive PII is transmitted unencrypted or to unapproved third party', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_internal_app' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Customer Web Service',
        kind: 'application',
        description: 'Internal app',
        metadata: { owner: 'Core Team' },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'obj_analytics_vendor' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Third-Party Analytics Platform',
        kind: 'application',
        description: 'External cloud analytics',
        metadata: {
          owner: 'Vendor Management',
          thirdParty: true,
          external: true,
          hasDpaAgreement: false, // NO DPA!
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    model.connections = [
      {
        id: 'conn_pii_flow' as unknown as ConnectionId,
        architectureId,
        versionId,
        sourceObjectId: 'obj_internal_app' as unknown as ObjectId,
        targetObjectId: 'obj_analytics_vendor' as unknown as ObjectId,
        label: 'Stream User Events',
        kind: 'sync',
        description: '',
        metadata: {
          pii: true, // CARRIES PII
          protocol: 'http', // UNENCRYPTED
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const violations = RULE_PII_FLOW_RESTRICTIONS.evaluate(model);

    // Should fire both: unencrypted PII transmission AND unapproved external transfer
    expect(violations.length).toBe(2);
    expect(violations[0].ruleId).toBe('ORG-RULE-004');
    expect(violations.some((v) => v.reason.includes('unencrypted transport'))).toBe(true);
    expect(violations.some((v) => v.reason.includes('without a verified Data Processing Agreement'))).toBe(true);
  });

  // ==========================================================================
  // Test 6: Policy configuration (disabling rules and severity overrides)
  // ==========================================================================
  it('supports policy configuration to disable rules or override severity', () => {
    const model = createBaseModel();
    model.objects = [
      {
        id: 'obj_unowned' as unknown as ObjectId,
        architectureId,
        versionId,
        parentId: null,
        name: 'Unowned Cache',
        kind: 'store',
        description: '',
        metadata: {},
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Evaluate with rule disabled
    const disabledReport = evaluateArchitectureRules(model, {
      disabledRuleIds: ['ORG-RULE-001'],
    });
    expect(disabledReport.violations).toHaveLength(0);
    expect(disabledReport.isCompliant).toBe(true);

    // Evaluate with severity overridden to warning
    const overriddenReport = evaluateArchitectureRules(model, {
      severityOverrides: {
        'ORG-RULE-001': 'warning',
      },
    });
    expect(overriddenReport.violations).toHaveLength(1);
    expect(overriddenReport.violations[0].severity).toBe('warning');
    expect(overriddenReport.isCompliant).toBe(true); // Warnings do not fail compliance!
  });
});
