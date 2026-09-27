import type { ViewKind } from './types';

export interface CreateViewOptions {
  name: string;
  kind: ViewKind;
  filter?: Record<string, unknown>;
  isStarred?: boolean;
}

/**
 * Context diagram view (Level 1) — F032.
 * Shows persons, systems, and their relationships.
 */
export function createContextViewOptions(name: string, filter?: Record<string, unknown>): CreateViewOptions {
  return { name, kind: 'context', filter };
}

/**
 * Container diagram view (Level 2) — F033.
 * Shows applications/containers inside a system.
 */
export function createContainerViewOptions(name: string, filter?: Record<string, unknown>): CreateViewOptions {
  return { name, kind: 'container', filter };
}

/**
 * Component diagram view (Level 3) — F034.
 * Shows components inside an application/container.
 */
export function createComponentViewOptions(name: string, filter?: Record<string, unknown>): CreateViewOptions {
  return { name, kind: 'component', filter };
}

/**
 * Checks if a view is a Context diagram (L1).
 */
export function isContextView(view: { kind: string }): boolean {
  return view.kind === 'context';
}

/**
 * Checks if a view is a Container diagram (L2).
 */
export function isContainerView(view: { kind: string }): boolean {
  return view.kind === 'container';
}

/**
 * Checks if a view is a Component diagram (L3).
 */
export function isComponentView(view: { kind: string }): boolean {
  return view.kind === 'component';
}

/**
 * Dynamic filtered view (F035).
 * Live projection computed from model filters.
 */
export function createDynamicViewOptions(
  name: string,
  filter: Record<string, unknown>,
  kind: ViewKind = 'custom',
): CreateViewOptions {
  return { name, kind, filter };
}

/**
 * Checks if a view is a dynamic view (has active filter criteria).
 */
export function isDynamicView(view: { filter?: unknown }): boolean {
  if (!view.filter || typeof view.filter !== 'object') return false;
  return Object.keys(view.filter as object).length > 0;
}

/**
 * Returns the display level label for a view kind.
 */
export function getViewLevelLabel(kind: ViewKind | string): string {
  switch (kind) {
    case 'context': return 'Level 1 — Context';
    case 'container': return 'Level 2 — Container';
    case 'component': return 'Level 3 — Component';
    case 'security': return 'Security View';
    case 'data': return 'Data View';
    case 'ownership': return 'Ownership View';
    case 'technology': return 'Technology View';
    case 'persona': return 'Persona View';
    default: return 'Custom View';
  }
}
