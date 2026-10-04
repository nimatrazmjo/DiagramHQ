import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createControlMapping,
  summarizeCompliancePack,
  type ComplianceEvidence,
  type ObjectId,
  type OrgId,
  type UserId,
} from '@diagramhq/domain';
import { CompliancePacksModal } from './components/enterprise/compliance-packs-modal';

describe('Compliance Packs & Regulatory Framework Mappings UI & Invariants (F131)', () => {
  const orgId = 'org_fintech_enterprise' as OrgId;

  describe('CompliancePacksModal Component Rendering', () => {
    it('renders modal with framework selector, KPI counters, and auditor integrity disclaimer', () => {
      const html = renderToString(
        <CompliancePacksModal isOpen={true} onClose={() => {}} orgId={orgId} />
      );

      expect(html).toContain('Compliance Packs &amp; Regulatory Frameworks');
      expect(html).toContain('F131 Verified');
      expect(html).toContain('SOC 2 Type II');
      expect(html).toContain('ISO/IEC 27001:2022');
      expect(html).toContain('EU GDPR');
      expect(html).toContain('HIPAA Security Rule');
      expect(html).toContain('PCI DSS v4.0');
      expect(html).toContain('NIST SP 800-53 Rev. 5');
      expect(html).toContain('CIS Critical Security Controls');
      expect(html).toContain('Framework Pack');
      expect(html).toContain('Mapped Controls');
      expect(html).toContain('Evidence Artifacts');
      expect(html).toContain('Attestation Progress');
      expect(html).toContain('Auditor Integrity Guarantee');
      expect(html).toContain('Certification requires independent third-party auditor attestation');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <CompliancePacksModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe("Acceptance Criteria: Map a control; evidence + status shown; no false 'compliant' badge", () => {
    it('maps a control to architecture objects and evidence, displays status, and strictly avoids any false compliant badge', () => {
      const evidence: ComplianceEvidence = {
        id: 'ev_pci_crypto_01',
        title: 'Hardware-backed AES-256-GCM Key Vault Specification',
        type: 'encryption_spec',
        uriOrRef: 'kms/arn:aws:kms:us-east-1:123456789012:key/cardholder-vault',
        collectedAt: new Date().toISOString(),
      };

      // Map a control: Control -> objects -> evidence -> owner -> status
      const mapping = createControlMapping({
        orgId,
        frameworkId: 'pci_dss',
        controlId: 'PCI-Req-3.4',
        mappedObjectIds: ['sto_pan_vault' as ObjectId, 'app_payment_checkout' as ObjectId],
        evidenceItems: [evidence],
        owner: {
          userId: 'usr_ciso_1' as UserId,
          name: 'Sarah Connor',
          email: 'sconnor@cyberdyne.corp',
          role: 'VP Information Security',
        },
        notes: 'PAN data tokenized before persistence in isolated datastore.',
      });

      // Render modal with this mapping
      const html = renderToString(
        <CompliancePacksModal
          isOpen={true}
          onClose={() => {}}
          orgId={orgId}
          initialFramework="pci_dss"
          initialMappings={[mapping]}
        />
      );

      // 1. Control shown
      expect(html).toContain('Req 3.4');
      expect(html).toContain('Protect Stored Account Data with Strong Cryptography');

      // 2. Status shown
      expect(html).toContain('Evidence Collected');

      // 3. Evidence + Object mapping shown
      expect(html).toContain('1 Linked');

      // 4. Invariant: NO false 'compliant' badge
      const summary = summarizeCompliancePack([mapping], 'pci_dss');
      expect(summary.hasAutoClaimedCompliance).toBe(false);
      expect(html).not.toContain('>COMPLIANT<');
      expect(html).not.toContain('Badge: Certified Compliant');
      expect(html).toContain('Certification requires independent third-party auditor attestation');
    });
  });
});
