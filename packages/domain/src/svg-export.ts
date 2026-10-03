import type {
  ArchitectureModel,
  View,
  ViewObject,
  ObjectKind,
} from './types';
import { sanitizeFilename, computeContentChecksum } from './export';

// ============================================================================
// Types & Options
// ============================================================================

export type SvgTheme = 'dark' | 'light' | 'transparent';
export type SvgEdgeRouting = 'curved' | 'orthogonal' | 'straight';

export interface SvgExportOptions {
  theme?: SvgTheme;
  edgeRouting?: SvgEdgeRouting;
  includeGrid?: boolean;
  includeBadges?: boolean;
  includeMetadata?: boolean;
  includeLegend?: boolean;
  includeTooltips?: boolean;
  customTitle?: string;
  scale?: number;
  padding?: number;
  viewObjects?: ViewObject[];
}

export interface SvgExportResult {
  content: string;
  dataUri: string;
  filename: string;
  dimensions: {
    width: number;
    height: number;
    viewBox: string;
  };
  nodeCount: number;
  edgeCount: number;
  boundaryCount: number;
  checksum: string;
}

// ============================================================================
// Palette Themes
// ============================================================================

export interface SvgThemePalette {
  name: SvgTheme;
  bg: string;
  gridDot: string;
  border: string;
  headerText: string;
  subText: string;
  edgeDefault: string;
  edgeAsync: string;
  edgeText: string;
  edgeLabelBg: string;
  edgeLabelBorder: string;
  kinds: Record<
    ObjectKind,
    {
      bg: string;
      border: string;
      accent: string;
      headerBg: string;
      badgeBg: string;
      badgeText: string;
      titleColor: string;
      descColor: string;
      techBg: string;
      techText: string;
    }
  >;
}

export const SVG_THEME_PALETTES: Record<SvgTheme, SvgThemePalette> = {
  dark: {
    name: 'dark',
    bg: '#090d16',
    gridDot: '#1e293b',
    border: '#1e293b',
    headerText: '#f8fafc',
    subText: '#94a3b8',
    edgeDefault: '#64748b',
    edgeAsync: '#38bdf8',
    edgeText: '#cbd5e1',
    edgeLabelBg: '#0f172a',
    edgeLabelBorder: '#334155',
    kinds: {
      system: {
        bg: '#0f1d38',
        border: '#2563eb',
        accent: '#3b82f6',
        headerBg: '#1e3a8a',
        badgeBg: '#1d4ed8',
        badgeText: '#dbeafe',
        titleColor: '#ffffff',
        descColor: '#93c5fd',
        techBg: '#1e293b',
        techText: '#60a5fa',
      },
      application: {
        bg: '#06281e',
        border: '#059669',
        accent: '#10b981',
        headerBg: '#064e3b',
        badgeBg: '#047857',
        badgeText: '#d1fae5',
        titleColor: '#ffffff',
        descColor: '#a7f3d0',
        techBg: '#132e27',
        techText: '#34d399',
      },
      store: {
        bg: '#2b1b08',
        border: '#d97706',
        accent: '#f59e0b',
        headerBg: '#78350f',
        badgeBg: '#b45309',
        badgeText: '#fef3c7',
        titleColor: '#ffffff',
        descColor: '#fde68a',
        techBg: '#362208',
        techText: '#fbbf24',
      },
      component: {
        bg: '#1e1438',
        border: '#7c3aed',
        accent: '#8b5cf6',
        headerBg: '#4c1d95',
        badgeBg: '#6d28d9',
        badgeText: '#ede9fe',
        titleColor: '#ffffff',
        descColor: '#ddd6fe',
        techBg: '#2a1a4a',
        techText: '#a78bfa',
      },
      actor: {
        bg: '#280c1d',
        border: '#db2777',
        accent: '#ec4899',
        headerBg: '#831843',
        badgeBg: '#be185d',
        badgeText: '#fce7f3',
        titleColor: '#ffffff',
        descColor: '#fbcfe8',
        techBg: '#38142a',
        techText: '#f472b6',
      },
      group: {
        bg: 'rgba(30, 41, 59, 0.4)',
        border: '#475569',
        accent: '#64748b',
        headerBg: '#334155',
        badgeBg: '#475569',
        badgeText: '#f1f5f9',
        titleColor: '#f8fafc',
        descColor: '#94a3b8',
        techBg: '#1e293b',
        techText: '#94a3b8',
      },
    },
  },
  light: {
    name: 'light',
    bg: '#f8fafc',
    gridDot: '#cbd5e1',
    border: '#e2e8f0',
    headerText: '#0f172a',
    subText: '#64748b',
    edgeDefault: '#475569',
    edgeAsync: '#0284c7',
    edgeText: '#1e293b',
    edgeLabelBg: '#ffffff',
    edgeLabelBorder: '#cbd5e1',
    kinds: {
      system: {
        bg: '#eff6ff',
        border: '#3b82f6',
        accent: '#2563eb',
        headerBg: '#dbeafe',
        badgeBg: '#2563eb',
        badgeText: '#ffffff',
        titleColor: '#1e3a8a',
        descColor: '#3b82f6',
        techBg: '#dbeafe',
        techText: '#1d4ed8',
      },
      application: {
        bg: '#ecfdf5',
        border: '#10b981',
        accent: '#059669',
        headerBg: '#d1fae5',
        badgeBg: '#059669',
        badgeText: '#ffffff',
        titleColor: '#064e3b',
        descColor: '#059669',
        techBg: '#d1fae5',
        techText: '#047857',
      },
      store: {
        bg: '#fffbeb',
        border: '#f59e0b',
        accent: '#d97706',
        headerBg: '#fef3c7',
        badgeBg: '#d97706',
        badgeText: '#ffffff',
        titleColor: '#78350f',
        descColor: '#b45309',
        techBg: '#fef3c7',
        techText: '#b45309',
      },
      component: {
        bg: '#f5f3ff',
        border: '#8b5cf6',
        accent: '#7c3aed',
        headerBg: '#ede9fe',
        badgeBg: '#7c3aed',
        badgeText: '#ffffff',
        titleColor: '#4c1d95',
        descColor: '#6d28d9',
        techBg: '#ede9fe',
        techText: '#5b21b6',
      },
      actor: {
        bg: '#fdf2f8',
        border: '#ec4899',
        accent: '#db2777',
        headerBg: '#fce7f3',
        badgeBg: '#db2777',
        badgeText: '#ffffff',
        titleColor: '#831843',
        descColor: '#be185d',
        techBg: '#fce7f3',
        techText: '#9d174d',
      },
      group: {
        bg: 'rgba(241, 245, 249, 0.7)',
        border: '#94a3b8',
        accent: '#64748b',
        headerBg: '#e2e8f0',
        badgeBg: '#64748b',
        badgeText: '#ffffff',
        titleColor: '#334155',
        descColor: '#64748b',
        techBg: '#e2e8f0',
        techText: '#475569',
      },
    },
  },
  transparent: {
    name: 'transparent',
    bg: 'none',
    gridDot: 'transparent',
    border: '#334155',
    headerText: '#f8fafc',
    subText: '#94a3b8',
    edgeDefault: '#64748b',
    edgeAsync: '#38bdf8',
    edgeText: '#cbd5e1',
    edgeLabelBg: '#0f172a',
    edgeLabelBorder: '#334155',
    kinds: {
      system: {
        bg: 'rgba(15, 29, 56, 0.85)',
        border: '#2563eb',
        accent: '#3b82f6',
        headerBg: '#1e3a8a',
        badgeBg: '#1d4ed8',
        badgeText: '#dbeafe',
        titleColor: '#ffffff',
        descColor: '#93c5fd',
        techBg: '#1e293b',
        techText: '#60a5fa',
      },
      application: {
        bg: 'rgba(6, 40, 30, 0.85)',
        border: '#059669',
        accent: '#10b981',
        headerBg: '#064e3b',
        badgeBg: '#047857',
        badgeText: '#d1fae5',
        titleColor: '#ffffff',
        descColor: '#a7f3d0',
        techBg: '#132e27',
        techText: '#34d399',
      },
      store: {
        bg: 'rgba(43, 27, 8, 0.85)',
        border: '#d97706',
        accent: '#f59e0b',
        headerBg: '#78350f',
        badgeBg: '#b45309',
        badgeText: '#fef3c7',
        titleColor: '#ffffff',
        descColor: '#fde68a',
        techBg: '#362208',
        techText: '#fbbf24',
      },
      component: {
        bg: 'rgba(30, 20, 56, 0.85)',
        border: '#7c3aed',
        accent: '#8b5cf6',
        headerBg: '#4c1d95',
        badgeBg: '#6d28d9',
        badgeText: '#ede9fe',
        titleColor: '#ffffff',
        descColor: '#ddd6fe',
        techBg: '#2a1a4a',
        techText: '#a78bfa',
      },
      actor: {
        bg: 'rgba(40, 12, 29, 0.85)',
        border: '#db2777',
        accent: '#ec4899',
        headerBg: '#831843',
        badgeBg: '#be185d',
        badgeText: '#fce7f3',
        titleColor: '#ffffff',
        descColor: '#fbcfe8',
        techBg: '#38142a',
        techText: '#f472b6',
      },
      group: {
        bg: 'rgba(30, 41, 59, 0.3)',
        border: '#475569',
        accent: '#64748b',
        headerBg: '#334155',
        badgeBg: '#475569',
        badgeText: '#f1f5f9',
        titleColor: '#f8fafc',
        descColor: '#94a3b8',
        techBg: '#1e293b',
        techText: '#94a3b8',
      },
    },
  },
};

// ============================================================================
// XML / SVG Utilities
// ============================================================================

export function escapeSvgText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns inline SVG path data for architectural node icons.
 */
export function getNodeKindIconPath(kind: ObjectKind): string {
  switch (kind) {
    case 'actor':
      // Person / User silhouette
      return 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';
    case 'store':
      // Database cylinder
      return 'M12 3c-4.42 0-8 1.34-8 3v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6c0-1.66-3.58-3-8-3zm0 2c3.5 0 6 1.05 6 1.5s-2.5 1.5-6 1.5-6-1.05-6-1.5 2.5-1.5 6-1.5zm0 14c-3.5 0-6-1.05-6-1.5v-2.12c1.47.73 3.61 1.12 6 1.12s4.53-.39 6-1.12v2.12c0 .45-2.5 1.5-6 1.5zm0-4.5c-3.5 0-6-1.05-6-1.5v-2.12c1.47.73 3.61 1.12 6 1.12s4.53-.39 6-1.12v2.12c0 .45-2.5 1.5-6 1.5z';
    case 'application':
      // Browser window / container
      return 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 2h2v2h-2V6zm-4 0h2v2H7V6zm-4 0h2v2H3V6zm17 12H4V10h16v8z';
    case 'component':
      // Modular component / puzzle
      return 'M19 13h-2v-2h2c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v2h-2V6c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h2v2H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2h2v2c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1z';
    case 'system':
    default:
      // Cloud server / system
      return 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z';
  }
}

/**
 * Calculates connection paths between node bounding centers with chosen routing style.
 */
export function calculateSvgEdgePath(
  src: { x: number; y: number; w: number; h: number },
  tgt: { x: number; y: number; w: number; h: number },
  routing: SvgEdgeRouting = 'curved',
): { pathD: string; midX: number; midY: number } {
  const x1 = src.x + src.w / 2;
  const y1 = src.y + src.h / 2;
  const x2 = tgt.x + tgt.w / 2;
  const y2 = tgt.y + tgt.h / 2;

  const dx = x2 - x1;

  if (routing === 'straight') {
    return {
      pathD: `M ${x1} ${y1} L ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
    };
  }

  if (routing === 'orthogonal') {
    const midX = x1 + dx / 2;
    return {
      pathD: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
      midX,
      midY: (y1 + y2) / 2,
    };
  }

  // Curved Bezier (Default matching IcePanel Edge)
  const curvature = Math.min(120, Math.max(40, Math.abs(dx) * 0.45));
  const cx1 = x1 + (dx >= 0 ? curvature : -curvature);
  const cy1 = y1;
  const cx2 = x2 - (dx >= 0 ? curvature : -curvature);
  const cy2 = y2;

  return {
    pathD: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
    midX: (x1 + x2) / 2,
    midY: (y1 + y2) / 2,
  };
}

// ============================================================================
// High-Fidelity SVG Renderer
// ============================================================================

/**
 * Renders an architecture view into a high-fidelity SVG graphic matching interactive canvas styling.
 */
export function renderViewToFidelitySvg(
  view: View,
  model: ArchitectureModel,
  options?: SvgExportOptions,
): SvgExportResult {
  const themeName: SvgTheme = options?.theme ?? 'dark';
  const theme = SVG_THEME_PALETTES[themeName] ?? SVG_THEME_PALETTES.dark;
  const edgeRouting = options?.edgeRouting ?? 'curved';
  const includeGrid = options?.includeGrid ?? true;
  const includeBadges = options?.includeBadges ?? true;
  const includeMetadata = options?.includeMetadata ?? true;
  const includeLegend = options?.includeLegend ?? true;
  const includeTooltips = options?.includeTooltips ?? true;
  const scale = options?.scale ?? 1;
  const padding = options?.padding ?? 50;
  const title = options?.customTitle || view.name;

  // 1. Filter elements matching view scope
  const explicitObjectIds =
    options?.viewObjects && options.viewObjects.length > 0
      ? new Set(options.viewObjects.map((vo) => vo.objectId))
      : null;

  const relevantObjects = model.objects.filter((obj) => {
    if (explicitObjectIds) return explicitObjectIds.has(obj.id);
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store' || obj.kind === 'system' || obj.kind === 'component' || obj.kind === 'actor';
    if (view.kind === 'component') return obj.kind === 'component' || obj.kind === 'application' || obj.kind === 'store';
    return true;
  });

  const relevantObjectIds = new Set(relevantObjects.map((o) => o.id));
  const relevantConnections = model.connections.filter(
    (c) => relevantObjectIds.has(c.sourceObjectId) && relevantObjectIds.has(c.targetObjectId),
  );

  // 2. Resolve coordinates & layout
  const nodeW = 220;
  const nodeH = 110;
  const cols = Math.min(3, Math.max(1, relevantObjects.length));

  // Build coordinate lookup (using viewObjects if provided, or deterministic grid)
  const nodeCoords = new Map<string, { x: number; y: number; w: number; h: number }>();
  const customPosMap = new Map<string, { x: number; y: number }>();

  if (options?.viewObjects) {
    for (const vo of options.viewObjects) {
      if (vo.position) {
        customPosMap.set(vo.objectId, vo.position);
      }
    }
  }

  let minCanvasX = Infinity;
  let minCanvasY = Infinity;
  let maxCanvasX = -Infinity;
  let maxCanvasY = -Infinity;

  relevantObjects.forEach((obj, idx) => {
    let x = 0;
    let y = 0;

    const custom = customPosMap.get(obj.id);
    if (custom) {
      x = custom.x;
      y = custom.y;
    } else {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      x = 80 + col * (nodeW + 80);
      y = 120 + row * (nodeH + 70);
    }

    nodeCoords.set(obj.id, { x, y, w: nodeW, h: nodeH });
    minCanvasX = Math.min(minCanvasX, x);
    minCanvasY = Math.min(minCanvasY, y);
    maxCanvasX = Math.max(maxCanvasX, x + nodeW);
    maxCanvasY = Math.max(maxCanvasY, y + nodeH);
  });

  if (relevantObjects.length === 0) {
    minCanvasX = 0;
    minCanvasY = 0;
    maxCanvasX = 600;
    maxCanvasY = 400;
  }

  // Header & legend dimensions
  const headerHeight = includeMetadata ? 90 : 0;
  const legendHeight = includeLegend ? 50 : 0;

  const totalMinX = Math.round(minCanvasX - padding);
  const totalMinY = Math.round(minCanvasY - padding - headerHeight);
  const totalMaxX = Math.round(maxCanvasX + padding);
  const totalMaxY = Math.round(maxCanvasY + padding + legendHeight);

  const viewBoxW = Math.max(640, totalMaxX - totalMinX);
  const viewBoxH = Math.max(480, totalMaxY - totalMinY);
  const scaledWidth = Math.round(viewBoxW * scale);
  const scaledHeight = Math.round(viewBoxH * scale);

  const viewBoxStr = `${totalMinX} ${totalMinY} ${viewBoxW} ${viewBoxH}`;

  // 3. Build Enclosing Boundaries (Parent Systems / Groups)
  const parentGroups = new Map<string, { name: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }>();
  for (const obj of relevantObjects) {
    if (obj.parentId) {
      const parent = model.objects.find((p) => p.id === obj.parentId);
      if (parent) {
        const coords = nodeCoords.get(obj.id);
        if (coords) {
          const current = parentGroups.get(parent.id) ?? {
            name: parent.name,
            bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
          };
          current.bounds.minX = Math.min(current.bounds.minX, coords.x - 20);
          current.bounds.minY = Math.min(current.bounds.minY, coords.y - 35);
          current.bounds.maxX = Math.max(current.bounds.maxX, coords.x + coords.w + 20);
          current.bounds.maxY = Math.max(current.bounds.maxY, coords.y + coords.h + 20);
          parentGroups.set(parent.id, current);
        }
      }
    }
  }

  // 4. Assemble SVG XML Chunks
  const svg: string[] = [];

  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxStr}" width="${scaledWidth}" height="${scaledHeight}" data-fidelity="diagramhq-vector">`,
  );

  // SVG Definitions & Patterns
  svg.push(`  <defs>`);
  // Drop shadows
  svg.push(`    <filter id="dhq-shadow" x="-8%" y="-8%" width="120%" height="120%">`);
  svg.push(`      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>`);
  svg.push(`    </filter>`);

  // Background Grid Pattern
  if (includeGrid && theme.gridDot !== 'transparent') {
    svg.push(`    <pattern id="dhq-grid" width="24" height="24" patternUnits="userSpaceOnUse">`);
    svg.push(`      <circle cx="2" cy="2" r="1.2" fill="${theme.gridDot}" opacity="0.6"/>`);
    svg.push(`    </pattern>`);
  }

  // Arrowhead markers
  svg.push(`    <marker id="arrow-sync" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`);
  svg.push(`      <path d="M 0 1 L 10 5 L 0 9 z" fill="${theme.edgeDefault}"/>`);
  svg.push(`    </marker>`);
  svg.push(`    <marker id="arrow-async" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`);
  svg.push(`      <path d="M 0 1 L 10 5 L 0 9 z" fill="${theme.edgeAsync}"/>`);
  svg.push(`    </marker>`);
  svg.push(`  </defs>`);

  // Embedded Typography Styles
  svg.push(`  <style>`);
  svg.push(`    .dhq-root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }`);
  svg.push(`    .dhq-title { font-size: 20px; font-weight: 700; fill: ${theme.headerText}; letter-spacing: -0.02em; }`);
  svg.push(`    .dhq-meta { font-size: 11px; font-weight: 500; fill: ${theme.subText}; }`);
  svg.push(`    .dhq-node-title { font-size: 13px; font-weight: 700; fill: #ffffff; letter-spacing: -0.01em; }`);
  svg.push(`    .dhq-node-desc { font-size: 10px; font-weight: 400; fill: #94a3b8; line-height: 1.3; }`);
  svg.push(`    .dhq-tech-pill { font-size: 9px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }`);
  svg.push(`    .dhq-edge-text { font-size: 10px; font-weight: 600; fill: ${theme.edgeText}; text-anchor: middle; }`);
  svg.push(`    .dhq-legend-label { font-size: 11px; font-weight: 600; fill: ${theme.subText}; }`);
  svg.push(`  </style>`);

  // Background Fill & Grid Layer
  if (theme.bg !== 'none') {
    svg.push(`  <!-- Background Canvas -->`);
    svg.push(`  <rect x="${totalMinX}" y="${totalMinY}" width="${viewBoxW}" height="${viewBoxH}" fill="${theme.bg}"/>`);
  }
  if (includeGrid && theme.gridDot !== 'transparent') {
    svg.push(`  <rect x="${totalMinX}" y="${totalMinY}" width="${viewBoxW}" height="${viewBoxH}" fill="url(#dhq-grid)"/>`);
  }

  // Header & Metadata Banner
  if (includeMetadata) {
    const headerY = totalMinY + 38;
    const kindName = (view.kind || 'Architecture').toUpperCase();
    svg.push(`  <!-- Header Banner -->`);
    svg.push(`  <g id="dhq-header">`);
    svg.push(`    <text x="${totalMinX + padding}" y="${headerY}" class="dhq-title">${escapeSvgText(title)}</text>`);
    svg.push(
      `    <text x="${totalMinX + padding}" y="${headerY + 22}" class="dhq-meta">${escapeSvgText(
        `${model.architecture.name} • ${kindName} View • Version ${model.version.name} • Generated by DiagramHQ`,
      )}</text>`,
    );
    svg.push(`  </g>`);
  }

  // Parent System & Group Boundaries
  if (parentGroups.size > 0) {
    svg.push(`  <!-- Boundaries & Group Containers -->`);
    svg.push(`  <g id="dhq-boundaries">`);
    for (const [parentId, group] of parentGroups.entries()) {
      const bw = group.bounds.maxX - group.bounds.minX;
      const bh = group.bounds.maxY - group.bounds.minY;
      svg.push(`    <g id="boundary-${parentId}">`);
      svg.push(
        `      <rect x="${group.bounds.minX}" y="${group.bounds.minY}" width="${bw}" height="${bh}" rx="12" fill="${theme.kinds.group.bg}" stroke="${theme.kinds.group.border}" stroke-width="1.5" stroke-dasharray="6,4"/>`,
      );
      // Group header banner pill
      const labelW = group.name.length * 7 + 24;
      svg.push(
        `      <rect x="${group.bounds.minX + 16}" y="${group.bounds.minY - 10}" width="${labelW}" height="20" rx="4" fill="${theme.kinds.group.headerBg}"/>`,
      );
      svg.push(
        `      <text x="${group.bounds.minX + 28}" y="${group.bounds.minY + 4}" fill="${theme.kinds.group.badgeText}" font-size="10" font-weight="700">${escapeSvgText(
          group.name,
        )}</text>`,
      );
      svg.push(`    </g>`);
    }
    svg.push(`  </g>`);
  }

  // Relationship Connections
  svg.push(`  <!-- Relationship Connections -->`);
  svg.push(`  <g id="dhq-edges">`);
  for (const conn of relevantConnections) {
    const srcCoords = nodeCoords.get(conn.sourceObjectId);
    const tgtCoords = nodeCoords.get(conn.targetObjectId);
    if (!srcCoords || !tgtCoords) continue;

    const { pathD, midX, midY } = calculateSvgEdgePath(srcCoords, tgtCoords, edgeRouting);

    const isAsync = conn.kind === 'async';
    const edgeColor = isAsync ? theme.edgeAsync : theme.edgeDefault;
    const marker = isAsync ? 'url(#arrow-async)' : 'url(#arrow-sync)';
    const strokeDash = isAsync ? 'stroke-dasharray="6,4"' : '';

    svg.push(`    <g id="edge-${conn.id}">`);
    if (includeTooltips && (conn.label || conn.description)) {
      svg.push(`      <title>${escapeSvgText(`${conn.label || 'Connection'}: ${conn.description || ''}`)}</title>`);
    }
    svg.push(
      `      <path d="${pathD}" fill="none" stroke="${edgeColor}" stroke-width="2" marker-end="${marker}" ${strokeDash}/>`,
    );

    // Centered Edge Label Pill
    const edgeLabel = conn.label || conn.description;
    if (edgeLabel) {
      const labelText = escapeSvgText(edgeLabel.slice(0, 32));
      const pillWidth = Math.max(50, labelText.length * 6.5 + 18);
      svg.push(`      <g transform="translate(${midX}, ${midY})">`);
      svg.push(
        `        <rect x="${-pillWidth / 2}" y="-11" width="${pillWidth}" height="20" rx="5" fill="${theme.edgeLabelBg}" stroke="${theme.edgeLabelBorder}" stroke-width="1"/>`,
      );
      svg.push(`        <text x="0" y="3" class="dhq-edge-text">${labelText}</text>`);
      svg.push(`      </g>`);
    }
    svg.push(`    </g>`);
  }
  svg.push(`  </g>`);

  // Architecture Nodes
  svg.push(`  <!-- Architecture Elements -->`);
  svg.push(`  <g id="dhq-nodes">`);
  for (const obj of relevantObjects) {
    const coords = nodeCoords.get(obj.id);
    if (!coords) continue;

    const k = obj.kind || 'system';
    const palette = theme.kinds[k] ?? theme.kinds.system;
    const iconPath = getNodeKindIconPath(k);

    svg.push(`    <g id="node-${obj.id}" transform="translate(${coords.x}, ${coords.y})" filter="url(#dhq-shadow)">`);
    if (includeTooltips) {
      svg.push(`      <title>${escapeSvgText(`${obj.name} (${k.toUpperCase()})\n${obj.description || 'Architectural Element'}`)}</title>`);
    }

    // Node Box Body
    svg.push(
      `      <rect width="${coords.w}" height="${coords.h}" rx="10" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>`,
    );

    // Header Accent Bar
    svg.push(
      `      <path d="M 0 10 Q 0 0 10 0 L ${coords.w - 10} 0 Q ${coords.w} 0 ${coords.w} 10 L ${coords.w} 32 L 0 32 Z" fill="${palette.headerBg}"/>`,
    );

    // Icon Inside Header
    svg.push(`      <g transform="translate(10, 8) scale(0.65)" fill="${palette.badgeText}">`);
    svg.push(`        <path d="${iconPath}"/>`);
    svg.push(`      </g>`);

    // Kind Badge Pill
    svg.push(
      `      <rect x="30" y="7" width="65" height="18" rx="4" fill="${palette.badgeBg}"/>`,
    );
    svg.push(
      `      <text x="62" y="19" fill="${palette.badgeText}" font-size="9" font-weight="800" text-anchor="middle" letter-spacing="0.05em">${k.toUpperCase()}</text>`,
    );

    // Active Health Dot Indicator
    svg.push(`      <circle cx="${coords.w - 14}" cy="16" r="4" fill="${palette.accent}"/>`);

    // Node Title
    const titleText = escapeSvgText(obj.name.slice(0, 24));
    svg.push(`      <text x="14" y="54" class="dhq-node-title">${titleText}</text>`);

    // Description / Subtitle
    if (obj.description) {
      const descText = escapeSvgText(obj.description.slice(0, 36));
      svg.push(`      <text x="14" y="72" class="dhq-node-desc">${descText}</text>`);
    }

    // Technology / Metadata Pill
    if (includeBadges) {
      const tech = (obj.metadata?.technology as string) || '';
      const owner = (obj.metadata?.owner as string) || '';
      const badgeText = tech || owner;
      if (badgeText) {
        const cleanBadge = escapeSvgText(badgeText.slice(0, 22));
        const badgeW = cleanBadge.length * 6 + 14;
        svg.push(
          `      <rect x="14" y="${coords.h - 22}" width="${badgeW}" height="15" rx="3" fill="${palette.techBg}"/>`,
        );
        svg.push(
          `      <text x="21" y="${coords.h - 11}" fill="${palette.techText}" class="dhq-tech-pill">${cleanBadge}</text>`,
        );
      }
    }

    svg.push(`    </g>`);
  }
  svg.push(`  </g>`);

  // Legend Component
  if (includeLegend) {
    const legendY = totalMaxY - padding + 15;
    let currX = totalMinX + padding;
    svg.push(`  <!-- C4 Component Kind Legend -->`);
    svg.push(`  <g id="dhq-legend" transform="translate(0, ${legendY})">`);
    const kindsToShow: ObjectKind[] = ['system', 'application', 'store', 'component', 'actor'];
    for (const k of kindsToShow) {
      const palette = theme.kinds[k] ?? theme.kinds.system;
      svg.push(`    <rect x="${currX}" y="-9" width="12" height="12" rx="3" fill="${palette.border}"/>`);
      svg.push(`    <text x="${currX + 18}" y="1" class="dhq-legend-label">${k.toUpperCase()}</text>`);
      currX += 115;
    }
    svg.push(`  </g>`);
  }

  svg.push(`</svg>`);

  const fullSvg = svg.join('\n');
  const checksum = computeContentChecksum(fullSvg);

  // Compute Base64 Data URI
  let dataUri = '';
  if (typeof Buffer !== 'undefined') {
    dataUri = `data:image/svg+xml;base64,${Buffer.from(fullSvg).toString('base64')}`;
  } else if (typeof btoa !== 'undefined') {
    dataUri = `data:image/svg+xml;base64,${btoa(fullSvg)}`;
  }

  const cleanName = sanitizeFilename(title);
  const filename = `${cleanName}-${new Date().toISOString().slice(0, 10)}.svg`;

  return {
    content: fullSvg,
    dataUri,
    filename,
    dimensions: {
      width: scaledWidth,
      height: scaledHeight,
      viewBox: viewBoxStr,
    },
    nodeCount: relevantObjects.length,
    edgeCount: relevantConnections.length,
    boundaryCount: parentGroups.size,
    checksum,
  };
}
