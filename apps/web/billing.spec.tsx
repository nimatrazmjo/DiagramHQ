import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createDefaultSubscription,
  enforceTierGating,
  enforceUsageLimit,
  TierGatingError,
  UsageLimitExceededError,
  type OrgId,
} from '@diagramhq/domain';
import { BillingModal } from './components/enterprise/billing-modal';

describe('Billing, Plans & Quota Management UI (F132)', () => {
  const orgId = 'org_fintech_billing' as OrgId;

  describe('BillingModal Component Rendering', () => {
    it('renders modal with plan cards, pricing, and active tier indicator', () => {
      const html = renderToString(
        <BillingModal isOpen={true} onClose={() => {}} orgId={orgId} />
      );

      expect(html).toContain('Billing, Plans &amp; Usage Quotas');
      expect(html).toContain('F132 Verified');
      expect(html).toContain('Free Tier');
      expect(html).toContain('Pro');
      expect(html).toContain('Business');
      expect(html).toContain('Enterprise');
      expect(html).toContain('Subscription Plans');
      expect(html).toContain('Usage &amp; Quotas');
      expect(html).toContain('Feature Gating Matrix');
      expect(html).toContain('Interactive Enforcement Simulator');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <BillingModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: Tier gating enforced; over-limit blocked', () => {
    it('strictly enforces feature gating across tiers and blocks operations exceeding usage quotas', () => {
      // 1. Initialize Free tier subscription
      const freeSub = createDefaultSubscription(orgId, 'free', 'monthly');

      const htmlFree = renderToString(
        <BillingModal
          isOpen={true}
          onClose={() => {}}
          orgId={orgId}
          initialSubscription={freeSub}
          initialUsage={{
            seats: 2,
            objects: 50,
            views: 3,
            monthlyAiCredits: 50,
            auditLogRetentionDays: 7,
          }}
        />
      );

      // Verify Free tier limits displayed
      expect(htmlFree).toContain('Free Tier');
      expect(htmlFree).toContain('2 Seats Max');
      expect(htmlFree).toContain('50 Model Objects');
      expect(htmlFree).toContain('50 AI Queries/mo');
      expect(htmlFree).toContain('7-Day Audit Logs');

      // 2. Invariant: Tier Gating Enforced
      // Attempting to access Enterprise feature (compliance_packs) from Free tier throws TierGatingError
      expect(() => enforceTierGating(freeSub.tier, 'compliance_packs')).toThrow(TierGatingError);
      // Attempting to access Business feature (sso_saml) from Free tier throws TierGatingError
      expect(() => enforceTierGating(freeSub.tier, 'sso_saml')).toThrow(TierGatingError);

      // 3. Invariant: Over-Limit Blocked
      // Current seats: 2. Max seats: 2. Adding +1 seat is strictly blocked
      expect(() => enforceUsageLimit(freeSub.tier, 'seats', 2, 1)).toThrow(
        UsageLimitExceededError,
      );
      // Current objects: 50. Max objects: 50. Adding +10 objects is strictly blocked
      expect(() => enforceUsageLimit(freeSub.tier, 'objects', 50, 10)).toThrow(
        UsageLimitExceededError,
      );

      // 4. Upgrade to Enterprise unlocks all features and unblocks quotas
      const enterpriseSub = createDefaultSubscription(orgId, 'enterprise', 'annual');
      const htmlEnterprise = renderToString(
        <BillingModal
          isOpen={true}
          onClose={() => {}}
          orgId={orgId}
          initialSubscription={enterpriseSub}
        />
      );

      expect(htmlEnterprise).toContain('Enterprise Tier');
      expect(htmlEnterprise).toContain('Unlimited Seats');
      expect(htmlEnterprise).toContain('Unlimited Objects');
      expect(htmlEnterprise).toContain('Unlimited AI Queries');

      // Enterprise tier allows gated feature and unlimited quotas
      expect(() => enforceTierGating(enterpriseSub.tier, 'compliance_packs')).not.toThrow();
      expect(() => enforceUsageLimit(enterpriseSub.tier, 'seats', 1000, 50)).not.toThrow();
    });
  });
});
