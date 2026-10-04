import { createId, type OrgId, type SubscriptionId } from './ids';

// ============================================================================
// 1. Types & Catalogs
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export type GatedFeature =
  | 'unlimited_objects'
  | 'team_collaboration'
  | 'github_gitlab_sync'
  | 'ai_copilot'
  | 'pdf_svg_clean_export'
  | 'sso_saml'
  | 'scim_provisioning'
  | 'org_policies'
  | 'advanced_rbac'
  | 'compliance_packs'
  | 'private_vpc_deployment'
  | 'custom_audit_retention'
  | 'dedicated_sla_support';

export type UsageMetric =
  | 'seats'
  | 'objects'
  | 'views'
  | 'monthlyAiCredits'
  | 'auditLogRetentionDays';

export interface TierLimits {
  readonly maxSeats: number;
  readonly maxObjects: number;
  readonly maxViews: number;
  readonly monthlyAiCredits: number;
  readonly auditLogRetentionDays: number;
}

export interface TierDefinition {
  readonly id: SubscriptionTier;
  readonly name: string;
  readonly tagline: string;
  readonly monthlyPriceUsdPerSeat: number;
  readonly annualPriceUsdPerSeat: number;
  readonly limits: TierLimits;
  readonly allowedFeatures: readonly GatedFeature[];
}

export interface OrganizationSubscription {
  readonly id: SubscriptionId;
  readonly orgId: OrgId;
  readonly tier: SubscriptionTier;
  readonly status: SubscriptionStatus;
  readonly billingCycle: BillingCycle;
  readonly allocatedSeats: number;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly updatedAt: string;
}

export interface OrganizationUsage {
  readonly seats: number;
  readonly objects: number;
  readonly views: number;
  readonly monthlyAiCredits: number;
  readonly auditLogRetentionDays: number;
}

export interface InvoiceDetails {
  readonly tier: SubscriptionTier;
  readonly billingCycle: BillingCycle;
  readonly seats: number;
  readonly unitPriceUsd: number;
  readonly monthlyEquivalentUsd: number;
  readonly totalBilledUsd: number;
  readonly discountPercent: number;
}

// ============================================================================
// 2. Built-in Tier Definitions
// ============================================================================

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For individual developers exploring architecture modeling',
    monthlyPriceUsdPerSeat: 0,
    annualPriceUsdPerSeat: 0,
    limits: {
      maxSeats: 2,
      maxObjects: 50,
      maxViews: 3,
      monthlyAiCredits: 50,
      auditLogRetentionDays: 7,
    },
    allowedFeatures: [],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For fast-moving engineering teams building production systems',
    monthlyPriceUsdPerSeat: 24,
    annualPriceUsdPerSeat: 20, // 16.7% discount
    limits: {
      maxSeats: 10,
      maxObjects: 500,
      maxViews: 25,
      monthlyAiCredits: 1000,
      auditLogRetentionDays: 30,
    },
    allowedFeatures: [
      'unlimited_objects',
      'team_collaboration',
      'github_gitlab_sync',
      'ai_copilot',
      'pdf_svg_clean_export',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'For scale-ups requiring SSO, SCIM provisioning, and governance policies',
    monthlyPriceUsdPerSeat: 59,
    annualPriceUsdPerSeat: 49, // 17% discount
    limits: {
      maxSeats: 50,
      maxObjects: 5000,
      maxViews: 100,
      monthlyAiCredits: 10000,
      auditLogRetentionDays: 90,
    },
    allowedFeatures: [
      'unlimited_objects',
      'team_collaboration',
      'github_gitlab_sync',
      'ai_copilot',
      'pdf_svg_clean_export',
      'sso_saml',
      'scim_provisioning',
      'org_policies',
      'advanced_rbac',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For global enterprises needing private VPC deployment, compliance packs, and custom SLA',
    monthlyPriceUsdPerSeat: 149,
    annualPriceUsdPerSeat: 120, // 19.5% discount
    limits: {
      maxSeats: Infinity,
      maxObjects: Infinity,
      maxViews: Infinity,
      monthlyAiCredits: Infinity,
      auditLogRetentionDays: 365,
    },
    allowedFeatures: [
      'unlimited_objects',
      'team_collaboration',
      'github_gitlab_sync',
      'ai_copilot',
      'pdf_svg_clean_export',
      'sso_saml',
      'scim_provisioning',
      'org_policies',
      'advanced_rbac',
      'compliance_packs',
      'private_vpc_deployment',
      'custom_audit_retention',
      'dedicated_sla_support',
    ],
  },
};

export const FEATURE_MINIMUM_TIERS: Record<GatedFeature, SubscriptionTier> = {
  unlimited_objects: 'pro',
  team_collaboration: 'pro',
  github_gitlab_sync: 'pro',
  ai_copilot: 'pro',
  pdf_svg_clean_export: 'pro',
  sso_saml: 'business',
  scim_provisioning: 'business',
  org_policies: 'business',
  advanced_rbac: 'business',
  compliance_packs: 'enterprise',
  private_vpc_deployment: 'enterprise',
  custom_audit_retention: 'enterprise',
  dedicated_sla_support: 'enterprise',
};

// ============================================================================
// 3. Custom Error Types
// ============================================================================

export class TierGatingError extends Error {
  constructor(
    public readonly feature: GatedFeature,
    public readonly currentTier: SubscriptionTier,
    public readonly requiredTier: SubscriptionTier,
  ) {
    super(
      `Feature '${feature}' is locked on the ${currentTier.toUpperCase()} tier. Upgrade to ${requiredTier.toUpperCase()} or higher to access this capability.`,
    );
    this.name = 'TierGatingError';
  }
}

export class UsageLimitExceededError extends Error {
  constructor(
    public readonly metric: UsageMetric,
    public readonly currentUsage: number,
    public readonly limit: number,
    public readonly requestedDelta: number,
    public readonly currentTier: SubscriptionTier,
  ) {
    const newTotal = currentUsage + requestedDelta;
    super(
      `Usage limit exceeded for '${metric}' on ${currentTier.toUpperCase()} tier. Current: ${currentUsage}, Limit: ${limit}, Requested: +${requestedDelta} (Total: ${newTotal}). Upgrade your plan to increase quotas.`,
    );
    this.name = 'UsageLimitExceededError';
  }
}

// ============================================================================
// 4. Verification & Enforcement Operations
// ============================================================================

/**
 * Checks whether a feature is permitted on a given subscription tier.
 */
export function checkFeatureAccess(
  tier: SubscriptionTier,
  feature: GatedFeature,
): {
  allowed: boolean;
  requiredTier: SubscriptionTier;
  currentTier: SubscriptionTier;
} {
  const tierDef = TIER_DEFINITIONS[tier];
  const allowed = tierDef.allowedFeatures.includes(feature);
  const requiredTier = FEATURE_MINIMUM_TIERS[feature];

  return {
    allowed,
    requiredTier,
    currentTier: tier,
  };
}

/**
 * Enforces tier gating. Throws TierGatingError if current tier does not permit feature.
 */
export function enforceTierGating(tier: SubscriptionTier, feature: GatedFeature): void {
  const access = checkFeatureAccess(tier, feature);
  if (!access.allowed) {
    throw new TierGatingError(feature, tier, access.requiredTier);
  }
}

/**
 * Checks whether current usage + delta stays within the tier quota.
 */
export function checkUsageLimit(
  tier: SubscriptionTier,
  metric: UsageMetric,
  currentUsage: number,
  delta = 1,
): {
  allowed: boolean;
  limit: number;
  currentUsage: number;
  requestedDelta: number;
  newTotal: number;
  remaining: number;
  percentageUsed: number;
} {
  const tierDef = TIER_DEFINITIONS[tier];
  let limit: number;

  switch (metric) {
    case 'seats':
      limit = tierDef.limits.maxSeats;
      break;
    case 'objects':
      limit = tierDef.limits.maxObjects;
      break;
    case 'views':
      limit = tierDef.limits.maxViews;
      break;
    case 'monthlyAiCredits':
      limit = tierDef.limits.monthlyAiCredits;
      break;
    case 'auditLogRetentionDays':
      limit = tierDef.limits.auditLogRetentionDays;
      break;
  }

  const newTotal = currentUsage + delta;
  const isInfinite = !Number.isFinite(limit);
  const allowed = isInfinite || newTotal <= limit;
  const remaining = isInfinite ? Infinity : Math.max(0, limit - currentUsage);
  const percentageUsed = isInfinite ? 0 : Math.min(100, Math.round((currentUsage / limit) * 100));

  return {
    allowed,
    limit,
    currentUsage,
    requestedDelta: delta,
    newTotal,
    remaining,
    percentageUsed,
  };
}

/**
 * Enforces usage limits. Throws UsageLimitExceededError if over quota.
 */
export function enforceUsageLimit(
  tier: SubscriptionTier,
  metric: UsageMetric,
  currentUsage: number,
  delta = 1,
): void {
  const result = checkUsageLimit(tier, metric, currentUsage, delta);
  if (!result.allowed) {
    throw new UsageLimitExceededError(metric, currentUsage, result.limit, delta, tier);
  }
}

// ============================================================================
// 5. Subscription Management & Pricing Invariants
// ============================================================================

/**
 * Creates default active subscription for an organization.
 */
export function createDefaultSubscription(
  orgId: OrgId,
  tier: SubscriptionTier = 'free',
  billingCycle: BillingCycle = 'monthly',
): OrganizationSubscription {
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'annual') {
    periodEnd.setFullYear(now.getFullYear() + 1);
  } else {
    periodEnd.setMonth(now.getMonth() + 1);
  }

  const defaultSeats = tier === 'free' ? 2 : tier === 'pro' ? 5 : tier === 'business' ? 15 : 50;

  return {
    id: createId('sub'),
    orgId,
    tier,
    status: 'active',
    billingCycle,
    allocatedSeats: defaultSeats,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    updatedAt: now.toISOString(),
  };
}

/**
 * Upgrades subscription to a new tier or billing cycle.
 */
export function upgradeSubscription(
  subscription: OrganizationSubscription,
  newTier: SubscriptionTier,
  newCycle?: BillingCycle,
): OrganizationSubscription {
  const now = new Date();
  const cycle = newCycle ?? subscription.billingCycle;
  const periodEnd = new Date(now);
  if (cycle === 'annual') {
    periodEnd.setFullYear(now.getFullYear() + 1);
  } else {
    periodEnd.setMonth(now.getMonth() + 1);
  }

  // Adjust allocated seats if below new tier's minimum or above limits
  const minSeats = newTier === 'free' ? 2 : newTier === 'pro' ? 5 : newTier === 'business' ? 15 : 50;
  const allocatedSeats = Math.max(subscription.allocatedSeats, minSeats);

  return {
    ...subscription,
    tier: newTier,
    billingCycle: cycle,
    allocatedSeats,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    updatedAt: now.toISOString(),
  };
}

/**
 * Computes transparent invoice details with annual discount rates.
 */
export function calculateInvoice(
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  seats: number,
): InvoiceDetails {
  const tierDef = TIER_DEFINITIONS[tier];
  const unitPriceUsd =
    billingCycle === 'annual' ? tierDef.annualPriceUsdPerSeat : tierDef.monthlyPriceUsdPerSeat;

  const monthlyEquivalentUsd = unitPriceUsd * seats;
  const totalBilledUsd = billingCycle === 'annual' ? monthlyEquivalentUsd * 12 : monthlyEquivalentUsd;

  const regularMonthly = tierDef.monthlyPriceUsdPerSeat * seats;
  const regularAnnual = regularMonthly * 12;
  const discountPercent =
    billingCycle === 'annual' && regularAnnual > 0
      ? Math.round(((regularAnnual - totalBilledUsd) / regularAnnual) * 100)
      : 0;

  return {
    tier,
    billingCycle,
    seats,
    unitPriceUsd,
    monthlyEquivalentUsd,
    totalBilledUsd,
    discountPercent,
  };
}
