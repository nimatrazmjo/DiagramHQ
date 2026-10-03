import type {
  ArchitectureModel,
  ModelObject,
  View,
  FlowWithSteps,
  ViewObject,
} from './types';
import { sanitizeFilename, computeContentChecksum } from './export';

// ============================================================================
// Types & Options
// ============================================================================

export type PdfPageFormat = 'a4' | 'letter';
export type PdfPageOrientation = 'portrait' | 'landscape';

export type PdfSectionId = 'cover' | 'overview' | 'views' | 'catalog' | 'adrs' | 'flows';

export interface PdfExportOptions {
  format?: PdfPageFormat;
  orientation?: PdfPageOrientation;
  sections?: PdfSectionId[];
  customTitle?: string;
  author?: string;
  organization?: string;
  watermark?: string;
  includePageNumbers?: boolean;
  selectedViewIds?: string[];
  viewObjectsMap?: Map<string, ViewObject[]>;
  flows?: FlowWithSteps[];
  adrs?: Array<{
    id: string;
    title: string;
    status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';
    date?: string;
    context: string;
    decision: string;
    consequences?: string;
  }>;
}

export interface PdfBookResult {
  content: string;
  dataUri: string;
  filename: string;
  pageCount: number;
  byteSize: number;
  sectionsIncluded: PdfSectionId[];
  dimensions: {
    width: number;
    height: number;
    format: PdfPageFormat;
    orientation: PdfPageOrientation;
  };
  checksum: string;
}

// ============================================================================
// Page Dimensions
// ============================================================================

export function getPdfPageDimensions(
  format: PdfPageFormat = 'a4',
  orientation: PdfPageOrientation = 'landscape',
): { width: number; height: number } {
  const base =
    format === 'letter'
      ? { width: 612, height: 792 } // 8.5 x 11 in
      : { width: 595.28, height: 841.89 }; // A4: 210 x 297 mm

  if (orientation === 'landscape') {
    return {
      width: Math.round(base.height),
      height: Math.round(base.width),
    };
  }

  return {
    width: Math.round(base.width),
    height: Math.round(base.height),
  };
}

/**
 * Escapes characters for PDF literal strings.
 */
function escapePdf(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

// ============================================================================
// PDF Page Stream Generators
// ============================================================================

interface PageStreamOptions {
  width: number;
  height: number;
  pageNumber: number;
  totalPages: number;
  docTitle: string;
  watermark?: string;
  includePageNumbers?: boolean;
}

function renderRunningHeaderAndFooter(opts: PageStreamOptions, sectionName?: string): string[] {
  const lines: string[] = [];
  const { width, height, pageNumber, totalPages, docTitle, watermark, includePageNumbers } = opts;

  // Running Header
  lines.push('BT');
  lines.push('/F1 8 Tf');
  lines.push('0.4 0.5 0.6 rg');
  lines.push(`40 ${height - 25} Td`);
  lines.push(`(${escapePdf(docTitle.toUpperCase())} ${sectionName ? `// ${escapePdf(sectionName.toUpperCase())}` : ''}) Tj`);
  lines.push('ET');

  // Header Divider
  lines.push('0.15 0.22 0.3 RG');
  lines.push('0.5 w');
  lines.push(`40 ${height - 32} m`);
  lines.push(`${width - 40} ${height - 32} l`);
  lines.push('S');

  // Watermark
  if (watermark) {
    lines.push('q');
    lines.push('BT');
    lines.push('/F2 36 Tf');
    lines.push('0.25 0.3 0.38 rg'); // Subtle watermark color
    lines.push(`1 0 0 1 ${Math.round(width / 2 - 120)} ${Math.round(height / 2)} Tm`);
    lines.push(`(${escapePdf(watermark)}) Tj`);
    lines.push('ET');
    lines.push('Q');
  }

  // Running Footer
  if (includePageNumbers !== false) {
    // Footer Divider
    lines.push('0.15 0.22 0.3 RG');
    lines.push('0.5 w');
    lines.push(`40 32 m`);
    lines.push(`${width - 40} 32 l`);
    lines.push('S');

    lines.push('BT');
    lines.push('/F1 8 Tf');
    lines.push('0.4 0.5 0.6 rg');
    lines.push(`40 20 Td`);
    lines.push(`(DiagramHQ Architecture OS • Generated on ${new Date().toISOString().slice(0, 10)}) Tj`);
    lines.push('ET');

    lines.push('BT');
    lines.push('/F1 8 Tf');
    lines.push('0.6 0.7 0.8 rg');
    lines.push(`${width - 100} 20 Td`);
    lines.push(`(Page ${pageNumber} of ${totalPages}) Tj`);
    lines.push('ET');
  }

  return lines;
}

// ----------------------------------------------------------------------------
// 1. Cover Page
// ----------------------------------------------------------------------------
function buildCoverPageStream(
  model: ArchitectureModel,
  opts: PageStreamOptions,
  customTitle?: string,
  author?: string,
  organization?: string,
): string {
  const { width, height } = opts;
  const title = customTitle || model.architecture.name;
  const subtitle = model.architecture.description || 'System Architecture Documentation & Technical Blueprint';
  const org = organization || 'DiagramHQ Engineering';
  const auth = author || 'Architecture Team';
  const ver = model.version.name;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const ops: string[] = [
    'q',
    '0.06 0.09 0.14 rg', // Deep navy background #0f1724
    `0 0 ${width} ${height} re`,
    'f',

    // Decorative top stripe
    '0.2 0.6 0.95 rg', // Accent blue
    `0 ${height - 8} ${width} 8 re`,
    'f',

    // Logo / Product mark
    'BT',
    '/F2 14 Tf',
    '0.3 0.7 1.0 rg',
    `60 ${height - 80} Td`,
    '(DIAGRAMHQ // ARCHITECTURE REPORT) Tj',
    'ET',

    // Main Title
    'BT',
    '/F2 32 Tf',
    '1.0 1.0 1.0 rg',
    `60 ${height - 140} Td`,
    `(${escapePdf(title)}) Tj`,
    'ET',

    // Subtitle
    'BT',
    '/F1 14 Tf',
    '0.65 0.75 0.88 rg',
    `60 ${height - 175} Td`,
    `(${escapePdf(subtitle.slice(0, 85))}) Tj`,
    'ET',

    // Version Badge box
    '0.12 0.2 0.32 rg',
    `60 ${height - 230} 140 26 re`,
    'f',
    '0.2 0.5 0.8 RG',
    '1 w',
    `60 ${height - 230} 140 26 re`,
    'S',
    'BT',
    '/F2 10 Tf',
    '0.4 0.8 1.0 rg',
    `75 ${height - 213} Td`,
    `(${escapePdf(`VERSION: ${ver.toUpperCase()}`)}) Tj`,
    'ET',

    // Metadata card box
    '0.09 0.13 0.20 rg',
    `60 80 ${width - 120} 100 re`,
    'f',
    '0.18 0.25 0.36 RG',
    '1 w',
    `60 80 ${width - 120} 100 re`,
    'S',

    // Metadata items
    'BT',
    '/F2 10 Tf',
    '0.5 0.6 0.7 rg',
    `80 150 Td`,
    '(ORGANIZATION:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.9 0.95 1.0 rg',
    `180 150 Td`,
    `(${escapePdf(org)}) Tj`,
    'ET',

    'BT',
    '/F2 10 Tf',
    '0.5 0.6 0.7 rg',
    `80 125 Td`,
    '(AUTHOR / TEAM:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.9 0.95 1.0 rg',
    `180 125 Td`,
    `(${escapePdf(auth)}) Tj`,
    'ET',

    'BT',
    '/F2 10 Tf',
    '0.5 0.6 0.7 rg',
    `80 100 Td`,
    '(PUBLISHED DATE:) Tj',
    'ET',
    'BT',
    '/F1 11 Tf',
    '0.9 0.95 1.0 rg',
    `180 100 Td`,
    `(${escapePdf(dateStr)}) Tj`,
    'ET',

    'Q',
  ];

  if (opts.watermark) {
    ops.push('q', 'BT', '/F2 28 Tf', '0.3 0.35 0.45 rg', `60 40 Td`, `(${escapePdf(opts.watermark)}) Tj`, 'ET', 'Q');
  }

  return ops.join('\n');
}

// ----------------------------------------------------------------------------
// 2. Executive Overview Page
// ----------------------------------------------------------------------------
function buildOverviewPageStream(
  model: ArchitectureModel,
  opts: PageStreamOptions,
): string {
  const { width, height } = opts;
  const ops: string[] = [
    'q',
    '0.06 0.08 0.12 rg',
    `0 0 ${width} ${height} re`,
    'f',
  ];

  ops.push(...renderRunningHeaderAndFooter(opts, 'Architecture Overview & Metrics'));

  // Section Heading
  ops.push('BT', '/F2 20 Tf', '1 1 1 rg', `40 ${height - 65} Td`, '(Executive Summary) Tj', 'ET');
  ops.push(
    'BT',
    '/F1 11 Tf',
    '0.7 0.78 0.88 rg',
    `40 ${height - 90} Td`,
    `(${escapePdf(`Architecture model blueprint for ${model.architecture.name}. This document specifies system topology, components, and decisions.`)}) Tj`,
    'ET',
  );

  // Metric Cards Grid
  const systems = model.objects.filter((o) => o.kind === 'system').length;
  const apps = model.objects.filter((o) => o.kind === 'application').length;
  const stores = model.objects.filter((o) => o.kind === 'store').length;
  const components = model.objects.filter((o) => o.kind === 'component').length;
  const actors = model.objects.filter((o) => o.kind === 'actor').length;
  const conns = model.connections.length;

  const metrics = [
    { label: 'Systems', value: String(systems) },
    { label: 'Applications', value: String(apps) },
    { label: 'Data Stores', value: String(stores) },
    { label: 'Components', value: String(components) },
    { label: 'Actors / Users', value: String(actors) },
    { label: 'Connections', value: String(conns) },
  ];

  const cardWidth = Math.floor((width - 80 - 5 * 12) / 6);
  let cardX = 40;
  const cardY = height - 180;
  const cardH = 65;

  for (const m of metrics) {
    ops.push('0.09 0.13 0.20 rg', `${cardX} ${cardY} ${cardWidth} ${cardH} re`, 'f');
    ops.push('0.18 0.25 0.36 RG', '1 w', `${cardX} ${cardY} ${cardWidth} ${cardH} re`, 'S');
    ops.push('BT', '/F2 22 Tf', '0.2 0.7 1.0 rg', `${cardX + 15} ${cardY + 32} Td`, `(${escapePdf(m.value)}) Tj`, 'ET');
    ops.push('BT', '/F1 9 Tf', '0.6 0.7 0.8 rg', `${cardX + 15} ${cardY + 14} Td`, `(${escapePdf(m.label.toUpperCase())}) Tj`, 'ET');
    cardX += cardWidth + 12;
  }

  // System Scope Table
  const tableY = cardY - 30;
  ops.push('BT', '/F2 14 Tf', '1 1 1 rg', `40 ${tableY} Td`, '(High-Level Core Systems) Tj', 'ET');

  const topSystems = model.objects.filter((o) => o.kind === 'system').slice(0, 5);
  let rowY = tableY - 30;

  // Table header
  ops.push('0.12 0.18 0.28 rg', `40 ${rowY - 5} ${width - 80} 22 re`, 'f');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `50 ${rowY + 2} Td`, '(SYSTEM NAME) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `240 ${rowY + 2} Td`, '(OWNER / TEAM) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `400 ${rowY + 2} Td`, '(DESCRIPTION) Tj', 'ET');
  rowY -= 26;

  for (const s of topSystems) {
    ops.push('0.08 0.11 0.16 rg', `40 ${rowY - 4} ${width - 80} 22 re`, 'f');
    ops.push('0.15 0.20 0.30 RG', '0.5 w', `40 ${rowY - 4} ${width - 80} 22 re`, 'S');
    ops.push('BT', '/F2 10 Tf', '1 1 1 rg', `50 ${rowY + 3} Td`, `(${escapePdf(s.name)}) Tj`, 'ET');
    ops.push('BT', '/F1 9 Tf', '0.5 0.8 0.6 rg', `240 ${rowY + 3} Td`, `(${escapePdf((s.metadata?.owner as string) || 'Platform Team')}) Tj`, 'ET');
    ops.push('BT', '/F1 9 Tf', '0.7 0.75 0.85 rg', `400 ${rowY + 3} Td`, `(${escapePdf((s.description || 'Core system boundary').slice(0, 70))}) Tj`, 'ET');
    rowY -= 26;
  }

  ops.push('Q');
  return ops.join('\n');
}

// ----------------------------------------------------------------------------
// 3. Diagram View Page
// ----------------------------------------------------------------------------
function buildViewPageStream(
  view: View,
  model: ArchitectureModel,
  opts: PageStreamOptions,
): string {
  const { width, height } = opts;
  const ops: string[] = [
    'q',
    '0.06 0.08 0.12 rg',
    `0 0 ${width} ${height} re`,
    'f',
  ];

  ops.push(...renderRunningHeaderAndFooter(opts, `Diagram // ${view.name}`));

  // View Header Banner
  ops.push('BT', '/F2 18 Tf', '1 1 1 rg', `40 ${height - 65} Td`, `(${escapePdf(view.name)}) Tj`, 'ET');
  const kindStr = String(view.kind || 'Architecture');
  const metaSubtitle = `${kindStr.toUpperCase()} View • Target Scope: ${model.architecture.name} • Version ${model.version.name}`;
  ops.push('BT', '/F1 10 Tf', '0.6 0.7 0.85 rg', `40 ${height - 84} Td`, `(${escapePdf(metaSubtitle)}) Tj`, 'ET');

  // Diagram Drawing Canvas Bounding Box
  const canvasX = 40;
  const canvasY = 50;
  const canvasW = width - 80;
  const canvasH = height - 150;

  ops.push('0.08 0.11 0.18 rg', `${canvasX} ${canvasY} ${canvasW} ${canvasH} re`, 'f');
  ops.push('0.18 0.26 0.40 RG', '1.5 w', `${canvasX} ${canvasY} ${canvasW} ${canvasH} re`, 'S');

  // Filter objects for this view
  const viewObjects = model.objects.filter((obj) => {
    if (view.kind === 'context') return obj.kind === 'system' || obj.kind === 'actor';
    if (view.kind === 'container') return obj.kind === 'application' || obj.kind === 'store';
    if (view.kind === 'component') return obj.kind === 'component';
    return true;
  });

  const objIds = new Set(viewObjects.map((o) => o.id));
  const viewConns = model.connections.filter(
    (c) => objIds.has(c.sourceObjectId) && objIds.has(c.targetObjectId),
  );

  // Render stylized node boxes in a 2D layout grid
  const nodeW = Math.min(180, Math.floor(canvasW / 3 - 30));
  const nodeH = 75;
  const cols = Math.min(3, Math.max(1, viewObjects.length));
  const nodeCoords = new Map<string, { x: number; y: number }>();

  viewObjects.forEach((obj, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const spacingX = Math.floor((canvasW - cols * nodeW) / (cols + 1));
    const x = canvasX + spacingX * (col + 1) + col * nodeW;
    const y = canvasY + canvasH - (row + 1) * (nodeH + 40);

    nodeCoords.set(obj.id, { x, y });

    // Node Box Colors based on kind
    let bgR = '0.12 0.22 0.42'; // system blue
    let strokeR = '0.25 0.50 0.85';
    let kindBadge = 'SYSTEM';

    if (obj.kind === 'application') {
      bgR = '0.08 0.25 0.20'; // app emerald
      strokeR = '0.15 0.60 0.45';
      kindBadge = 'CONTAINER';
    } else if (obj.kind === 'store') {
      bgR = '0.30 0.18 0.08'; // store amber
      strokeR = '0.70 0.45 0.15';
      kindBadge = 'DATABASE';
    } else if (obj.kind === 'actor') {
      bgR = '0.30 0.10 0.22'; // actor rose
      strokeR = '0.75 0.25 0.55';
      kindBadge = 'ACTOR';
    }

    ops.push(`${bgR} rg`, `${x} ${y} ${nodeW} ${nodeH} re`, 'f');
    ops.push(`${strokeR} RG`, '1.5 w', `${x} ${y} ${nodeW} ${nodeH} re`, 'S');

    // Kind Badge
    ops.push('BT', '/F2 8 Tf', '0.6 0.8 1.0 rg', `${x + 12} ${y + nodeH - 18} Td`, `(${kindBadge}) Tj`, 'ET');
    // Node Name
    ops.push('BT', '/F2 11 Tf', '1 1 1 rg', `${x + 12} ${y + nodeH - 34} Td`, `(${escapePdf(obj.name.slice(0, 32))}) Tj`, 'ET');
    // Tech tag
    const tech = (obj.metadata?.technology as string) || '';
    if (tech) {
      ops.push('BT', '/F1 8 Tf', '0.5 0.8 0.7 rg', `${x + 12} ${y + 12} Td`, `(${escapePdf(`[${tech.slice(0, 24)}]`)}) Tj`, 'ET');
    }
  });

  // Render connection lines between nodes
  ops.push('0.3 0.5 0.7 RG', '1 w');
  for (const conn of viewConns) {
    const src = nodeCoords.get(conn.sourceObjectId);
    const tgt = nodeCoords.get(conn.targetObjectId);
    if (!src || !tgt) continue;

    const x1 = src.x + nodeW / 2;
    const y1 = src.y + nodeH / 2;
    const x2 = tgt.x + nodeW / 2;
    const y2 = tgt.y + nodeH / 2;

    ops.push(`${x1} ${y1} m`, `${x2} ${y2} l`, 'S');

    if (conn.label) {
      const midX = Math.round((x1 + x2) / 2);
      const midY = Math.round((y1 + y2) / 2);
      ops.push('BT', '/F1 8 Tf', '0.7 0.8 0.95 rg', `${midX - 30} ${midY + 4} Td`, `(${escapePdf(conn.label.slice(0, 25))}) Tj`, 'ET');
    }
  }

  ops.push('Q');
  return ops.join('\n');
}

// ----------------------------------------------------------------------------
// 4. Object & Service Catalog Page
// ----------------------------------------------------------------------------
function buildCatalogPageStream(
  items: ModelObject[],
  opts: PageStreamOptions,
  partIndex: number = 1,
  totalParts: number = 1,
): string {
  const { width, height } = opts;
  const ops: string[] = [
    'q',
    '0.06 0.08 0.12 rg',
    `0 0 ${width} ${height} re`,
    'f',
  ];

  const partSuffix = totalParts > 1 ? ` (Part ${partIndex}/${totalParts})` : '';
  ops.push(...renderRunningHeaderAndFooter(opts, `Service & Object Catalog${partSuffix}`));

  ops.push('BT', '/F2 18 Tf', '1 1 1 rg', `40 ${height - 65} Td`, `(${escapePdf(`Architectural Entity Catalog${partSuffix}`)}) Tj`, 'ET');
  ops.push('BT', '/F1 10 Tf', '0.6 0.7 0.85 rg', `40 ${height - 84} Td`, '(Complete listing of all registered architectural elements, technologies, and owners.) Tj', 'ET');

  let rowY = height - 120;

  // Table header
  ops.push('0.12 0.18 0.28 rg', `40 ${rowY - 5} ${width - 80} 22 re`, 'f');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `50 ${rowY + 2} Td`, '(ENTITY NAME) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `220 ${rowY + 2} Td`, '(KIND) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `320 ${rowY + 2} Td`, '(TECHNOLOGY) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `460 ${rowY + 2} Td`, '(OWNER) Tj', 'ET');
  ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `580 ${rowY + 2} Td`, '(DESCRIPTION) Tj', 'ET');
  rowY -= 24;

  for (const item of items) {
    ops.push('0.08 0.11 0.16 rg', `40 ${rowY - 4} ${width - 80} 20 re`, 'f');
    ops.push('0.15 0.20 0.30 RG', '0.5 w', `40 ${rowY - 4} ${width - 80} 20 re`, 'S');

    ops.push('BT', '/F2 9 Tf', '1 1 1 rg', `50 ${rowY + 2} Td`, `(${escapePdf(item.name.slice(0, 32))}) Tj`, 'ET');
    ops.push('BT', '/F1 8 Tf', '0.4 0.8 1.0 rg', `220 ${rowY + 2} Td`, `(${item.kind.toUpperCase()}) Tj`, 'ET');
    ops.push('BT', '/F1 8 Tf', '0.5 0.8 0.6 rg', `320 ${rowY + 2} Td`, `(${escapePdf(((item.metadata?.technology as string) || 'N/A').slice(0, 20))}) Tj`, 'ET');
    ops.push('BT', '/F1 8 Tf', '0.7 0.7 0.8 rg', `460 ${rowY + 2} Td`, `(${escapePdf(((item.metadata?.owner as string) || 'Unassigned').slice(0, 18))}) Tj`, 'ET');
    ops.push('BT', '/F1 8 Tf', '0.6 0.65 0.75 rg', `580 ${rowY + 2} Td`, `(${escapePdf((item.description || '').slice(0, 45))}) Tj`, 'ET');

    rowY -= 22;
  }

  ops.push('Q');
  return ops.join('\n');
}

// ----------------------------------------------------------------------------
// 5. Architecture Decision Records (ADRs) Page
// ----------------------------------------------------------------------------
function buildAdrsPageStream(
  adrs: NonNullable<PdfExportOptions['adrs']>,
  opts: PageStreamOptions,
): string {
  const { width, height } = opts;
  const ops: string[] = [
    'q',
    '0.06 0.08 0.12 rg',
    `0 0 ${width} ${height} re`,
    'f',
  ];

  ops.push(...renderRunningHeaderAndFooter(opts, 'Architecture Decision Records'));

  ops.push('BT', '/F2 18 Tf', '1 1 1 rg', `40 ${height - 65} Td`, '(Architecture Decision Records) Tj', 'ET');
  ops.push('BT', '/F1 10 Tf', '0.6 0.7 0.85 rg', `40 ${height - 84} Td`, `(Auditable record of architectural design decisions, rationale, and consequences.) Tj`, 'ET');

  let cardY = height - 110;
  const cardH = 95;

  for (const adr of adrs.slice(0, 3)) {
    ops.push('0.09 0.13 0.20 rg', `40 ${cardY - cardH} ${width - 80} ${cardH} re`, 'f');
    ops.push('0.18 0.25 0.36 RG', '1 w', `40 ${cardY - cardH} ${width - 80} ${cardH} re`, 'S');

    // Title
    const adrHeading = adr.id ? `${adr.id}: ${adr.title}` : adr.title;
    ops.push('BT', '/F2 12 Tf', '1 1 1 rg', `55 ${cardY - 25} Td`, `(${escapePdf(adrHeading)}) Tj`, 'ET');

    // Status Pill
    const isApproved = adr.status === 'accepted';
    ops.push(isApproved ? '0.1 0.4 0.25 rg' : '0.4 0.25 0.1 rg', `${width - 150} ${cardY - 28} 95 18 re`, 'f');
    ops.push('BT', '/F2 8 Tf', '1 1 1 rg', `${width - 140} ${cardY - 22} Td`, `(${adr.status.toUpperCase()}) Tj`, 'ET');

    // Context & Decision
    ops.push('BT', '/F2 9 Tf', '0.4 0.7 1.0 rg', `55 ${cardY - 45} Td`, '(Context: ) Tj', 'ET');
    ops.push('BT', '/F1 9 Tf', '0.8 0.85 0.9 rg', `105 ${cardY - 45} Td`, `(${escapePdf(adr.context.slice(0, 110))}) Tj`, 'ET');

    ops.push('BT', '/F2 9 Tf', '0.4 0.7 1.0 rg', `55 ${cardY - 65} Td`, '(Decision: ) Tj', 'ET');
    ops.push('BT', '/F1 9 Tf', '0.8 0.85 0.9 rg', `105 ${cardY - 65} Td`, `(${escapePdf(adr.decision.slice(0, 110))}) Tj`, 'ET');

    if (adr.consequences) {
      ops.push('BT', '/F2 9 Tf', '0.4 0.7 1.0 rg', `55 ${cardY - 82} Td`, '(Consequences: ) Tj', 'ET');
      ops.push('BT', '/F1 9 Tf', '0.8 0.85 0.9 rg', `135 ${cardY - 82} Td`, `(${escapePdf(adr.consequences.slice(0, 100))}) Tj`, 'ET');
    }

    cardY -= cardH + 15;
  }

  ops.push('Q');
  return ops.join('\n');
}

// ----------------------------------------------------------------------------
// 6. Execution Flows Page
// ----------------------------------------------------------------------------
function buildFlowsPageStream(
  activeFlow: FlowWithSteps,
  model: ArchitectureModel,
  opts: PageStreamOptions,
): string {
  const { width, height } = opts;
  const ops: string[] = [
    'q',
    '0.06 0.08 0.12 rg',
    `0 0 ${width} ${height} re`,
    'f',
  ];

  ops.push(...renderRunningHeaderAndFooter(opts, `Execution Flows // ${activeFlow?.name || 'Sequence'}`));

  ops.push('BT', '/F2 18 Tf', '1 1 1 rg', `40 ${height - 65} Td`, `(${escapePdf(`Execution Flow: ${activeFlow?.name ?? 'System Transactions'}`)}) Tj`, 'ET');
  ops.push('BT', '/F1 10 Tf', '0.6 0.7 0.85 rg', `40 ${height - 84} Td`, `(${escapePdf(activeFlow?.description ?? 'Step-by-step transaction sequence across architectural services.')}) Tj`, 'ET');

  if (activeFlow && activeFlow.steps.length > 0) {
    let rowY = height - 120;
    ops.push('0.12 0.18 0.28 rg', `40 ${rowY - 5} ${width - 80} 22 re`, 'f');
    ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `50 ${rowY + 2} Td`, '(STEP) Tj', 'ET');
    ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `100 ${rowY + 2} Td`, '(SOURCE) Tj', 'ET');
    ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `260 ${rowY + 2} Td`, '(TARGET) Tj', 'ET');
    ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `420 ${rowY + 2} Td`, '(ENDPOINT / OPERATION) Tj', 'ET');
    ops.push('BT', '/F2 9 Tf', '0.7 0.85 1.0 rg', `620 ${rowY + 2} Td`, '(NOTE) Tj', 'ET');
    rowY -= 24;

    const connMap = new Map(model.connections.map((c) => [c.id, c]));
    const objMap = new Map(model.objects.map((o) => [o.id, o]));

    for (const step of activeFlow.steps.slice(0, 10)) {
      const conn = connMap.get(step.connectionId);
      const src = conn ? objMap.get(conn.sourceObjectId)?.name ?? 'Source' : 'Source';
      const tgt = conn ? objMap.get(conn.targetObjectId)?.name ?? 'Target' : 'Target';
      const action = step.endpoint || conn?.label || 'invokes';

      ops.push('0.08 0.11 0.16 rg', `40 ${rowY - 4} ${width - 80} 20 re`, 'f');
      ops.push('0.15 0.20 0.30 RG', '0.5 w', `40 ${rowY - 4} ${width - 80} 20 re`, 'S');

      const stepNum = typeof step.stepIndex === 'number' ? step.stepIndex + 1 : 1;
      ops.push('BT', '/F2 9 Tf', '0.3 0.8 1.0 rg', `50 ${rowY + 2} Td`, `(${stepNum}) Tj`, 'ET');
      ops.push('BT', '/F1 9 Tf', '1 1 1 rg', `100 ${rowY + 2} Td`, `(${escapePdf(src.slice(0, 20))}) Tj`, 'ET');
      ops.push('BT', '/F1 9 Tf', '1 1 1 rg', `260 ${rowY + 2} Td`, `(${escapePdf(tgt.slice(0, 20))}) Tj`, 'ET');
      ops.push('BT', '/F1 8 Tf', '0.5 0.9 0.7 rg', `420 ${rowY + 2} Td`, `(${escapePdf(action.slice(0, 28))}) Tj`, 'ET');
      ops.push('BT', '/F1 8 Tf', '0.6 0.7 0.8 rg', `620 ${rowY + 2} Td`, `(${escapePdf((step.note || '').slice(0, 30))}) Tj`, 'ET');

      rowY -= 22;
    }
  }

  ops.push('Q');
  return ops.join('\n');
}

// ============================================================================
// Multi-page PDF 1.4 Book Compiler
// ============================================================================

/**
 * Compiles a comprehensive multi-page architecture documentation and blueprint PDF.
 */
export function exportArchitecturePdfBook(
  model: ArchitectureModel,
  options?: PdfExportOptions,
  views?: View[],
): PdfBookResult {
  const format = options?.format ?? 'a4';
  const orientation = options?.orientation ?? 'landscape';
  const { width, height } = getPdfPageDimensions(format, orientation);

  const activeSections =
    options?.sections ??
    (['cover', 'overview', 'views', 'catalog', 'adrs', 'flows'] as PdfSectionId[]);

  // Collect view list
  const allViews = views ?? [];
  const selectedViews = options?.selectedViewIds
    ? allViews.filter((v) => options.selectedViewIds?.includes(v.id))
    : allViews.length > 0
    ? [allViews[0]!]
    : [];

  // Determine pages to generate
  const pageStreamBuilders: Array<(pageOpts: PageStreamOptions) => string> = [];

  if (activeSections.includes('cover')) {
    pageStreamBuilders.push((po) =>
      buildCoverPageStream(model, po, options?.customTitle, options?.author, options?.organization),
    );
  }

  if (activeSections.includes('overview')) {
    pageStreamBuilders.push((po) => buildOverviewPageStream(model, po));
  }

  if (activeSections.includes('views') && selectedViews.length > 0) {
    for (const v of selectedViews) {
      pageStreamBuilders.push((po) => buildViewPageStream(v, model, po));
    }
  }

  if (activeSections.includes('catalog')) {
    const pageSize = 12;
    const totalItems = model.objects.length;
    const chunkCount = Math.max(1, Math.ceil(totalItems / pageSize));
    for (let c = 0; c < chunkCount; c++) {
      const chunk = model.objects.slice(c * pageSize, (c + 1) * pageSize);
      pageStreamBuilders.push((po) => buildCatalogPageStream(chunk, po, c + 1, chunkCount));
    }
  }

  if (activeSections.includes('adrs') && options?.adrs && options.adrs.length > 0) {
    const adrPageSize = 3;
    const adrChunks = Math.ceil(options.adrs.length / adrPageSize);
    for (let c = 0; c < adrChunks; c++) {
      const chunk = options.adrs.slice(c * adrPageSize, (c + 1) * adrPageSize);
      pageStreamBuilders.push((po) => buildAdrsPageStream(chunk, po));
    }
  }

  if (activeSections.includes('flows') && options?.flows && options.flows.length > 0) {
    for (const f of options.flows) {
      pageStreamBuilders.push((po) => buildFlowsPageStream(f, model, po));
    }
  }

  // Ensure at least one page
  if (pageStreamBuilders.length === 0) {
    pageStreamBuilders.push((po) =>
      buildCoverPageStream(model, po, options?.customTitle, options?.author, options?.organization),
    );
  }

  const totalPages = pageStreamBuilders.length;
  const docTitle = options?.customTitle || model.architecture.name;

  // Generate page content streams
  const pageContents: string[] = [];
  pageStreamBuilders.forEach((builder, idx) => {
    const pageStream = builder({
      width,
      height,
      pageNumber: idx + 1,
      totalPages,
      docTitle,
      watermark: options?.watermark,
      includePageNumbers: options?.includePageNumbers,
    });
    pageContents.push(pageStream);
  });

  // Assemble PDF 1.4 Object Graph
  // Obj 1: Catalog
  // Obj 2: Pages Parent
  // Obj 3.. (3 + N - 1): Page Objects
  // Obj (3 + N).. (3 + 2N - 1): Content Streams
  // Obj (3 + 2N): Font F1 (Helvetica)
  // Obj (3 + 2N + 1): Font F2 (Helvetica-Bold)
  // Obj (3 + 2N + 2): Info dictionary

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    pageObjectIds.push(3 + i);
    contentObjectIds.push(3 + totalPages + i);
  }

  const fontF1Id = 3 + 2 * totalPages;
  const fontF2Id = fontF1Id + 1;
  const infoId = fontF2Id + 1;

  const pdfChunks: string[] = [];

  // Header with binary indicator comment
  pdfChunks.push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Track byte offsets for XREF
  const offsets: number[] = [0]; // Entry 0 is always free
  let currentOffset = pdfChunks[0]!.length;

  const appendObject = (objNum: number, body: string) => {
    offsets[objNum] = currentOffset;
    const chunk = `${objNum} 0 obj\n${body}\nendobj\n`;
    pdfChunks.push(chunk);
    currentOffset += chunk.length;
  };

  // Obj 1: Catalog
  appendObject(1, `<< /Type /Catalog /Pages 2 0 R >>`);

  // Obj 2: Pages
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  appendObject(2, `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`);

  // Page Objects
  for (let i = 0; i < totalPages; i++) {
    const pId = pageObjectIds[i]!;
    const cId = contentObjectIds[i]!;
    appendObject(
      pId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${cId} 0 R /Resources << /Font << /F1 ${fontF1Id} 0 R /F2 ${fontF2Id} 0 R >> >> >>`,
    );
  }

  // Content Stream Objects
  for (let i = 0; i < totalPages; i++) {
    const cId = contentObjectIds[i]!;
    const streamBody = pageContents[i]!;
    appendObject(
      cId,
      `<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream`,
    );
  }

  // Fonts
  appendObject(fontF1Id, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  appendObject(fontF2Id, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  // Info dictionary
  appendObject(
    infoId,
    `<< /Title (${escapePdf(docTitle)}) /Author (${escapePdf(options?.author || 'DiagramHQ')}) /Creator (DiagramHQ Architecture OS) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`,
  );

  // XREF table
  const startXref = currentOffset;
  const totalObjectsCount = infoId + 1;
  pdfChunks.push(`xref\n0 ${totalObjectsCount}\n`);
  pdfChunks.push('0000000000 65535 f \n');

  for (let i = 1; i < totalObjectsCount; i++) {
    const off = offsets[i] ?? 0;
    const padded = String(off).padStart(10, '0');
    pdfChunks.push(`${padded} 00000 n \n`);
  }

  // Trailer
  pdfChunks.push(
    `trailer\n<< /Size ${totalObjectsCount} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`,
  );

  const fullPdf = pdfChunks.join('');
  const byteSize = fullPdf.length;
  const checksum = computeContentChecksum(fullPdf);

  // Base64 Data URI
  let dataUri = '';
  if (typeof Buffer !== 'undefined') {
    dataUri = `data:application/pdf;base64,${Buffer.from(fullPdf).toString('base64')}`;
  } else if (typeof btoa !== 'undefined') {
    dataUri = `data:application/pdf;base64,${btoa(fullPdf)}`;
  }

  const cleanName = sanitizeFilename(docTitle);
  const filename = `${cleanName}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return {
    content: fullPdf,
    dataUri,
    filename,
    pageCount: totalPages,
    byteSize,
    sectionsIncluded: activeSections,
    dimensions: {
      width,
      height,
      format,
      orientation,
    },
    checksum,
  };
}

/**
 * Convenience helper to export a single view or documentation snippet to PDF.
 */
export function exportDocumentToPdf(
  title: string,
  model: ArchitectureModel,
  options?: PdfExportOptions,
  view?: View,
): PdfBookResult {
  return exportArchitecturePdfBook(
    model,
    {
      ...options,
      customTitle: title,
      selectedViewIds: view ? [view.id] : undefined,
    },
    view ? [view] : [],
  );
}
