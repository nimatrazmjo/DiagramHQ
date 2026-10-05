import React from 'react';

/**
 * F136 — Honest Surface: Gate Simulated Features
 *
 * Central registry and affordances for features in the studio that are currently
 * simulated (seeded fixtures or deterministic domain functions) rather than
 * connected to live backend models/APIs.
 */

export const PREVIEW_BADGE_TEXT = 'Preview — not saved';

export type SimulatedFeatureKey =
  | 'branches'
  | 'presence'
  | 'versionHistory'
  | 'visualDiff'
  | 'pullRequests'
  | 'comments'
  | 'aiCopilot'
  | 'aiGeneration'
  | 'aiReview'
  | 'aiAdr';

export interface PreviewFeatureConfig {
  id: SimulatedFeatureKey;
  label: string;
  badgeText: string;
  tooltip: string;
  isSimulated: boolean;
  simulatedDataSource: string;
  description: string;
}

export const PREVIEW_REGISTRY: Record<SimulatedFeatureKey, PreviewFeatureConfig> = {
  branches: {
    id: 'branches',
    label: 'Branch Management',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated architecture branches',
    isSimulated: true,
    simulatedDataSource: 'INITIAL_BRANCHES (in-memory fixture)',
    description: 'Architecture branch management is simulated in-memory and not yet wired to live backend storage.',
  },
  presence: {
    id: 'presence',
    label: 'Live Presence',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated collaborator cursors and presence',
    isSimulated: true,
    simulatedDataSource: 'INITIAL_PEERS (in-memory fixture)',
    description: 'Peer presence avatars and cursors are simulated and do not reflect real-time network connections.',
  },
  versionHistory: {
    id: 'versionHistory',
    label: 'Version History & Snapshots',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated release snapshots and version timeline',
    isSimulated: true,
    simulatedDataSource: 'INITIAL_SNAPSHOTS (in-memory fixture)',
    description: 'Architecture snapshots and version history are simulated with in-memory fixtures.',
  },
  visualDiff: {
    id: 'visualDiff',
    label: 'Visual Architecture Diff',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated visual diff calculations',
    isSimulated: true,
    simulatedDataSource: 'computeVisualArchitectureDiff (in-memory demo branch)',
    description: 'Visual diff is calculated against a seeded in-memory demo branch.',
  },
  pullRequests: {
    id: 'pullRequests',
    label: 'Architecture Pull Requests',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated pull request review workflow',
    isSimulated: true,
    simulatedDataSource: 'architecturePR (seeded PR fixture)',
    description: 'Architecture pull requests and review status are simulated with local fixtures.',
  },
  comments: {
    id: 'comments',
    label: 'Threaded Comments',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: simulated threaded comments',
    isSimulated: true,
    simulatedDataSource: 'INITIAL_COMMENTS (local React state)',
    description: 'Comments are held in local state and do not persist to server storage.',
  },
  aiCopilot: {
    id: 'aiCopilot',
    label: 'AI Architecture Copilot',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: deterministic domain heuristics (not a live model)',
    isSimulated: true,
    simulatedDataSource: 'Deterministic domain heuristics (not live model calls)',
    description: 'AI Copilot answers are generated via deterministic domain heuristics rather than live AI model calls.',
  },
  aiGeneration: {
    id: 'aiGeneration',
    label: 'AI Architecture Generation',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: deterministic template proposal',
    isSimulated: true,
    simulatedDataSource: 'generateArchitectureFromPrompt (deterministic template)',
    description: 'Architecture generation produces deterministic template proposals.',
  },
  aiReview: {
    id: 'aiReview',
    label: 'AI Architecture Review',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: static rule evaluation (not a live model)',
    isSimulated: true,
    simulatedDataSource: 'runArchitectureReview (static rule evaluation)',
    description: 'AI Architecture Review runs static heuristic rules rather than calling an AI model.',
  },
  aiAdr: {
    id: 'aiAdr',
    label: 'AI ADR Generation',
    badgeText: PREVIEW_BADGE_TEXT,
    tooltip: 'Preview — not saved: deterministic template drafting',
    isSimulated: true,
    simulatedDataSource: 'draftADRFromChange (static template drafting)',
    description: 'ADR generation formats change sets using deterministic markdown templates.',
  },
};

export const SIMULATED_FEATURE_KEYS: readonly SimulatedFeatureKey[] = Object.keys(
  PREVIEW_REGISTRY,
) as SimulatedFeatureKey[];

/**
 * Real studio controls that must remain untouched and unaffected by preview gating.
 */
export const REAL_STUDIO_CONTROLS = [
  'add',
  'connect',
  'inspector',
  'autosave',
  'export',
  'layout',
  'undo',
  'share-link',
] as const;

export function isPreviewFeature(key: string): key is SimulatedFeatureKey {
  return key in PREVIEW_REGISTRY;
}

export function getPreviewConfig(key: SimulatedFeatureKey): PreviewFeatureConfig {
  return PREVIEW_REGISTRY[key];
}

export function getAllPreviewFeatures(): PreviewFeatureConfig[] {
  return Object.values(PREVIEW_REGISTRY);
}

export function isRealControl(key: string): boolean {
  return (REAL_STUDIO_CONTROLS as readonly string[]).includes(key);
}

export interface PreviewBadgeProps {
  feature?: SimulatedFeatureKey;
  className?: string;
  text?: string;
}

export function PreviewBadge(props: PreviewBadgeProps): React.ReactElement {
  const config = props.feature ? PREVIEW_REGISTRY[props.feature] : undefined;
  const tooltip = config?.tooltip ?? props.text ?? PREVIEW_BADGE_TEXT;
  return React.createElement(
    'span',
    {
      'data-testid': 'preview-badge',
      'data-feature': props.feature,
      title: tooltip,
      className: `inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 select-none whitespace-nowrap shadow-sm ${props.className || ''}`,
    },
    props.text ?? PREVIEW_BADGE_TEXT,
  );
}

export interface PreviewAffordanceProps {
  feature: SimulatedFeatureKey;
  children?: React.ReactNode;
  className?: string;
}

export function PreviewAffordance(props: PreviewAffordanceProps): React.ReactElement {
  const config = PREVIEW_REGISTRY[props.feature];
  return React.createElement(
    'div',
    {
      'data-preview': 'true',
      'data-preview-feature': props.feature,
      title: config?.tooltip ?? PREVIEW_BADGE_TEXT,
      className: `relative inline-flex items-center gap-1.5 shrink-0 ${props.className || ''}`,
    },
    props.children,
    React.createElement(PreviewBadge, { feature: props.feature }),
  );
}
