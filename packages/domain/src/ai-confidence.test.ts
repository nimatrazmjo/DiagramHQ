import { describe, it, expect } from 'vitest';
import { createId } from './ids';
import {
  createAIEvidence,
  evaluateConfidence,
  generateGroundedDependency,
  createGroundedAssertion,
  attachEvidenceToEdit,
  filterLowConfidenceAssertions,
  formatEvidenceCitation,
} from './ai-confidence';

describe('AI Evidence and Confidence Engine (F120)', () => {
  const archId = createId('arch');
  const verId = createId('ver');
  const serviceAId = createId('app');
  const serviceBId = createId('app');

  describe('formatEvidenceCitation & createAIEvidence', () => {
    it('formats citation strings with repo, file, line ranges, and symbols', () => {
      const citation = formatEvidenceCitation({
        repo: 'github.com/acme/order-service',
        filePath: 'src/clients/payment.ts',
        lineStart: 42,
        lineEnd: 55,
        symbol: 'processPayment',
      });
      expect(citation).toBe('github.com/acme/order-service:src/clients/payment.ts#L42-L55 (processPayment)');
    });

    it('creates structured evidence with computed strength and location bonuses', () => {
      const evidence = createAIEvidence({
        sourceType: 'ast_call',
        location: {
          repo: 'github.com/acme/order-service',
          filePath: 'src/clients/payment.ts',
          lineStart: 42,
          lineEnd: 45,
          symbol: 'PaymentClient.charge',
        },
        description: 'Direct AST invocation of payment RPC client',
      });

      expect(evidence.sourceType).toBe('ast_call');
      expect(evidence.strength).toBeGreaterThanOrEqual(0.95);
      expect(evidence.rawCitation).toContain('github.com/acme/order-service:src/clients/payment.ts#L42-L45');
      expect(evidence.rawCitation).toContain('(PaymentClient.charge)');
    });
  });

  describe('Acceptance Criteria: Generated dependency includes evidence & flags low confidence', () => {
    it('generates a dependency with high-confidence code evidence', () => {
      const evidence1 = createAIEvidence({
        sourceType: 'ast_call',
        location: {
          repo: 'github.com/acme/orders',
          filePath: 'src/services/billing-adapter.ts',
          lineStart: 110,
          lineEnd: 118,
          symbol: 'StripeClient.createCharge',
        },
        description: 'Hardcoded API call in checkout flow',
      });

      const evidence2 = createAIEvidence({
        sourceType: 'config_file',
        location: {
          repo: 'github.com/acme/orders',
          filePath: 'k8s/deployment.yaml',
          lineStart: 45,
          lineEnd: 48,
        },
        description: 'Kubernetes egress network policy permitting billing traffic',
      });

      const groundedDep = generateGroundedDependency({
        architectureId: archId,
        versionId: verId,
        sourceObjectId: serviceAId,
        targetObjectId: serviceBId,
        protocol: 'HTTPS REST',
        evidence: [evidence1, evidence2],
      });

      // 1. Dependency includes evidence
      expect(groundedDep.evidence).toHaveLength(2);
      expect(groundedDep.evidence[0].rawCitation).toContain('billing-adapter.ts#L110-L118');
      expect(groundedDep.confidence.score).toBeGreaterThanOrEqual(0.85);
      expect(groundedDep.confidence.tier).toBe('high');
      expect(groundedDep.confidence.isLowConfidence).toBe(false);
      expect(groundedDep.confidence.flagged).toBe(false);
      expect(groundedDep.requiresHumanVerification).toBe(false);

      // Connection entity metadata includes evidence citations and confidence
      expect(groundedDep.connection.metadata?.evidenceCitations).toEqual([
        evidence1.rawCitation,
        evidence2.rawCitation,
      ]);
      expect(groundedDep.connection.metadata?.confidenceScore).toBe(groundedDep.confidence.score);
    });

    it('flags low confidence when generated dependency is based on weak or unanchored heuristic evidence', () => {
      const weakEvidence = createAIEvidence({
        sourceType: 'heuristic',
        location: {
          // Missing filePath and line numbers
          repo: 'github.com/acme/orders',
        },
        description: 'Fuzzy keyword "payment" found in unstructured README text',
        strength: 0.35,
      });

      const groundedDep = generateGroundedDependency({
        architectureId: archId,
        versionId: verId,
        sourceObjectId: serviceAId,
        targetObjectId: serviceBId,
        protocol: 'Inferred',
        evidence: [weakEvidence],
      });

      // 2. Dependency includes evidence AND flags low confidence
      expect(groundedDep.evidence).toHaveLength(1);
      expect(groundedDep.confidence.score).toBeLessThan(0.6);
      expect(groundedDep.confidence.tier).toBe('low');
      expect(groundedDep.confidence.isLowConfidence).toBe(true);
      expect(groundedDep.confidence.flagged).toBe(true);
      expect(groundedDep.requiresHumanVerification).toBe(true);
      expect(groundedDep.confidence.reasons.length).toBeGreaterThan(0);
      expect(groundedDep.connection.metadata?.isLowConfidence).toBe(true);
      expect(groundedDep.connection.metadata?.flagged).toBe(true);
    });
  });

  describe('Confidence evaluation and edit grounding', () => {
    it('evaluates empty evidence as low confidence requiring manual verification', () => {
      const evaluation = evaluateConfidence([]);
      expect(evaluation.isLowConfidence).toBe(true);
      expect(evaluation.flagged).toBe(true);
      expect(evaluation.score).toBeLessThan(0.3);
      expect(evaluation.reasons).toContain('No grounded evidence provided for this assertion.');
    });

    it('attaches evidence to architectural edits and filters low confidence assertions', () => {
      const strongEvidence = createAIEvidence({
        sourceType: 'ast_call',
        location: {
          repo: 'github.com/acme/core',
          filePath: 'src/main.ts',
          lineStart: 12,
          lineEnd: 15,
        },
        description: 'Entrypoint import statement',
      });

      const weakEvidence = createAIEvidence({
        sourceType: 'heuristic',
        description: 'Vague hunch',
        strength: 0.25,
      });

      const strongAssertion = attachEvidenceToEdit('edit-1', 'Add Redis cache layer', [strongEvidence]);
      const weakAssertion = attachEvidenceToEdit('edit-2', 'Remove Auth Gateway', [weakEvidence]);

      expect(strongAssertion.confidence.isLowConfidence).toBe(false);
      expect(weakAssertion.confidence.isLowConfidence).toBe(true);

      const flagged = filterLowConfidenceAssertions([strongAssertion, weakAssertion]);
      expect(flagged).toHaveLength(1);
      expect(flagged[0]?.subjectId).toBe('edit-2');
    });

    it('creates grounded assertion for arbitrary claims and models', () => {
      const evidence = createAIEvidence({
        sourceType: 'config_file',
        location: {
          repo: 'github.com/acme/infra',
          filePath: 'helm/values.yaml',
          lineStart: 50,
          lineEnd: 55,
        },
        description: 'TLS ingress configuration',
      });

      const assertion = createGroundedAssertion({
        kind: 'protocol',
        claim: 'Ingress enforces TLS 1.3 with strict ciphers',
        subjectId: serviceAId,
        evidence: [evidence],
        payload: { minTlsVersion: '1.3' },
      });

      expect(assertion.kind).toBe('protocol');
      expect(assertion.claim).toContain('TLS 1.3');
      expect(assertion.evidence).toHaveLength(1);
      expect(assertion.payload).toEqual({ minTlsVersion: '1.3' });
      expect(assertion.confidence.score).toBeGreaterThan(0.7);
    });
  });
});
