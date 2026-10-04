import React, { useState } from 'react';
import {
  calculateInvoice,
  checkFeatureAccess,
  checkUsageLimit,
  createDefaultSubscription,
  enforceTierGating,
  enforceUsageLimit,
  TIER_DEFINITIONS,
  TierGatingError,
  upgradeSubscription,
  UsageLimitExceededError,
  type BillingCycle,
  type GatedFeature,
  type OrganizationSubscription,
  type OrganizationUsage,
  type OrgId,
  type SubscriptionTier,
  type UsageMetric,
} from '@diagramhq/domain';

export interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  initialSubscription?: OrganizationSubscription;
  initialUsage?: OrganizationUsage;
}

export function BillingModal({
  isOpen,
  onClose,
  orgId = 'org_fintech_billing',
  initialSubscription,
  initialUsage,
}: BillingModalProps): JSX.Element | null {
  const [subscription, setSubscription] = useState<OrganizationSubscription>(() => {
    return initialSubscription ?? createDefaultSubscription(orgId as OrgId, 'free', 'monthly');
  });

  const [usage, setUsage] = useState<OrganizationUsage>(() => {
    return (
      initialUsage ?? {
        seats: 2,
        objects: 45,
        views: 3,
        monthlyAiCredits: 40,
        auditLogRetentionDays: 7,
      }
    );
  });

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle);
  const [activeTab, setActiveTab] = useState<'plans' | 'usage' | 'features'>('plans');
  const [blockedAlert, setBlockedAlert] = useState<{
    type: 'tier_gate' | 'usage_limit';
    message: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTierDef = TIER_DEFINITIONS[subscription.tier];

  const handleUpgrade = (tier: SubscriptionTier) => {
    const updated = upgradeSubscription(subscription, tier, billingCycle);
    setSubscription(updated);
    setBlockedAlert(null);
    setSuccessToast(`Plan successfully updated to ${TIER_DEFINITIONS[tier].name}!`);
  };

  const handleTestTierGatedAction = (feature: GatedFeature) => {
    try {
      enforceTierGating(subscription.tier, feature);
      setBlockedAlert(null);
      setSuccessToast(`Access granted! '${feature}' is unlocked on your current plan.`);
    } catch (err) {
      if (err instanceof TierGatingError) {
        setSuccessToast(null);
        setBlockedAlert({
          type: 'tier_gate',
          message: err.message,
        });
      }
    }
  };

  const handleTestQuotaAction = (metric: UsageMetric, delta: number) => {
    try {
      const currentVal =
        metric === 'seats'
          ? usage.seats
          : metric === 'objects'
          ? usage.objects
          : metric === 'views'
          ? usage.views
          : usage.monthlyAiCredits;

      enforceUsageLimit(subscription.tier, metric, currentVal, delta);

      // If allowed, update usage
      setUsage((prev) => ({
        ...prev,
        [metric]: (prev[metric as keyof OrganizationUsage] as number) + delta,
      }));
      setBlockedAlert(null);
      setSuccessToast(`Action permitted: +${delta} to ${metric}.`);
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        setSuccessToast(null);
        setBlockedAlert({
          type: 'usage_limit',
          message: err.message,
        });
      }
    }
  };

  const tiers: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];

  const gatedFeaturesList: Array<{ id: GatedFeature; label: string; minTier: SubscriptionTier }> = [
    { id: 'ai_copilot', label: 'AI Architecture Copilot', minTier: 'pro' },
    { id: 'team_collaboration', label: 'Real-time Multi-user Collaboration', minTier: 'pro' },
    { id: 'github_gitlab_sync', label: 'GitLab & GitHub Bi-directional Sync', minTier: 'pro' },
    { id: 'pdf_svg_clean_export', label: 'Watermark-free Vector PDF & SVG Export', minTier: 'pro' },
    { id: 'sso_saml', label: 'Enterprise SSO & SAML 2.0 Identity', minTier: 'business' },
    { id: 'scim_provisioning', label: 'Automated SCIM 2.0 User Provisioning', minTier: 'business' },
    { id: 'org_policies', label: 'Central Organization Governance Policies', minTier: 'business' },
    { id: 'advanced_rbac', label: 'Advanced RBAC & Granular Permissions', minTier: 'business' },
    { id: 'compliance_packs', label: 'SOC2 / ISO 27001 / PCI Compliance Packs', minTier: 'enterprise' },
    { id: 'private_vpc_deployment', label: 'Customer VPC & Air-Gapped Deployment', minTier: 'enterprise' },
    { id: 'custom_audit_retention', label: '1-Year+ Immutable Audit Log Retention', minTier: 'enterprise' },
    { id: 'dedicated_sla_support', label: '24/7 Dedicated Support & 99.99% SLA', minTier: 'enterprise' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="billing-modal-title" className="text-xl font-bold text-white">
                  Billing, Plans &amp; Usage Quotas
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded">
                  F132 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage organization subscription tiers, feature gating, and consumption quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Current Plan Badge */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Active Plan
              </span>
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
                {`${currentTierDef.name} Tier`}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Cycle Toggle */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'plans'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Subscription Plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('usage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'usage'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Usage &amp; Quotas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'features'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Feature Gating Matrix
            </button>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition-colors ${
                billingCycle === 'annual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                Save ~17%
              </span>
            </button>
          </div>
        </div>

        {/* Notifications & Blocked Alerts */}
        {blockedAlert && (
          <div
            role="alert"
            className="px-6 py-2.5 bg-rose-950/60 border-b border-rose-500/50 flex items-center justify-between text-rose-200 text-xs"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>
                  {blockedAlert.type === 'tier_gate' ? 'Tier Gating Enforced: ' : 'Usage Limit Exceeded: '}
                </strong>
                {blockedAlert.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBlockedAlert(null)}
              className="text-rose-400 hover:text-white ml-2 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {successToast && (
          <div className="px-6 py-2.5 bg-emerald-950/60 border-b border-emerald-500/50 flex items-center justify-between text-emerald-200 text-xs">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-emerald-400 hover:text-white ml-2 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PLANS COMPARISON */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tiers.map((tierKey) => {
                  const def = TIER_DEFINITIONS[tierKey];
                  const isCurrent = subscription.tier === tierKey;
                  const invoice = calculateInvoice(tierKey, billingCycle, 1);

                  return (
                    <div
                      key={tierKey}
                      className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-slate-800/80 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/30 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base text-white">{def.name}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                              CURRENT
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 min-h-[36px]">{def.tagline}</p>

                        <div className="pt-2 border-t border-slate-700/60">
                          <div className="flex items-baseline space-x-1">
                            <span className="text-2xl font-bold font-mono text-white">
                              {`$${invoice.unitPriceUsd}`}
                            </span>
                            <span className="text-xs text-slate-400">/ seat / mo</span>
                          </div>
                          {billingCycle === 'annual' && invoice.discountPercent > 0 && (
                            <span className="text-[10px] text-emerald-400 font-mono block">
                              {`Billed annually ($${invoice.totalBilledUsd}/seat/yr)`}
                            </span>
                          )}
                        </div>

                        {/* Tier Highlights */}
                        <div className="space-y-1.5 pt-3 text-xs">
                          <div className="flex items-center space-x-2 text-slate-300">
                            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {def.limits.maxSeats === Infinity ? 'Unlimited Seats' : `${def.limits.maxSeats} Seats Max`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300">
                            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {def.limits.maxObjects === Infinity ? 'Unlimited Objects' : `${def.limits.maxObjects} Model Objects`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300">
                            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {def.limits.monthlyAiCredits === Infinity ? 'Unlimited AI Queries' : `${def.limits.monthlyAiCredits} AI Queries/mo`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300">
                            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {`${def.limits.auditLogRetentionDays}-Day Audit Logs`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-700/60">
                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold cursor-default"
                          >
                            Active Plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgrade(tierKey)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            {tierKey === 'free' ? 'Downgrade to Free' : `Upgrade to ${def.name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simulation Sandbox for Invariant Verification */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Interactive Enforcement Simulator
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono rounded">
                    Test Invariants
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Trigger actions to verify that tier gating and quota enforcement block over-limit actions in real time:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestTierGatedAction('compliance_packs')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-200 transition-colors"
                  >
                    Test Access: Compliance Packs (Enterprise)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestTierGatedAction('sso_saml')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-200 transition-colors"
                  >
                    Test Access: SSO / SAML (Business)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestQuotaAction('seats', 1)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-200 transition-colors"
                  >
                    Test Quota: +1 Team Seat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestQuotaAction('objects', 10)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-200 transition-colors"
                  >
                    Test Quota: +10 Architecture Objects
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE USAGE METERS */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Seats Meter */}
                {(() => {
                  const check = checkUsageLimit(subscription.tier, 'seats', usage.seats, 0);
                  const isExceeded = !check.allowed || check.percentageUsed >= 100;
                  return (
                    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-300">Team Seats</span>
                        <span className="font-mono text-slate-400">
                          {`${check.currentUsage} / ${check.limit === Infinity ? '∞' : check.limit} (${check.percentageUsed}%)`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isExceeded ? 'bg-rose-500' : check.percentageUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, check.percentageUsed)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {check.limit === Infinity ? 'Unlimited seats' : `${check.remaining} seats remaining`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestQuotaAction('seats', 1)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-white"
                        >
                          +1 Seat
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Objects Meter */}
                {(() => {
                  const check = checkUsageLimit(subscription.tier, 'objects', usage.objects, 0);
                  const isExceeded = !check.allowed || check.percentageUsed >= 100;
                  return (
                    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-300">Architecture Objects</span>
                        <span className="font-mono text-slate-400">
                          {`${check.currentUsage} / ${check.limit === Infinity ? '∞' : check.limit} (${check.percentageUsed}%)`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isExceeded ? 'bg-rose-500' : check.percentageUsed > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, check.percentageUsed)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {check.limit === Infinity ? 'Unlimited objects' : `${check.remaining} objects remaining`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestQuotaAction('objects', 10)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-white"
                        >
                          +10 Objects
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. AI Queries Meter */}
                {(() => {
                  const check = checkUsageLimit(subscription.tier, 'monthlyAiCredits', usage.monthlyAiCredits, 0);
                  const isExceeded = !check.allowed || check.percentageUsed >= 100;
                  return (
                    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-300">Monthly AI Queries</span>
                        <span className="font-mono text-slate-400">
                          {`${check.currentUsage} / ${check.limit === Infinity ? '∞' : check.limit} (${check.percentageUsed}%)`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isExceeded ? 'bg-rose-500' : check.percentageUsed > 80 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min(100, check.percentageUsed)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {check.limit === Infinity ? 'Unlimited AI' : `${check.remaining} queries remaining`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestQuotaAction('monthlyAiCredits', 25)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-white"
                        >
                          +25 Queries
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Audit Log Retention */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Audit Log Retention Window</span>
                    <span className="font-mono text-slate-400">
                      {`${currentTierDef.limits.auditLogRetentionDays} Days`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Immutable cryptographically chained ledger is guaranteed available for audit queries.
                  </p>
                  <div className="pt-2 text-[11px] text-indigo-400 font-mono">
                    {subscription.tier === 'enterprise'
                      ? 'Custom extended retention active'
                      : 'Upgrade to Enterprise for 365+ day retention'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEATURE GATING MATRIX */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Capability</th>
                      <th className="p-3 font-semibold text-center">Required Tier</th>
                      <th className="p-3 font-semibold text-center">Current Status</th>
                      <th className="p-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {gatedFeaturesList.map((f) => {
                      const access = checkFeatureAccess(subscription.tier, f.id);
                      return (
                        <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-medium text-white">{f.label}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-slate-300">
                              {f.minTier}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {access.allowed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                                Unlocked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950 border border-rose-500/40 text-rose-300">
                                Locked
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {access.allowed ? (
                              <button
                                type="button"
                                onClick={() => handleTestTierGatedAction(f.id)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs transition-colors"
                              >
                                Test Run
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpgrade(f.minTier)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs transition-colors"
                              >
                                Upgrade
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {`Subscription ID: ${subscription.id} • Cycle: ${subscription.billingCycle}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
