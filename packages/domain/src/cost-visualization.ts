/**
 * DiagramHQ - Cost Visualization (F128)
 *
 * Cloud cost estimation and architectural cost overlay engine:
 * - Attaches cloud cost data to infrastructure architecture model objects
 * - Provides per-service and per-category rollups (compute / db / storage / networking)
 * - Retains grounded CostEvidence with billing accounts, meter IDs, and timestamps
 *
 * Strict Acceptance Criteria:
 * - Attach cloud cost to infra objects; per-service rollup (compute/db/storage/networking)
 * - Test: mocked cost data rolls up per service.
 */

import type { ArchitectureId, ObjectId, VersionId } from './ids';
import type { ModelObject } from './types';

// ============================================================================
// Types
// ============================================================================

export type CostCategory =
  | 'compute'
  | 'database'
  | 'storage'
  | 'networking'
  | 'messaging'
  | 'other';

export const ALL_COST_CATEGORIES: readonly CostCategory[] = [
  'compute',
  'database',
  'storage',
  'networking',
  'messaging',
  'other',
] as const;

export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export interface ResourceCostBreakdown {
  baseCompute?: number;
  storage?: number;
  dataTransfer?: number;
  licenses?: number;
  other?: number;
}

export interface CostEvidence {
  sourceType: 'cloud_billing';
  provider: string;
  billingAccountId: string;
  meterId: string;
  currency: CurrencyCode;
  recordedAt: string;
}

export interface ResourceCost {
  objectId: ObjectId;
  name: string;
  category: CostCategory;
  monthlyCost: number;
  hourlyRate: number;
  currency: CurrencyCode;
  billingPeriod: string; // e.g. "2026-10"
  provider: string; // e.g. "aws", "azure", "gcp"
  breakdown?: ResourceCostBreakdown;
  evidence: CostEvidence;
}

export interface ServiceCostRollup {
  serviceName: string;
  objectId?: ObjectId;
  totalMonthly: number;
  totalHourly: number;
  currency: CurrencyCode;
  byCategory: Record<CostCategory, number>;
  itemCount: number;
  items: ResourceCost[];
}

export interface ArchitectureCostReport {
  architectureId: ArchitectureId;
  versionId: VersionId;
  currency: CurrencyCode;
  totalMonthlyCost: number;
  totalHourlyCost: number;
  byCategory: Record<CostCategory, number>;
  byService: ServiceCostRollup[];
  byProvider: Record<string, number>;
  generatedAt: string;
}

// ============================================================================
// Cost Attachment & Rollup Functions
// ============================================================================

/**
 * Attaches a cloud cost specification to a ModelObject's metadata without mutating the original.
 */
export function attachCostToObject(object: ModelObject, cost: ResourceCost): ModelObject {
  return {
    ...object,
    metadata: {
      ...(object.metadata || {}),
      cost: {
        monthlyCost: cost.monthlyCost,
        hourlyRate: cost.hourlyRate,
        currency: cost.currency,
        category: cost.category,
        billingPeriod: cost.billingPeriod,
        provider: cost.provider,
        breakdown: cost.breakdown || {},
        evidence: cost.evidence,
      },
    },
    updatedAt: new Date(),
  };
}

/**
 * Calculates per-service rollups from an array of resource costs.
 * Groups by service / object name and calculates subtotals across categories (compute, db, storage, networking).
 */
export function calculateServiceCostRollup(
  costs: ResourceCost[],
  currency: CurrencyCode = 'USD',
): ServiceCostRollup[] {
  const serviceMap = new Map<string, ServiceCostRollup>();

  for (const item of costs) {
    let rollup = serviceMap.get(item.name);
    if (!rollup) {
      rollup = {
        serviceName: item.name,
        objectId: item.objectId,
        totalMonthly: 0,
        totalHourly: 0,
        currency,
        byCategory: {
          compute: 0,
          database: 0,
          storage: 0,
          networking: 0,
          messaging: 0,
          other: 0,
        },
        itemCount: 0,
        items: [],
      };
      serviceMap.set(item.name, rollup);
    }

    rollup.totalMonthly += item.monthlyCost;
    rollup.totalHourly += item.hourlyRate;
    rollup.byCategory[item.category] = (rollup.byCategory[item.category] || 0) + item.monthlyCost;
    rollup.itemCount += 1;
    rollup.items.push(item);
  }

  // Round values to 2 decimal places
  return Array.from(serviceMap.values()).map((s) => ({
    ...s,
    totalMonthly: Math.round(s.totalMonthly * 100) / 100,
    totalHourly: Math.round(s.totalHourly * 1000) / 1000,
    byCategory: Object.fromEntries(
      Object.entries(s.byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ) as Record<CostCategory, number>,
  }));
}

/**
 * Generates an architecture-wide cost report from ModelObjects and/or ResourceCost items.
 */
export function calculateArchitectureCostReport(params: {
  architectureId: ArchitectureId;
  versionId: VersionId;
  objects: ModelObject[];
  costs?: ResourceCost[];
  currency?: CurrencyCode;
}): ArchitectureCostReport {
  const { architectureId, versionId, objects, currency = 'USD' } = params;

  // Extract costs from explicit parameter or from objects' metadata
  const allCosts: ResourceCost[] = [...(params.costs || [])];

  if (!params.costs) {
    for (const obj of objects) {
      const metaCost = obj.metadata?.['cost'] as ResourceCost | undefined;
      if (metaCost) {
        allCosts.push({
          ...metaCost,
          objectId: obj.id,
          name: obj.name,
        });
      }
    }
  }

  const byService = calculateServiceCostRollup(allCosts, currency);

  const byCategory: Record<CostCategory, number> = {
    compute: 0,
    database: 0,
    storage: 0,
    networking: 0,
    messaging: 0,
    other: 0,
  };

  const byProvider: Record<string, number> = {};
  let totalMonthlyCost = 0;
  let totalHourlyCost = 0;

  for (const c of allCosts) {
    totalMonthlyCost += c.monthlyCost;
    totalHourlyCost += c.hourlyRate;
    byCategory[c.category] = (byCategory[c.category] || 0) + c.monthlyCost;
    byProvider[c.provider] = (byProvider[c.provider] || 0) + c.monthlyCost;
  }

  return {
    architectureId,
    versionId,
    currency,
    totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    totalHourlyCost: Math.round(totalHourlyCost * 1000) / 1000,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ) as Record<CostCategory, number>,
    byService,
    byProvider: Object.fromEntries(
      Object.entries(byProvider).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Mock Dataset Generator for Acceptance Test & Interactive Use
// ============================================================================

export function createMockCostDataset(
  _architectureId: ArchitectureId,
  objects: ModelObject[],
): ResourceCost[] {
  const now = new Date().toISOString();
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Default cost patterns based on object kind and name
  return objects.map((obj, idx) => {
    let category: CostCategory = 'compute';
    let monthlyCost = 145.0;
    let hourlyRate = 0.2;
    let provider = 'aws';

    const normName = obj.name.toLowerCase();

    if (normName.includes('s3') || normName.includes('bucket') || normName.includes('storage') || normName.includes('blob')) {
      category = 'storage';
      monthlyCost = 65.0 + idx * 10.0;
      hourlyRate = monthlyCost / 730;
      provider = 'aws';
    } else if (
      obj.kind === 'store' ||
      normName.includes('db') ||
      normName.includes('sql') ||
      normName.includes('postgres') ||
      normName.includes('mongo')
    ) {
      category = 'database';
      monthlyCost = 380.0 + idx * 25.0;
      hourlyRate = monthlyCost / 730;
      provider = 'aws';
    } else if (
      obj.kind === 'group' ||
      normName.includes('vpc') ||
      normName.includes('gateway') ||
      normName.includes('ingress') ||
      normName.includes('alb')
    ) {
      category = 'networking';
      monthlyCost = 42.0 + idx * 5.0;
      hourlyRate = monthlyCost / 730;
      provider = 'aws';
    } else if (normName.includes('queue') || normName.includes('sqs') || normName.includes('kafka')) {
      category = 'messaging';
      monthlyCost = 28.0;
      hourlyRate = monthlyCost / 730;
      provider = 'aws';
    } else {
      category = 'compute';
      monthlyCost = 120.0 + idx * 30.0;
      hourlyRate = monthlyCost / 730;
      provider = 'aws';
    }

    return {
      objectId: obj.id,
      name: obj.name,
      category,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 1000) / 1000,
      currency: 'USD',
      billingPeriod: currentPeriod,
      provider,
      breakdown: {
        baseCompute: Math.round(monthlyCost * 0.7 * 100) / 100,
        storage: Math.round(monthlyCost * 0.15 * 100) / 100,
        dataTransfer: Math.round(monthlyCost * 0.15 * 100) / 100,
      },
      evidence: {
        sourceType: 'cloud_billing',
        provider,
        billingAccountId: 'ba-9941-diagramhq-prod',
        meterId: `meter-${category}-${obj.id}`,
        currency: 'USD',
        recordedAt: now,
      },
    };
  });
}
