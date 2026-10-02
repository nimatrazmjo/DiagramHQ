import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  auditArchitectureSecurity,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type ModelObject,
  type ModelConnection,
} from '@diagramhq/domain';
import {
  SecurityScoreGauge,
  SecurityFindingCard,
  AISecurityDrawer,
} from './components/canvas/ai-security-drawer';

describe('AI Architecture Security Review Integration & UI (F067)', () => {
  const archId = 'arch-test' as ArchitectureId;
  const v1 = 'ver-v1' as VersionId;

  // Seeded architecture with 3 specific security issues:
  // 1. External Actor directly invokes internal service (bypassing edge gateway)
  // 2. Sensitive connection transmits customer PII credentials without encryption
  // 3. Sensitive datastore access lacks auth tokens
  const externalClient: ModelObject = {
    id: 'usr-attacker' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'External Actor',
    kind: 'actor',
    position: { x: 100, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const paymentsService: ModelObject = {
    id: 'app-payments' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Payments Core Service',
    kind: 'application',
    position: { x: 400, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const customerDb: ModelObject = {
    id: 'sto-customers' as ObjectId,
    architectureId: archId,
    versionId: v1,
    name: 'Customer PII Store',
    kind: 'store',
    description: 'Stores customer bank account records',
    position: { x: 700, y: 100 },
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const seededPublicBypassConn: ModelConnection = {
    id: 'con-public-bypass' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: externalClient.id,
    targetObjectId: paymentsService.id,
    label: 'Direct Inbound Call',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const seededCleartextPiiConn: ModelConnection = {
    id: 'con-cleartext-pii' as ConnectionId,
    architectureId: archId,
    versionId: v1,
    sourceObjectId: paymentsService.id,
    targetObjectId: customerDb.id,
    label: 'Send customer PII password',
    kind: 'sync',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const seededContext = {
    objects: [externalClient, paymentsService, customerDb],
    connections: [seededPublicBypassConn, seededCleartextPiiConn],
  };

  it('1. Acceptance Test: Find PII paths, public endpoints, missing auth; AI security findings match seeded issues', () => {
    const report = auditArchitectureSecurity(seededContext);

    // AI findings match seeded issues
    expect(report.findings.some((f) => f.type === 'public_endpoint_unauthenticated')).toBe(true);
    expect(report.findings.some((f) => f.type === 'pii_cleartext_path')).toBe(true);
    expect(report.findings.some((f) => f.type === 'missing_auth_boundary')).toBe(true);
    expect(report.findings.some((f) => f.type === 'unencrypted_pii_store')).toBe(true);

    // AI narrative reflects the detected seeded issues
    expect(report.narrative.executiveSummary).toContain('Security audit detected');
    expect(report.narrative.perimeterRisks).toContain('Perimeter vulnerabilities detected');
    expect(report.narrative.piiPrivacyRisks).toContain('Data privacy compliance risk');
  });

  it('2. renders <SecurityScoreGauge /> with appropriate styling', () => {
    const htmlLowScore = renderToString(<SecurityScoreGauge score={35} />);
    expect(htmlLowScore).toContain('35');
    expect(htmlLowScore).toContain('Critical Security Vulnerabilities');

    const htmlHighScore = renderToString(<SecurityScoreGauge score={95} />);
    expect(htmlHighScore).toContain('95');
    expect(htmlHighScore).toContain('Strong Security Posture');
  });

  it('3. renders <SecurityFindingCard /> with remediation recommendation', () => {
    const report = auditArchitectureSecurity(seededContext);
    const finding = report.findings[0]!;

    const onSelect = vi.fn();
    const html = renderToString(
      <SecurityFindingCard finding={finding} onSelectEntity={onSelect} />
    );

    expect(html).toContain(finding.title);
    expect(html).toContain(finding.id);
    expect(html).toContain('Recommended Remediation:');
    expect(html).toContain('API Gateway');
    expect(html).toContain('External Actor');
  });

  it('4. renders <AISecurityDrawer /> in open and closed states', () => {
    const report = auditArchitectureSecurity(seededContext);
    const onClose = vi.fn();
    const onSelect = vi.fn();

    // Open
    const openHtml = renderToString(
      <AISecurityDrawer
        isOpen={true}
        onClose={onClose}
        report={report}
        onSelectEntity={onSelect}
      />
    );

    expect(openHtml).toContain('AI Security Review &amp; Audit');
    expect(openHtml).toContain('Architecture Security Rating');
    expect(openHtml).toContain('AI Security Narrative');
    expect(openHtml).toContain('Security Findings (');

    // Closed
    const closedHtml = renderToString(
      <AISecurityDrawer
        isOpen={false}
        onClose={onClose}
        report={report}
      />
    );
    expect(closedHtml).toBe('');
  });
});
