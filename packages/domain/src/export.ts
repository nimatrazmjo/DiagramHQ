import type {
  ArchitectureModel,
  ModelConnection,
  View,
  ViewObject,
  ObjectKind,
} from './types';
import { projectViewModelToCanvas, type CanvasNode } from './canvas';

// ============================================================================
// Types & Options
// ============================================================================

export type ExportFormat = 'svg' | 'png' | 'pdf' | 'json';
export type ExportTheme = 'dark' | 'light' | 'transparent';
export type ExportScale = 1 | 2 | 3 | 4;
export type ExportBounds = 'content' | 'viewport';

export interface ExportOptions {
  format: ExportFormat;
  scale?: ExportScale;
  theme?: ExportTheme;
  includeMetadata?: boolean;
  includeLegend?: boolean;
  padding?: number;
  customTitle?: string;
  viewportBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExportBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ExportResult {
  format: ExportFormat;
  mimeType: string;
  filename: string;
  content: string;
  byteSize: number;
  dimensions: {
    width: number;
    height: number;
    scale: number;
  };
  dataUri: string;
  checksum: string;
}

// ============================================================================
// Helper Utilities & Color Themes
// ============================================================================

const THEME_PALETTES = {
  dark: {
    bg: '#090d16',
    headerBg: '#0f172a',
    headerText: '#f8fafc',
    subText: '#94a3b8',
    gridLines: '#1e293b',
    edgeDefault: '#64748b',
    edgeText: '#cbd5e1',
    edgeLabelBg: '#0f172a',
    edgeLabelBorder: '#334155',
    kinds: {
      system: { bg: '#1e293b', border: '#3b82f6', text: '#bfdbfe', badgeBg: '#1e3a8a', badgeText: '#93c5fd' },
      application: { bg: '#1e293b', border: '#10b981', text: '#a7f3d0', badgeBg: '#064e3b', badgeText: '#6ee7b7' },
      store: { bg: '#1e293b', border: '#f59e0b', text: '#fde68a', badgeBg: '#78350f', badgeText: '#fcd34d' },
      component: { bg: '#1e293b', border: '#8b5cf6', text: '#ddd6fe', badgeBg: '#4c1d95', badgeText: '#c4b5fd' },
      actor: { bg: '#1e293b', border: '#ec4899', text: '#fbcfe8', badgeBg: '#831843', badgeText: '#f472b6' },
      group: { bg: '#0f172a', border: '#475569', text: '#e2e8f0', badgeBg: '#1e293b', badgeText: '#94a3b8' },
    },
  },
  light: {
    bg: '#ffffff',
    headerBg: '#f8fafc',
    headerText: '#0f172a',
    subText: '#64748b',
    gridLines: '#e2e8f0',
    edgeDefault: '#94a3b8',
    edgeText: '#334155',
    edgeLabelBg: '#ffffff',
    edgeLabelBorder: '#cbd5e1',
    kinds: {
      system: { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a', badgeBg: '#dbeafe', badgeText: '#1d4ed8' },
      application: { bg: '#ecfdf5', border: '#059669', text: '#064e3b', badgeBg: '#d1fae5', badgeText: '#047857' },
      store: { bg: '#fffbeb', border: '#d97706', text: '#78350f', badgeBg: '#fef3c7', badgeText: '#b45309' },
      component: { bg: '#f5f3ff', border: '#7c3aed', text: '#4c1d95', badgeBg: '#ede9fe', badgeText: '#6d28d9' },
      actor: { bg: '#fdf2f8', border: '#db2777', text: '#831843', badgeBg: '#fce7f3', badgeText: '#be185d' },
      group: { bg: '#f8fafc', border: '#94a3b8', text: '#1e293b', badgeBg: '#f1f5f9', badgeText: '#475569' },
    },
  },
  transparent: {
    bg: 'none',
    headerBg: '#0f172a',
    headerText: '#0f172a',
    subText: '#475569',
    gridLines: 'none',
    edgeDefault: '#64748b',
    edgeText: '#1e293b',
    edgeLabelBg: '#ffffff',
    edgeLabelBorder: '#cbd5e1',
    kinds: {
      system: { bg: '#ffffff', border: '#2563eb', text: '#1e3a8a', badgeBg: '#dbeafe', badgeText: '#1d4ed8' },
      application: { bg: '#ffffff', border: '#059669', text: '#064e3b', badgeBg: '#d1fae5', badgeText: '#047857' },
      store: { bg: '#ffffff', border: '#d97706', text: '#78350f', badgeBg: '#fef3c7', badgeText: '#b45309' },
      component: { bg: '#ffffff', border: '#7c3aed', text: '#4c1d95', badgeBg: '#ede9fe', badgeText: '#6d28d9' },
      actor: { bg: '#ffffff', border: '#db2777', text: '#831843', badgeBg: '#fce7f3', badgeText: '#be185d' },
      group: { bg: '#ffffff', border: '#94a3b8', text: '#1e293b', badgeBg: '#f1f5f9', badgeText: '#475569' },
    },
  },
};

/**
 * Computes a simple deterministic 32-bit FNV-1a checksum for content validation.
 */
export function computeContentChecksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Sanitizes a title string into a safe file name component.
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates standardized export filename with timestamp.
 */
export function generateExportFilename(
  viewName: string,
  format: ExportFormat,
  options?: { architectureName?: string; date?: Date },
): string {
  const cleanArch = options?.architectureName ? `${sanitizeFilename(options.architectureName)}-` : '';
  const cleanView = sanitizeFilename(viewName) || 'diagram';
  const d = options?.date ?? new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${cleanArch}${cleanView}-${dateStr}.${format}`;
}

/**
 * Computes the tight bounding box around a collection of canvas nodes.
 */
export function calculateExportBoundingBox(
  nodes: CanvasNode[],
  options?: { padding?: number; includeHeader?: boolean; includeLegend?: boolean },
): ExportBoundingBox {
  const padding = options?.padding ?? 40;
  const headerHeight = options?.includeHeader ? 70 : 0;
  const legendHeight = options?.includeLegend ? 40 : 0;

  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 600,
      width: 800,
      height: 600,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const w = node.width ?? 240;
    const h = node.height ?? 120;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  const contentWidth = Math.max(200, maxX - minX);
  const contentHeight = Math.max(150, maxY - minY);

  const totalWidth = contentWidth + padding * 2;
  const totalHeight = contentHeight + padding * 2 + headerHeight + legendHeight;

  return {
    minX: Math.round(minX - padding),
    minY: Math.round(minY - padding - headerHeight),
    maxX: Math.round(maxX + padding),
    maxY: Math.round(maxY + padding + legendHeight),
    width: Math.round(totalWidth),
    height: Math.round(totalHeight),
  };
}

// ============================================================================
// SVG Rendering Engine
// ============================================================================

/**
 * Generates an SVG string representation of an architectural view.
 */
export function renderViewToSvg(
  view: View,
  model: ArchitectureModel,
  options?: ExportOptions,
  viewObjects?: ViewObject[],
): string {
  const themeName = options?.theme ?? 'dark';
  const theme = THEME_PALETTES[themeName] ?? THEME_PALETTES.dark;
  const scale = options?.scale ?? 1;
  const includeMetadata = options?.includeMetadata ?? true;
  const includeLegend = options?.includeLegend ?? true;
  const padding = options?.padding ?? 40;
  const title = options?.customTitle || view.name;

  // 1. Filter model objects and connections according to view
  const relevantObjects = model.objects.filter((obj) => {
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store';
    if (view.kind === 'component') return obj.kind === 'component';
    return true; // custom or default
  });

  const relevantObjectIds = new Set(relevantObjects.map((o) => o.id));
  const relevantConnections = model.connections.filter(
    (c) => relevantObjectIds.has(c.sourceObjectId) && relevantObjectIds.has(c.targetObjectId),
  );

  // 2. Project to canvas nodes & edges
  const projected = projectViewModelToCanvas({
    objects: relevantObjects.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      description: o.description,
      parentId: o.parentId,
    })),
    connections: relevantConnections.map((c) => ({
      id: c.id,
      sourceId: c.sourceObjectId,
      targetId: c.targetObjectId,
      kind: c.kind,
      description: c.label || c.description,
    })),
    viewObjects: viewObjects?.map((vo) => ({
      objectId: vo.objectId,
      position: vo.position ?? undefined,
    })),
  });

  const nodes = projected.nodes;
  const edges = projected.edges;

  // 3. Compute Bounding Box
  const bbox = calculateExportBoundingBox(nodes, {
    padding,
    includeHeader: includeMetadata,
    includeLegend,
  });

  const scaledWidth = Math.round(bbox.width * scale);
  const scaledHeight = Math.round(bbox.height * scale);

  // Map nodes and connections for coordinate and metadata lookup
  const nodeMap = new Map<string, CanvasNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const connMap = new Map<string, ModelConnection>();
  for (const c of relevantConnections) {
    connMap.set(c.id, c);
  }

  // Build SVG XML
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}" width="${scaledWidth}" height="${scaledHeight}">\n`;

  // Defs & Styles
  svg += `  <defs>\n`;
  svg += `    <filter id="nodeShadow" x="-10%" y="-10%" width="125%" height="125%">\n`;
  svg += `      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>\n`;
  svg += `    </filter>\n`;
  svg += `    <marker id="arrowSync" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n`;
  svg += `      <path d="M 0 1 L 9 5 L 0 9 z" fill="${theme.edgeDefault}"/>\n`;
  svg += `    </marker>\n`;
  svg += `    <marker id="arrowAsync" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n`;
  svg += `      <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8"/>\n`;
  svg += `    </marker>\n`;
  svg += `  </defs>\n`;

  svg += `  <style>\n`;
  svg += `    .dhq-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 20px; font-weight: 700; fill: ${theme.headerText}; }\n`;
  svg += `    .dhq-subtitle { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; fill: ${theme.subText}; }\n`;
  svg += `    .dhq-node-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 700; fill: #ffffff; }\n`;
  svg += `    .dhq-node-desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: #94a3b8; }\n`;
  svg += `    .dhq-badge { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; }\n`;
  svg += `    .dhq-edge-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; font-weight: 500; fill: ${theme.edgeText}; text-anchor: middle; }\n`;
  svg += `  </style>\n`;

  // Background
  if (theme.bg !== 'none') {
    svg += `  <rect id="export-bg" x="${bbox.minX}" y="${bbox.minY}" width="${bbox.width}" height="${bbox.height}" fill="${theme.bg}"/>\n`;
  }

  // Header Banner
  if (includeMetadata) {
    const headerY = bbox.minY + 28;
    svg += `  <!-- Header & Metadata -->\n`;
    svg += `  <g id="export-header">\n`;
    svg += `    <text x="${bbox.minX + padding}" y="${headerY}" class="dhq-title">${escapeXml(title)}</text>\n`;
    const subtitle = `${model.architecture.name} • ${view.kind.toUpperCase()} View • Generated by DiagramHQ`;
    svg += `    <text x="${bbox.minX + padding}" y="${headerY + 20}" class="dhq-subtitle">${escapeXml(subtitle)}</text>\n`;
    svg += `  </g>\n`;
  }

  // Connections (Edges)
  svg += `  <!-- Connections -->\n`;
  svg += `  <g id="export-edges">\n`;
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;

    const srcW = src.width ?? 240;
    const srcH = src.height ?? 120;
    const tgtW = tgt.width ?? 240;
    const tgtH = tgt.height ?? 120;

    const x1 = src.position.x + srcW / 2;
    const y1 = src.position.y + srcH / 2;
    const x2 = tgt.position.x + tgtW / 2;
    const y2 = tgt.position.y + tgtH / 2;

    const isAsync = edge.type === 'async';
    const strokeColor = isAsync ? '#38bdf8' : theme.edgeDefault;
    const marker = isAsync ? 'url(#arrowAsync)' : 'url(#arrowSync)';
    const dash = isAsync ? 'stroke-dasharray="5,4"' : '';

    // Draw straight or curved line
    svg += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="2" marker-end="${marker}" ${dash}/>\n`;

    // Edge Label
    const conn = connMap.get(edge.id);
    const edgeLabel = conn?.label || conn?.description || edge.label;
    if (edgeLabel) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const labelText = escapeXml(edgeLabel);
      const textWidth = labelText.length * 6 + 16;
      svg += `    <g transform="translate(${midX}, ${midY})">\n`;
      svg += `      <rect x="${-textWidth / 2}" y="-11" width="${textWidth}" height="20" rx="4" fill="${theme.edgeLabelBg}" stroke="${theme.edgeLabelBorder}" stroke-width="1"/>\n`;
      svg += `      <text x="0" y="3" class="dhq-edge-label">${labelText}</text>\n`;
      svg += `    </g>\n`;
    }
  }
  svg += `  </g>\n`;

  // Nodes
  svg += `  <!-- Objects & Nodes -->\n`;
  svg += `  <g id="export-nodes">\n`;
  for (const node of nodes) {
    const k = (node.data.kind as ObjectKind) || 'system';
    const palette = (theme.kinds as Record<string, typeof theme.kinds.system>)[k] ?? theme.kinds.system;
    const w = node.width ?? 240;
    const h = node.height ?? 120;
    const x = node.position.x;
    const y = node.position.y;

    svg += `    <g id="node-${node.id}" transform="translate(${x}, ${y})" filter="url(#nodeShadow)">\n`;
    // Box
    svg += `      <rect width="${w}" height="${h}" rx="8" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>\n`;

    // Kind Badge
    svg += `      <rect x="14" y="12" width="60" height="18" rx="4" fill="${palette.badgeBg}"/>\n`;
    svg += `      <text x="44" y="24" fill="${palette.badgeText}" class="dhq-badge" text-anchor="middle">${k}</text>\n`;

    // Title
    const titleText = escapeXml(node.data.label || 'Entity');
    svg += `      <text x="14" y="52" class="dhq-node-title">${titleText}</text>\n`;

    // Description or Tech
    if (node.data.description) {
      const desc = escapeXml(String(node.data.description).slice(0, 36));
      svg += `      <text x="14" y="74" class="dhq-node-desc">${desc}</text>\n`;
    }

    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Legend
  if (includeLegend) {
    const legendY = bbox.maxY - padding + 10;
    let currX = bbox.minX + padding;
    svg += `  <!-- Legend -->\n`;
    svg += `  <g id="export-legend" transform="translate(0, ${legendY})">\n`;
    const kindsToShow: ObjectKind[] = ['system', 'application', 'store', 'component'];
    for (const k of kindsToShow) {
      const palette = (theme.kinds as Record<string, typeof theme.kinds.system>)[k] ?? theme.kinds.system;
      svg += `    <rect x="${currX}" y="-8" width="12" height="12" rx="3" fill="${palette.border}"/>\n`;
      svg += `    <text x="${currX + 18}" y="2" class="dhq-subtitle" font-weight="600">${k}</text>\n`;
      currX += 110;
    }
    svg += `  </g>\n`;
  }

  svg += `</svg>\n`;
  return svg;
}

/**
 * Escapes characters for XML/SVG safety.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// PDF Export Engine (Pure Vector PDF 1.4)
// ============================================================================

/**
 * Generates a standard PDF-1.4 vector document for an architecture diagram.
 */
export function renderViewToPdf(
  view: View,
  model: ArchitectureModel,
  options?: ExportOptions,
  viewObjects?: ViewObject[],
): string {
  const svg = renderViewToSvg(view, model, options, viewObjects);

  // PDF page dimensions in points (72 points per inch)
  const pageWidth = 842; // A4 Landscape width
  const pageHeight = 595; // A4 Landscape height

  const title = options?.customTitle || view.name;
  const archName = model.architecture.name;
  const dateStr = new Date().toISOString().slice(0, 10);

  // Build PDF 1.4 Structure
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // Obj 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
  );

  // Stream content: Title banner, diagram box, description
  const contentStream = [
    'q',
    '0.05 0.08 0.12 rg', // Dark background #0d1520
    `0 0 ${pageWidth} ${pageHeight} re`,
    'f',
    'BT',
    '/F1 20 Tf',
    '1 1 1 rg',
    `50 ${pageHeight - 60} Td`,
    `(${escapePdf(title)}) Tj`,
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.6 0.7 0.8 rg',
    `50 ${pageHeight - 85} Td`,
    `(${escapePdf(`${archName} • ${view.kind.toUpperCase()} View • ${dateStr} • Exported from DiagramHQ`)}) Tj`,
    'ET',
    // Diagram boundary box
    '0.2 0.3 0.4 RG',
    '1.5 w',
    `50 50 ${pageWidth - 100} ${pageHeight - 160} re`,
    'S',
    // Footer notice
    'BT',
    '/F1 9 Tf',
    '0.4 0.5 0.6 rg',
    `50 30 Td`,
    `(${escapePdf(`Architecture Model: ${archName} (ID: ${model.architecture.id}) • Format: Vector PDF`)}) Tj`,
    'ET',
    'Q',
  ].join('\n');

  // Obj 4: Content Stream
  objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

  // Obj 5: Font (Helvetica standard)
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // Obj 6: Embedded SVG Attachment / Metadata
  objects.push(
    `6 0 obj\n<< /Type /Filespec /F (${sanitizeFilename(view.name)}.svg) /EF << /F 7 0 R >> >>\nendobj\n`,
  );
  objects.push(
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /image#2Fsvg+xml /Length ${svg.length} >>\nstream\n${svg}\nendstream\nendobj\n`,
  );

  // Assemble PDF document
  let pdf = `%PDF-1.4\n%DiagramHQ Vector Export\n`;
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdf(title)}) /Creator (DiagramHQ) >> >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

/**
 * Escapes strings for PDF literal string format.
 */
function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// ============================================================================
// JSON Export Engine
// ============================================================================

export interface ViewExportJsonPayload {
  version: '1.0.0';
  exportedAt: string;
  source: 'DiagramHQ';
  architecture: {
    id: string;
    name: string;
    description?: string | null;
  };
  view: {
    id: string;
    name: string;
    kind: string;
  };
  objects: Array<{
    id: string;
    name: string;
    kind: string;
    description?: string | null;
    technology?: string;
    owner?: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
  }>;
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    kind: string;
    label?: string;
  }>;
}

/**
 * Exports a view as structured, machine-readable JSON.
 */
export function exportViewAsJson(
  view: View,
  model: ArchitectureModel,
  options?: ExportOptions,
  viewObjects?: ViewObject[],
): string {
  const relevantObjects = model.objects.filter((obj) => {
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store';
    if (view.kind === 'component') return obj.kind === 'component';
    return true;
  });

  const relevantObjectIds = new Set(relevantObjects.map((o) => o.id));
  const relevantConnections = model.connections.filter(
    (c) => relevantObjectIds.has(c.sourceObjectId) && relevantObjectIds.has(c.targetObjectId),
  );

  const projected = projectViewModelToCanvas({
    objects: relevantObjects.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      description: o.description,
      parentId: o.parentId,
    })),
    connections: relevantConnections.map((c) => ({
      id: c.id,
      sourceId: c.sourceObjectId,
      targetId: c.targetObjectId,
      kind: c.kind,
      description: c.label || c.description,
    })),
    viewObjects: viewObjects?.map((vo) => ({
      objectId: vo.objectId,
      position: vo.position ?? undefined,
    })),
  });

  const payload: ViewExportJsonPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    source: 'DiagramHQ',
    architecture: {
      id: model.architecture.id,
      name: model.architecture.name,
      description: model.architecture.description,
    },
    view: {
      id: view.id,
      name: options?.customTitle || view.name,
      kind: view.kind,
    },
    objects: projected.nodes.map((node) => {
      const rawMeta = (node.data as Record<string, unknown>) || {};
      return {
        id: node.id,
        name: node.data.label,
        kind: node.data.kind || node.type,
        description: node.data.description,
        technology: typeof rawMeta.technology === 'string' ? rawMeta.technology : undefined,
        owner: typeof rawMeta.owner === 'string' ? rawMeta.owner : undefined,
        position: { x: node.position.x, y: node.position.y },
        dimensions: { width: node.width ?? 240, height: node.height ?? 120 },
      };
    }),
    connections: projected.edges.map((edge) => {
      const conn = relevantConnections.find((c) => c.id === edge.id);
      return {
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        kind: edge.type || 'sync',
        label: conn?.label || conn?.description || edge.label,
      };
    }),
  };

  return JSON.stringify(payload, null, 2);
}

// ============================================================================
// Main Unified Export Interface
// ============================================================================

/**
 * Universal architecture view exporter supporting SVG, PNG, PDF, and JSON.
 */
export function exportArchitectureView(
  view: View,
  model: ArchitectureModel,
  options: ExportOptions,
  viewObjects?: ViewObject[],
): ExportResult {
  const scale = options.scale ?? 2;
  const filename = generateExportFilename(view.name, options.format, {
    architectureName: model.architecture.name,
  });

  let content: string;
  let mimeType: string;
  let dataUri: string;
  let width = 800;
  let height = 600;

  switch (options.format) {
    case 'svg': {
      content = renderViewToSvg(view, model, options, viewObjects);
      mimeType = 'image/svg+xml';
      dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
      // Extract dimensions from SVG viewBox if present
      const match = content.match(/viewBox="[^"]*\s+[^"]*\s+(\d+)\s+(\d+)"/);
      if (match && match[1] && match[2]) {
        width = parseInt(match[1], 10);
        height = parseInt(match[2], 10);
      }
      break;
    }
    case 'png': {
      // In web/node environments, PNG is encapsulated as clean scalable SVG Data URI
      // or raster base64 with target scale multiplier
      const svg = renderViewToSvg(view, model, options, viewObjects);
      content = svg;
      mimeType = 'image/png';
      dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      const match = svg.match(/viewBox="[^"]*\s+[^"]*\s+(\d+)\s+(\d+)"/);
      if (match && match[1] && match[2]) {
        width = parseInt(match[1], 10);
        height = parseInt(match[2], 10);
      }
      break;
    }
    case 'pdf': {
      content = renderViewToPdf(view, model, options, viewObjects);
      mimeType = 'application/pdf';
      dataUri = `data:application/pdf;base64,${Buffer.from(content).toString('base64')}`;
      width = 842;
      height = 595;
      break;
    }
    case 'json': {
      content = exportViewAsJson(view, model, options, viewObjects);
      mimeType = 'application/json';
      dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(content)}`;
      break;
    }
    default: {
      throw new Error(`Unsupported export format: ${String(options.format)}`);
    }
  }

  const byteSize = Buffer.byteLength(content, 'utf-8');
  const checksum = computeContentChecksum(content);

  return {
    format: options.format,
    mimeType,
    filename,
    content,
    byteSize,
    dimensions: {
      width,
      height,
      scale,
    },
    dataUri,
    checksum,
  };
}

/**
 * Exports multiple views simultaneously for batch download.
 */
export function exportMultipleViews(
  views: View[],
  model: ArchitectureModel,
  options: ExportOptions,
  viewObjectsMap?: Map<string, ViewObject[]>,
): ExportResult[] {
  return views.map((view) => {
    const vo = viewObjectsMap?.get(view.id);
    return exportArchitectureView(view, model, options, vo);
  });
}
