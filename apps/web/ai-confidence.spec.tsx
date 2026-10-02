import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  generateGroundedDependency,
  createAIEvidence,
  createGroundedAssertion,
  type ObjectId,
  type ArchitectureId,
  type VersionId,
} from '@diagramhq/domain';
import {
  ConfidenceBadge,
  AIEvidenceCard,
  AIEvidenceInspector,
} from './components/canvas/ai-confidence-badge';

describe('AI Evidence and Confidence Web UI (F120)', () => {
  const archId = 'arch-conf-test' as ArchitectureId;
  const verId = 'ver-v1' as VersionId;
  const orderSvcId = 'app-orders' as ObjectId;
  const paymentSvcId = 'app-payment' as ObjectId;

  it('acceptance test: a generated dependency includes evidence and renders high confidence', () => {
    const codeEvidence = createAIEvidence({
      sourceType: 'ast_call',
      location: {
        repo: 'github.com/acme/order-service',
        filePath: 'src/checkout/payment-gateway.ts',
        lineStart: 88,
        lineEnd: 96,
        symbol: 'PaymentClient.charge',
      },
      description: 'Synchronous POST call executing customer card authorization',
    });

    const groundedDep = generateGroundedDependency({
      architectureId: archId,
      versionId: verId,
      sourceObjectId: orderSvcId,
      targetObjectId: paymentSvcId,
      protocol: 'HTTPS REST',
      evidence: [codeEvidence],
    });

    // 1. Dependency includes evidence
    expect(groundedDep.evidence).toHaveLength(1);
    expect(groundedDep.evidence[0]?.rawCitation).toContain('payment-gateway.ts#L88-L96');
    expect(groundedDep.confidence.score).toBeGreaterThanOrEqual(0.85);
    expect(groundedDep.confidence.isLowConfidence).toBe(false);

    // Test UI badge rendering
    const badgeHtml = renderToString(<ConfidenceBadge confidence={groundedDep.confidence} />);
    expect(badgeHtml).toContain('HIGH');
    expect(badgeHtml).toContain('data-low-confidence="false"');
  });

  it('acceptance test: low confidence generated dependency is flagged with warnings', () => {
    const weakEvidence = createAIEvidence({
      sourceType: 'heuristic',
      location: {
        repo: 'github.com/acme/docs',
      },
      description: 'Loose keyword match in markdown design notes',
      strength: 0.35,
    });

    const lowConfDep = generateGroundedDependency({
      architectureId: archId,
      versionId: verId,
      sourceObjectId: orderSvcId,
      targetObjectId: paymentSvcId,
      protocol: 'Tentative',
      evidence: [weakEvidence],
    });

    // 2. Low confidence is flagged
    expect(lowConfDep.confidence.isLowConfidence).toBe(true);
    expect(lowConfDep.confidence.flagged).toBe(true);
    expect(lowConfDep.requiresHumanVerification).toBe(true);

    // Test UI badge rendering
    const badgeHtml = renderToString(<ConfidenceBadge confidence={lowConfDep.confidence} />);
    expect(badgeHtml).toContain('Flagged Low Confidence');
    expect(badgeHtml).toContain('data-low-confidence="true"');

    // Test modal inspector rendering with low confidence warnings
    const inspectorHtml = renderToString(
      <AIEvidenceInspector
        isOpen={true}
        onClose={vi.fn()}
        groundedDependencies={[lowConfDep]}
      />,
    );
    expect(inspectorHtml).toContain('AI Evidence &amp; Grounding Inspector');
    expect(inspectorHtml).toContain('Low Confidence Warning');
    expect(inspectorHtml).toContain('Flagged Low Confidence');
    expect(inspectorHtml).toContain('Loose keyword match in markdown design notes');
  });

  it('renders AIEvidenceCard with raw citation link and strength score', () => {
    const evidence = createAIEvidence({
      sourceType: 'config_file',
      location: {
        repo: 'github.com/acme/infra',
        filePath: 'k8s/service-mesh.yaml',
        lineStart: 14,
        lineEnd: 22,
      },
      description: 'Istio VirtualService routing rule to external billing host',
    });

    const cardHtml = renderToString(<AIEvidenceCard evidence={evidence} />);
    expect(cardHtml).toContain('CONFIG FILE');
    expect(cardHtml).toContain('k8s/service-mesh.yaml#L14-L22');
    expect(cardHtml).toContain('Istio VirtualService routing rule');
    expect(cardHtml).toContain('Strength:');
  });

  it('renders AIEvidenceInspector with grounded assertions and filter counters', () => {
    const highEvidence = createAIEvidence({
      sourceType: 'ast_call',
      location: {
        repo: 'github.com/acme/core',
        filePath: 'src/index.ts',
        lineStart: 1,
        lineEnd: 10,
      },
      description: 'Bootstrap import',
    });

    const assertion = createGroundedAssertion({
      kind: 'boundary',
      claim: 'Payment Service is protected within PCI-DSS boundary zone',
      subjectId: paymentSvcId,
      evidence: [highEvidence],
    });

    const inspectorHtml = renderToString(
      <AIEvidenceInspector
        isOpen={true}
        onClose={vi.fn()}
        groundedAssertions={[assertion]}
      />,
    );

    expect(inspectorHtml).toContain('Payment Service is protected within PCI-DSS boundary zone');
    expect(inspectorHtml).toContain('BOUNDARY');
    expect(inspectorHtml).toContain('All');
    expect(inspectorHtml).toContain('Flagged Low Confidence');
  });
});
