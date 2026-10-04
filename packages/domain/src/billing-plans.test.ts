import { describe, expect, it } from 'vitest';
import type { OrgId } from './ids';
import {
  calculateInvoice,
  checkFeatureAccess,
  checkUsageLimit,
  createDefaultSubscription,
  enforceTierGating,
  enforceUsageLimit,
  FEATURE_MINIMUM_TIERS,
  TIER_DEFINITIONS,
  TierGatingError,
  upgradeSubscription,
  UsageLimitExceededError,
  type GatedFeature,
  type SubscriptionTier,
} from './billing-plans';

describe('Billing & Plans Domain Logic (F132)', () => {
  const orgId = 'org_finance_platform' as OrgId;

  describe('Tier Definitions & Entitlements Catalog', () => {
    it('defines 4 standard tiers with progressive feature allowances and quotas', () => {
      const tiers: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];

      for (const tier of tiers) {
        const def = TIER_DEFINITIONS[tier];
        expect(def.id).toBe(tier);
        expect(def.name).toBeTruthy();
        expect(def.limits.maxSeats).toBeGreaterThan(0);
        expect(def.limits.maxObjects).toBeGreaterThan(0);
        expect(def.limits.maxViews).toBeGreaterThan(0);
        expect(def.limits.monthlyAiCredits).toBeGreaterThan(0);
      }

      // Pro limits > Free limits
      expect(TIER_DEFINITIONS.pro.limits.maxObjects).toBeGreaterThan(
        TIER_DEFINITIONS.free.limits.maxObjects,
      );
      // Business limits > Pro limits
      expect(TIER_DEFINITIONS.business.limits.maxObjects).toBeGreaterThan(
        TIER_DEFINITIONS.pro.limits.maxObjects,
      );
      // Enterprise limits are unbounded (Infinity)
      expect(TIER_DEFINITIONS.enterprise.limits.maxObjects).toBe(Infinity);
      expect(TIER_DEFINITIONS.enterprise.limits.maxSeats).toBe(Infinity);
      expect(TIER_DEFINITIONS.enterprise.limits.monthlyAiCredits).toBe(Infinity);
    });

    it('maps minimum required tiers for every gated enterprise feature', () => {
      expect(FEATURE_MINIMUM_TIERS.ai_copilot).toBe('pro');
      expect(FEATURE_MINIMUM_TIERS.sso_saml).toBe('business');
      expect(FEATURE_MINIMUM_TIERS.scim_provisioning).toBe('business');
      expect(FEATURE_MINIMUM_TIERS.org_policies).toBe('business');
      expect(FEATURE_MINIMUM_TIERS.advanced_rbac).toBe('business');
      expect(FEATURE_MINIMUM_TIERS.compliance_packs).toBe('enterprise');
      expect(FEATURE_MINIMUM_TIERS.private_vpc_deployment).toBe('enterprise');
    });
  });

  describe('Feature Access & Tier Gating', () => {
    it('accurately evaluates feature access across all tiers', () => {
      // Free tier
      expect(checkFeatureAccess('free', 'ai_copilot').allowed).toBe(false);
      expect(checkFeatureAccess('free', 'sso_saml').allowed).toBe(false);
      expect(checkFeatureAccess('free', 'compliance_packs').allowed).toBe(false);

      // Pro tier
      expect(checkFeatureAccess('pro', 'ai_copilot').allowed).toBe(true);
      expect(checkFeatureAccess('pro', 'team_collaboration').allowed).toBe(true);
      expect(checkFeatureAccess('pro', 'sso_saml').allowed).toBe(false);

      // Business tier
      expect(checkFeatureAccess('business', 'sso_saml').allowed).toBe(true);
      expect(checkFeatureAccess('business', 'scim_provisioning').allowed).toBe(true);
      expect(checkFeatureAccess('business', 'compliance_packs').allowed).toBe(false);

      // Enterprise tier
      expect(checkFeatureAccess('enterprise', 'compliance_packs').allowed).toBe(true);
      expect(checkFeatureAccess('enterprise', 'private_vpc_deployment').allowed).toBe(true);
      expect(checkFeatureAccess('enterprise', 'custom_audit_retention').allowed).toBe(true);
    });

    it('throws TierGatingError when an unauthorized feature is enforced', () => {
      // Free trying to use Business feature
      expect(() => enforceTierGating('free', 'sso_saml')).toThrow(TierGatingError);
      try {
        enforceTierGating('free', 'sso_saml');
      } catch (err) {
        expect(err).toBeInstanceOf(TierGatingError);
        const gatingErr = err as TierGatingError;
        expect(gatingErr.feature).toBe('sso_saml');
        expect(gatingErr.currentTier).toBe('free');
        expect(gatingErr.requiredTier).toBe('business');
      }

      // Pro trying to use Enterprise feature
      expect(() => enforceTierGating('pro', 'compliance_packs')).toThrow(TierGatingError);

      // Enterprise allowed everything
      expect(() => enforceTierGating('enterprise', 'compliance_packs')).not.toThrow();
      expect(() => enforceTierGating('enterprise', 'private_vpc_deployment')).not.toThrow();
    });
  });

  describe('Usage Quota Checking & Enforcement', () => {
    it('checks quota limits and percentage consumption', () => {
      // Free has 50 objects limit
      const check1 = checkUsageLimit('free', 'objects', 30, 10);
      expect(check1.allowed).toBe(true);
      expect(check1.limit).toBe(50);
      expect(check1.remaining).toBe(20);
      expect(check1.newTotal).toBe(40);
      expect(check1.percentageUsed).toBe(60);

      // Attempting to exceed free limit (45 + 10 = 55 > 50)
      const check2 = checkUsageLimit('free', 'objects', 45, 10);
      expect(check2.allowed).toBe(false);
      expect(check2.newTotal).toBe(55);
    });

    it('throws UsageLimitExceededError when over-limit usage is enforced', () => {
      // 50 max objects on Free tier
      expect(() => enforceUsageLimit('free', 'objects', 50, 1)).toThrow(
        UsageLimitExceededError,
      );

      try {
        enforceUsageLimit('free', 'objects', 50, 5);
      } catch (err) {
        expect(err).toBeInstanceOf(UsageLimitExceededError);
        const limitErr = err as UsageLimitExceededError;
        expect(limitErr.metric).toBe('objects');
        expect(limitErr.currentUsage).toBe(50);
        expect(limitErr.limit).toBe(50);
        expect(limitErr.requestedDelta).toBe(5);
        expect(limitErr.currentTier).toBe('free');
      }

      // Pro allows up to 500 objects
      expect(() => enforceUsageLimit('pro', 'objects', 50, 5)).not.toThrow();
      expect(() => enforceUsageLimit('pro', 'objects', 500, 1)).toThrow(UsageLimitExceededError);

      // Enterprise allows infinite usage without throwing
      expect(() => enforceUsageLimit('enterprise', 'objects', 100_000, 50_000)).not.toThrow();
      expect(() => enforceUsageLimit('enterprise', 'monthlyAiCredits', 1_000_000, 10_000)).not.toThrow();
    });
  });

  describe('Subscription Upgrades & Invoice Calculation', () => {
    it('creates active default subscription and upgrades seamlessly', () => {
      const sub = createDefaultSubscription(orgId, 'free', 'monthly');
      expect(sub.tier).toBe('free');
      expect(sub.status).toBe('active');
      expect(sub.billingCycle).toBe('monthly');
      expect(sub.allocatedSeats).toBe(2);

      const upgraded = upgradeSubscription(sub, 'business', 'annual');
      expect(upgraded.tier).toBe('business');
      expect(upgraded.billingCycle).toBe('annual');
      expect(upgraded.allocatedSeats).toBe(15);
      expect(new Date(upgraded.currentPeriodEnd).getTime()).toBeGreaterThan(
        new Date(sub.currentPeriodEnd).getTime(),
      );
    });

    it('calculates invoice pricing with annual discount incentives', () => {
      const monthlyInvoice = calculateInvoice('business', 'monthly', 10);
      expect(monthlyInvoice.unitPriceUsd).toBe(59);
      expect(monthlyInvoice.totalBilledUsd).toBe(590);
      expect(monthlyInvoice.discountPercent).toBe(0);

      const annualInvoice = calculateInvoice('business', 'annual', 10);
      expect(annualInvoice.unitPriceUsd).toBe(49);
      expect(annualInvoice.monthlyEquivalentUsd).toBe(490);
      expect(annualInvoice.totalBilledUsd).toBe(490 * 12);
      expect(annualInvoice.discountPercent).toBe(17);
    });
  });

  describe('Acceptance Criteria: Tier gating enforced; over-limit blocked', () => {
    it('strictly enforces tier gating on features and blocks actions exceeding quotas', () => {
      const freeTier: SubscriptionTier = 'free';
      const enterpriseFeature: GatedFeature = 'compliance_packs';

      // 1. Tier gating enforced: Free tier cannot access Enterprise compliance packs
      expect(() => enforceTierGating(freeTier, enterpriseFeature)).toThrow(TierGatingError);

      // 2. Over-limit blocked: Free tier cannot exceed seat quota (limit: 2)
      expect(() => enforceUsageLimit(freeTier, 'seats', 2, 1)).toThrow(UsageLimitExceededError);

      // 3. Upgrading to Enterprise unlocks compliance packs and unblocks seats
      const enterpriseTier: SubscriptionTier = 'enterprise';
      expect(() => enforceTierGating(enterpriseTier, enterpriseFeature)).not.toThrow();
      expect(() => enforceUsageLimit(enterpriseTier, 'seats', 250, 10)).not.toThrow();
    });
  });
});
