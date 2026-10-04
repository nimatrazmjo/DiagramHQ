import { describe, expect, it } from 'vitest';
import type { ObjectId, OrgId, UserId } from './ids';
import {
  attachEvidenceToControlMapping,
  BUILTIN_CONTROLS,
  createControlMapping,
  FRAMEWORK_CATALOG,
  summarizeCompliancePack,
  updateControlMappingStatus,
  type ComplianceEvidence,
  type ControlMapping,
  type ControlOwner,
} from './compliance-packs';

describe('F131 — Compliance Packs & Regulatory Framework Mappings Domain Logic', () => {
  const orgId = 'org_fintech_corp' as OrgId;
  const owner: ControlOwner = {
    userId: 'usr_compliance_lead' as UserId,
    name: 'Eleanor Vance',
    email: 'eleanor@fintech.corp',
    role: 'Chief Compliance Officer',
  };

  describe('Framework Catalog & Builtin Controls', () => {
    it('supports all 7 core compliance frameworks', () => {
      const frameworkIds = Object.keys(FRAMEWORK_CATALOG);
      expect(frameworkIds).toContain('soc2');
      expect(frameworkIds).toContain('iso27001');
      expect(frameworkIds).toContain('gdpr');
      expect(frameworkIds).toContain('hipaa');
      expect(frameworkIds).toContain('pci_dss');
      expect(frameworkIds).toContain('nist_sp_800_53');
      expect(frameworkIds).toContain('cis_controls');
    });

    it('populates actionable control definitions across every supported framework', () => {
      expect(BUILTIN_CONTROLS.length).toBeGreaterThanOrEqual(14);
      for (const control of BUILTIN_CONTROLS) {
        expect(control.id).toBeTruthy();
        expect(control.code).toBeTruthy();
        expect(control.title).toBeTruthy();
        expect(control.description).toBeTruthy();
        expect(control.guidance).toBeTruthy();
      }
    });
  });

  describe('Acceptance Criteria: Map a control; evidence + status shown; no false compliant badge', () => {
    it('maps a control to architecture objects, attaches evidence, shows status, and never auto-claims compliance', () => {
      const targetObjects: ObjectId[] = [
        'app_payment_gateway' as ObjectId,
        'sto_cardholder_vault' as ObjectId,
      ];

      const initialEvidence: ComplianceEvidence = {
        id: 'ev_enc_spec_01',
        title: 'AES-256-GCM Envelope Encryption Configuration & KMS Policy',
        type: 'encryption_spec',
        uriOrRef: 'kms/arn:aws:kms:us-east-1:123456789012:key/payment-key',
        collectedAt: new Date().toISOString(),
      };

      // 1. Map a control
      const mapping = createControlMapping({
        orgId,
        frameworkId: 'pci_dss',
        controlId: 'PCI-Req-3.4',
        mappedObjectIds: targetObjects,
        evidenceItems: [initialEvidence],
        owner,
        notes: 'Cardholder data encrypted at rest with AWS KMS envelope encryption.',
      });

      // 2. Control -> objects -> evidence -> owner -> status verified
      expect(mapping.id).toBeTruthy();
      expect(mapping.controlId).toBe('PCI-Req-3.4');
      expect(mapping.controlCode).toBe('Req 3.4');
      expect(mapping.mappedObjectIds).toEqual(targetObjects);
      expect(mapping.evidenceItems).toHaveLength(1);
      expect(mapping.evidenceItems[0]?.title).toContain('AES-256-GCM');
      expect(mapping.owner.email).toBe('eleanor@fintech.corp');
      expect(mapping.status).toBe('evidence_collected');

      // 3. Attach additional evidence
      const additionalEvidence: ComplianceEvidence = {
        id: 'ev_diag_02',
        title: 'PCI C4 Level 2 Container Architecture Diagram',
        type: 'architecture_diagram',
        uriOrRef: 'arch/vw_pci_cardholder_boundary',
        collectedAt: new Date().toISOString(),
      };
      const updatedMapping = attachEvidenceToControlMapping(mapping, additionalEvidence);
      expect(updatedMapping.evidenceItems).toHaveLength(2);

      // 4. Update status along human review lifecycle
      const underReview = updateControlMappingStatus(
        updatedMapping,
        'under_audit_review',
        'Submitted to Coalfire QSA for annual assessment.',
      );
      expect(underReview.status).toBe('under_audit_review');

      // 5. Invariant: NO false 'compliant' badge
      const summary = summarizeCompliancePack([underReview], 'pci_dss');
      expect(summary.hasAutoClaimedCompliance).toBe(false);
      expect(summary.disclaimer).toContain('Certification requires independent third-party auditor attestation');
      // Even with 2 pieces of evidence attached, status is 'under_audit_review' NOT a false auto-compliant badge
      expect(summary.statusBreakdown.under_audit_review).toBe(1);
      expect(summary.statusBreakdown.attested).toBe(0);
      expect(summary.attestationProgressPercent).toBe(0);
    });

    it('advances to attested only when explicitly attested by an auditor', () => {
      const mapping = createControlMapping({
        orgId,
        frameworkId: 'soc2',
        controlId: 'SOC2-CC6.1',
        mappedObjectIds: ['sys_auth_gateway' as ObjectId],
        evidenceItems: [
          {
            id: 'ev_audit_01',
            title: 'Immutable Audit Log Sample with Merkle Proof',
            type: 'audit_log',
            uriOrRef: 'audit/log_q3_sample',
            collectedAt: new Date().toISOString(),
          },
        ],
        owner,
      });

      // Explicit auditor attestation
      const attestedMapping: ControlMapping = updateControlMappingStatus(
        mapping,
        'attested',
        'Auditor Ernst & Young confirmed CC6.1 operating effectively.',
      );

      expect(attestedMapping.status).toBe('attested');
      expect(attestedMapping.notes).toContain('Ernst & Young');

      const summary = summarizeCompliancePack([attestedMapping], 'soc2');
      expect(summary.hasAutoClaimedCompliance).toBe(false);
      expect(summary.statusBreakdown.attested).toBe(1);
      expect(summary.attestationProgressPercent).toBeGreaterThan(0);
    });
  });
});
