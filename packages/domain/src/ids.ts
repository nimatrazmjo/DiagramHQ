/**
 * Stable, opaque, type-prefixed identifiers for model entities.
 * Prefixes keep IDs self-describing in logs, URLs, and API payloads
 * (see .harness/rules/conventions.md). The brand stops an ObjectId from
 * being used where a ConnectionId is expected, without any runtime cost.
 */
export type IdPrefix = 'sys' | 'app' | 'sto' | 'cmp' | 'act' | 'grp' | 'con';

export type Id<P extends IdPrefix> = string & { readonly __brand: P };

export type ObjectId = Id<'sys' | 'app' | 'sto' | 'cmp' | 'act' | 'grp'>;
export type ConnectionId = Id<'con'>;

let sequence = 0;

/** Generates a monotonic, prefixed id. Monotonicity keeps logs and tests stable. */
export function createId<P extends IdPrefix>(prefix: P): Id<P> {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}` as Id<P>;
}
