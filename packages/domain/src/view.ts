import type { ViewKind } from './types';

export interface CreateViewOptions {
  name: string;
  kind: ViewKind;
  filter?: Record<string, unknown>;
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
    default: return 'Custom View';
  }
}
