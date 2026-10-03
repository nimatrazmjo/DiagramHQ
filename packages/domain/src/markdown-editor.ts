/**
 * DiagramHQ - Markdown Editor Domain Engine (F093)
 *
 * Model-first rich documentation authoring and embedding engine:
 * - Markdown parser & structure analyzer (`parseMarkdownDocument`):
 *   Extracts headings, Table of Contents, code blocks, markdown tables,
 *   images, links, entity mentions, and architecture embeds.
 * - Architecture Embed Directives:
 *   Embeds diagrams/views, model objects, execution flows, and ADRs
 *   seamlessly inside markdown with fenced syntax:
 *   ```diagram
 *   id: view-123
 *   title: "Order Flow"
 *   ```
 *   or inline directive `:::embed:diagram[view-123]{title="..."}:::`.
 * - Entity Mentions:
 *   Detects `@username` and architecture object mentions (`@Order Service` / `@object:obj-123`),
 *   linking document narrative directly to architecture entities.
 * - Validation & Grounding (`validateDocumentEmbeds`):
 *   Verifies embedded diagrams, objects, and flows against actual model entities,
 *   flagging broken references and orphaned embeds with helpful remediation hints.
 * - HTML Renderer (`renderMarkdownToHtml`):
 *   Compiles Markdown, rich text, tables, code blocks, images, mentions,
 *   and embedded architecture cards into clean semantic HTML.
 * - Document Comments:
 *   Attaches threaded comment conversations to documentation pages.
 */

import type {
  ArchitectureModel,
  ModelObject,
  View,
  Flow,
} from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import type { Comment, CommentAuthor } from './comments';
import { createId } from './ids';

// ============================================================================
// Core Types
// ============================================================================

export type EmbedKind = 'diagram' | 'object' | 'flow' | 'adr' | 'image';

export interface ArchitectureEmbed {
  readonly id: string;
  readonly kind: EmbedKind;
  readonly targetId: string;
  readonly title?: string;
  readonly caption?: string;
  readonly options?: Record<string, string | number | boolean>;
  readonly rawDirective: string;
  readonly isValid?: boolean;
  readonly validationMessage?: string;
}

export interface DocMention {
  readonly raw: string;
  readonly type: 'object' | 'user' | 'team';
  readonly handle: string;
  readonly resolvedId?: string;
  readonly resolvedName?: string;
}

export interface DocTocEntry {
  readonly level: number;
  readonly title: string;
  readonly slug: string;
}

export interface DocValidationIssue {
  readonly severity: 'error' | 'warning' | 'info';
  readonly embedKind?: EmbedKind;
  readonly targetId?: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ParsedMarkdownDocument {
  readonly title: string;
  readonly content: string;
  readonly toc: DocTocEntry[];
  readonly embeds: ArchitectureEmbed[];
  readonly mentions: DocMention[];
  readonly tablesCount: number;
  readonly codeBlocksCount: number;
  readonly imagesCount: number;
  readonly wordCount: number;
  readonly readingTimeMinutes: number;
  readonly validationIssues: DocValidationIssue[];
}

export interface MarkdownParserOptions {
  readonly defaultTitle?: string;
  readonly views?: View[];
  readonly flows?: Flow[];
  readonly adrs?: ArchitectureDecisionRecord[];
}

export interface CreateDiagramEmbedInput {
  readonly viewId: string;
  readonly title?: string;
  readonly caption?: string;
  readonly width?: string;
  readonly height?: string;
}

export interface CreateObjectEmbedInput {
  readonly objectId: string;
  readonly title?: string;
  readonly caption?: string;
}

export interface CreateFlowEmbedInput {
  readonly flowId: string;
  readonly title?: string;
  readonly caption?: string;
}

export interface CreateAdrEmbedInput {
  readonly adrId: string;
  readonly title?: string;
}

export interface MarkdownRenderContext {
  readonly views?: View[];
  readonly flows?: Flow[];
  readonly adrs?: ArchitectureDecisionRecord[];
  readonly baseUrl?: string;
}

export interface CreateDocCommentInput {
  readonly docId: string;
  readonly workspaceId: string;
  readonly content: string;
  readonly author: CommentAuthor;
  readonly parentCommentId?: string | null;
  readonly lineNumber?: number;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export function slugifyHeading(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'heading';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// Directive Builders
// ============================================================================

export function createDiagramEmbedDirective(input: CreateDiagramEmbedInput): string {
  const lines = ['```diagram', `id: ${input.viewId}`];
  if (input.title) lines.push(`title: ${input.title}`);
  if (input.caption) lines.push(`caption: ${input.caption}`);
  if (input.width) lines.push(`width: ${input.width}`);
  if (input.height) lines.push(`height: ${input.height}`);
  lines.push('```');
  return lines.join('\n');
}

export function createObjectEmbedDirective(input: CreateObjectEmbedInput): string {
  const lines = ['```object', `id: ${input.objectId}`];
  if (input.title) lines.push(`title: ${input.title}`);
  if (input.caption) lines.push(`caption: ${input.caption}`);
  lines.push('```');
  return lines.join('\n');
}

export function createFlowEmbedDirective(input: CreateFlowEmbedInput): string {
  const lines = ['```flow', `id: ${input.flowId}`];
  if (input.title) lines.push(`title: ${input.title}`);
  if (input.caption) lines.push(`caption: ${input.caption}`);
  lines.push('```');
  return lines.join('\n');
}

export function createAdrEmbedDirective(input: CreateAdrEmbedInput): string {
  const lines = ['```adr', `id: ${input.adrId}`];
  if (input.title) lines.push(`title: ${input.title}`);
  lines.push('```');
  return lines.join('\n');
}

export function insertTableMarkdown(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const r of rows) {
      const cell = r[i] || '';
      if (cell.length > max) max = cell.length;
    }
    return Math.max(max, 3);
  });

  const headerRow = `| ${headers.map((h, i) => h.padEnd(colWidths[i] ?? 3)).join(' | ')} |`;
  const separatorRow = `| ${colWidths.map((w) => ':'.padEnd(w, '-')).join(' | ')} |`;
  const bodyRows = rows.map(
    (row) =>
      `| ${headers.map((_, i) => (row[i] || '').padEnd(colWidths[i] ?? 3)).join(' | ')} |`,
  );

  return [headerRow, separatorRow, ...bodyRows].join('\n');
}

export function insertCodeBlockMarkdown(language: string, code: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function insertImageMarkdown(alt: string, url: string, caption?: string): string {
  if (caption) {
    return `![${alt}](${url} "${caption}")`;
  }
  return `![${alt}](${url})`;
}

// ============================================================================
// Markdown Parser & Structure Analyzer
// ============================================================================

/**
 * Parses a markdown document, extracting headings, Table of Contents,
 * architecture embeds (diagrams, objects, flows, ADRs), mentions, tables,
 * and validates embedded references against the model.
 */
export function parseMarkdownDocument(
  content: string,
  model?: ArchitectureModel,
  options?: MarkdownParserOptions,
): ParsedMarkdownDocument {
  const lines = content.split(/\r?\n/);
  const toc: DocTocEntry[] = [];
  const embeds: ArchitectureEmbed[] = [];
  const mentions: DocMention[] = [];
  const validationIssues: DocValidationIssue[] = [];

  let title = options?.defaultTitle || 'Untitled Architecture Document';
  let firstHeadingFound = false;
  let tablesCount = 0;
  let codeBlocksCount = 0;
  let imagesCount = 0;

  let inCodeBlock = false;
  let currentCodeBlockLang = '';
  let currentCodeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.trim();

    // Check for code block boundary
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentCodeBlockLang = line.replace(/^```/, '').trim().toLowerCase();
        currentCodeBlockLines = [];
      } else {
        inCodeBlock = false;
        // Process code block
        const blockContent = currentCodeBlockLines.join('\n');
        const rawDirective = `\`\`\`${currentCodeBlockLang}\n${blockContent}\n\`\`\``;

        if (
          currentCodeBlockLang === 'diagram' ||
          currentCodeBlockLang === 'object' ||
          currentCodeBlockLang === 'flow' ||
          currentCodeBlockLang === 'adr'
        ) {
          const parsed = parseEmbedDirective(currentCodeBlockLang, blockContent, rawDirective);
          if (parsed) {
            embeds.push(parsed);
          }
        } else {
          codeBlocksCount++;
        }
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeBlockLines.push(rawLine);
      continue;
    }

    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const slug = slugifyHeading(headingText);

      if (!firstHeadingFound && level === 1) {
        title = headingText;
        firstHeadingFound = true;
      }

      toc.push({ level, title: headingText, slug });
      continue;
    }

    // Check for inline embed directives :::embed:diagram[view-123]{title="..."}:::
    const inlineDirectiveMatch = line.match(/:::embed:([a-z]+)\[([^\]]+)\](?:\s*\{([^}]*)\})?:::/);
    if (inlineDirectiveMatch && inlineDirectiveMatch[1] && inlineDirectiveMatch[2]) {
      const kind = inlineDirectiveMatch[1] as EmbedKind;
      const targetId = inlineDirectiveMatch[2].trim();
      const rawOpts = inlineDirectiveMatch[3] || '';
      const opts: Record<string, string> = {};

      const optPairs = rawOpts.matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g);
      for (const p of optPairs) {
        if (p[1] && p[2] !== undefined) {
          opts[p[1]] = p[2];
        }
      }

      embeds.push({
        id: `embed-${embeds.length + 1}`,
        kind,
        targetId,
        title: opts['title'],
        caption: opts['caption'],
        options: opts,
        rawDirective: line,
      });
      continue;
    }

    // Check for table separator row (| :--- | :--- |)
    if (line.startsWith('|') && line.endsWith('|') && /\|(?:\s*:?-+:?\s*\|)+/.test(line)) {
      tablesCount++;
    }

    // Check for images ![alt](url)
    const imgMatches = line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
    for (const match of imgMatches) {
      if (match[2]) {
        imagesCount++;
        embeds.push({
          id: `img-${embeds.length + 1}`,
          kind: 'image',
          targetId: match[2].split(' ')[0] || '',
          title: match[1] || undefined,
          rawDirective: match[0],
        });
      }
    }

    // Check for mentions @[Entity Name] or @username
    const objectBracketMentions = line.matchAll(/@\[([^\]]+)\]/g);
    for (const match of objectBracketMentions) {
      if (match[1]) {
        mentions.push({
          raw: match[0],
          type: 'object',
          handle: match[1],
        });
      }
    }

    const standardMentions = line.matchAll(/(?:^|\s)@([a-zA-Z0-9_-]+)/g);
    for (const match of standardMentions) {
      if (match[1]) {
        mentions.push({
          raw: match[0].trim(),
          type: match[1].startsWith('obj_') || match[1].startsWith('service') ? 'object' : 'user',
          handle: match[1],
        });
      }
    }
  }

  // Validate embeds if model is provided
  if (model) {
    const objectMap = new Map<string, ModelObject>();
    for (const obj of model.objects) {
      objectMap.set(obj.id, obj);
      objectMap.set(obj.name.toLowerCase(), obj);
    }

    const viewSet = new Set<string>();
    if (options?.views) {
      for (const v of options.views) {
        viewSet.add(v.id);
        viewSet.add(v.name.toLowerCase());
      }
    }

    const flowSet = new Set<string>();
    if (options?.flows) {
      for (const f of options.flows) {
        flowSet.add(f.id);
        flowSet.add(f.name.toLowerCase());
      }
    }

    const adrSet = new Set<string>();
    if (options?.adrs) {
      for (const a of options.adrs) {
        adrSet.add(a.id);
        adrSet.add(String(a.number));
      }
    }

    for (let i = 0; i < embeds.length; i++) {
      const embed = embeds[i];
      if (!embed) continue;

      if (embed.kind === 'diagram') {
        const targetClean = embed.targetId.toLowerCase();
        const exists = viewSet.has(embed.targetId) || viewSet.has(targetClean);
        if (!exists && viewSet.size > 0) {
          validationIssues.push({
            severity: 'warning',
            embedKind: 'diagram',
            targetId: embed.targetId,
            message: `Embedded diagram view '${embed.targetId}' was not found in the architecture view registry.`,
            suggestion: 'Verify the view ID or choose an active view from the diagrams list.',
          });
        }
      } else if (embed.kind === 'object') {
        const targetClean = embed.targetId.toLowerCase();
        const exists = objectMap.has(embed.targetId) || objectMap.has(targetClean);
        if (!exists) {
          validationIssues.push({
            severity: 'error',
            embedKind: 'object',
            targetId: embed.targetId,
            message: `Embedded architecture object '${embed.targetId}' does not exist in model.`,
            suggestion: 'Update object reference to a valid entity ID or object name.',
          });
        }
      } else if (embed.kind === 'flow') {
        const targetClean = embed.targetId.toLowerCase();
        const exists = flowSet.has(embed.targetId) || flowSet.has(targetClean);
        if (!exists && flowSet.size > 0) {
          validationIssues.push({
            severity: 'warning',
            embedKind: 'flow',
            targetId: embed.targetId,
            message: `Embedded execution flow '${embed.targetId}' does not exist in model flows.`,
            suggestion: 'Verify flow ID.',
          });
        }
      } else if (embed.kind === 'adr') {
        const exists = adrSet.has(embed.targetId);
        if (!exists && adrSet.size > 0) {
          validationIssues.push({
            severity: 'info',
            embedKind: 'adr',
            targetId: embed.targetId,
            message: `Embedded ADR '${embed.targetId}' not found.`,
          });
        }
      }
    }
  }

  // Word count and estimated reading time
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title,
    content,
    toc,
    embeds,
    mentions,
    tablesCount,
    codeBlocksCount,
    imagesCount,
    wordCount,
    readingTimeMinutes,
    validationIssues,
  };
}

function parseEmbedDirective(
  kind: EmbedKind,
  rawContent: string,
  rawDirective: string,
): ArchitectureEmbed | null {
  const lines = rawContent.split('\n');
  let targetId = '';
  let title: string | undefined = undefined;
  let caption: string | undefined = undefined;
  const options: Record<string, string | number | boolean> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('id:')) {
      targetId = trimmed.replace(/^id:\s*/, '').replace(/["']/g, '').trim();
    } else if (trimmed.startsWith('title:')) {
      title = trimmed.replace(/^title:\s*/, '').replace(/["']/g, '').trim();
    } else if (trimmed.startsWith('caption:')) {
      caption = trimmed.replace(/^caption:\s*/, '').replace(/["']/g, '').trim();
    } else {
      const kv = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
      if (kv && kv[1] && kv[2]) {
        options[kv[1]] = kv[2].replace(/["']/g, '');
      }
    }
  }

  if (!targetId) return null;

  return {
    id: `embed-${kind}-${targetId}`,
    kind,
    targetId,
    title,
    caption,
    options,
    rawDirective,
  };
}

// ============================================================================
// HTML Semantic Renderer
// ============================================================================

/**
 * Renders Markdown document into clean, semantic HTML,
 * replacing embedded architecture directives with visual preview cards,
 * tables, syntax-highlighted code blocks, and badges.
 */
export function renderMarkdownToHtml(
  markdown: string,
  model?: ArchitectureModel,
  context?: MarkdownRenderContext,
): string {
  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (!inTable || tableRows.length === 0) return;
    const headerRow = tableRows[0] || [];
    const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => cell.includes('---') || cell.includes(':--')));

    let tableHtml = '<div class="doc-table-wrapper"><table class="doc-table"><thead><tr>';
    for (const h of headerRow) {
      tableHtml += `<th>${escapeHtml(h.trim())}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (const r of bodyRows) {
      tableHtml += '<tr>';
      for (const cell of r) {
        tableHtml += `<td>${formatInlineTypography(cell.trim())}</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table></div>';
    htmlParts.push(tableHtml);
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.trim();

    // Code block toggle
    if (line.startsWith('```')) {
      flushTable();
      if (!inCode) {
        inCode = true;
        codeLang = line.replace(/^```/, '').trim().toLowerCase();
        codeLines = [];
      } else {
        inCode = false;
        const blockContent = codeLines.join('\n');
        const rawDirective = `\`\`\`${codeLang}\n${blockContent}\n\`\`\``;

        if (
          codeLang === 'diagram' ||
          codeLang === 'object' ||
          codeLang === 'flow' ||
          codeLang === 'adr'
        ) {
          const embed = parseEmbedDirective(codeLang, blockContent, rawDirective);
          if (embed) {
            htmlParts.push(renderEmbedHtml(embed, model, context));
          }
        } else {
          htmlParts.push(
            `<pre class="doc-code-block"><code class="language-${escapeHtml(codeLang)}">${escapeHtml(blockContent)}</code></pre>`,
          );
        }
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    // Table rows
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Blank line
    if (!line) {
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const slug = slugifyHeading(text);
      htmlParts.push(`<h${level} id="${slug}">${formatInlineTypography(text)}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '');
      htmlParts.push(`<blockquote><p>${formatInlineTypography(quoteText)}</p></blockquote>`);
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.replace(/^[-*]\s+/, '');
      htmlParts.push(`<li class="doc-list-item">${formatInlineTypography(itemText)}</li>`);
      continue;
    }

    // Ordered List
    const ordMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordMatch && ordMatch[2]) {
      htmlParts.push(`<li class="doc-ordered-item">${formatInlineTypography(ordMatch[2])}</li>`);
      continue;
    }

    // Image (![alt](url))
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)$/);
    if (imgMatch && imgMatch[2]) {
      const alt = imgMatch[1] || '';
      const src = imgMatch[2].trim();
      const caption = imgMatch[3];
      let imgHtml = `<figure class="doc-image-figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
      if (caption) {
        imgHtml += `<figcaption>${escapeHtml(caption)}</figcaption>`;
      }
      imgHtml += '</figure>';
      htmlParts.push(imgHtml);
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p>${formatInlineTypography(line)}</p>`);
  }

  flushTable();
  return htmlParts.join('\n');
}

/**
 * Formats inline typography (bold, italic, code, links, mentions).
 */
export function formatInlineTypography(text: string): string {
  let res = escapeHtml(text);

  // Inline code: `code`
  res = res.replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>');

  // Bold: **text** or __text__
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links: [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="doc-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Object mentions @[Object Name]
  res = res.replace(/@\[([^\]]+)\]/g, '<span class="doc-mention doc-mention-object">@$1</span>');

  // User mentions @username
  res = res.replace(/(?:^|\s)@([a-zA-Z0-9_-]+)/g, ' <span class="doc-mention doc-mention-user">@$1</span>');

  return res;
}

/**
 * Renders an embedded diagram/view or object into an interactive HTML visual card.
 */
function renderEmbedHtml(
  embed: ArchitectureEmbed,
  model?: ArchitectureModel,
  context?: MarkdownRenderContext,
): string {
  if (embed.kind === 'diagram') {
    const view = context?.views?.find((v) => v.id === embed.targetId || v.name === embed.targetId);
    const viewTitle = embed.title || view?.name || `Diagram: ${embed.targetId}`;
    const viewKind = view?.kind || 'view';

    return [
      `<div class="doc-embed doc-embed-diagram" data-embed-id="${escapeHtml(embed.id)}" data-view-id="${escapeHtml(embed.targetId)}">`,
      '  <div class="doc-embed-header">',
      '    <div class="doc-embed-badge">DIAGRAM VIEW</div>',
      `    <span class="doc-embed-title">${escapeHtml(viewTitle)}</span>`,
      `    <span class="doc-embed-kind">${escapeHtml(viewKind.toUpperCase())}</span>`,
      '  </div>',
      embed.caption ? `  <div class="doc-embed-caption">${escapeHtml(embed.caption)}</div>` : '',
      '  <div class="doc-embed-canvas-preview">',
      `    <span class="doc-embed-placeholder-text">Interactive canvas projection of [${escapeHtml(viewTitle)}]</span>`,
      `    <button class="doc-embed-open-btn" data-target-view="${escapeHtml(embed.targetId)}">Open Diagram in Studio →</button>`,
      '  </div>',
      '</div>',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (embed.kind === 'object') {
    const obj = model?.objects.find((o) => o.id === embed.targetId || o.name.toLowerCase() === embed.targetId.toLowerCase());
    const objName = embed.title || obj?.name || embed.targetId;
    const objKind = obj?.kind || 'system';
    const raw = (obj?.metadata || {}) as Record<string, unknown>;
    const tech = raw['technology'] ? String(raw['technology']) : undefined;

    return [
      `<div class="doc-embed doc-embed-object" data-object-id="${escapeHtml(embed.targetId)}">`,
      '  <div class="doc-embed-header">',
      `    <span class="doc-embed-kind-pill">${escapeHtml(objKind.toUpperCase())}</span>`,
      `    <strong class="doc-embed-title">${escapeHtml(objName)}</strong>`,
      tech ? `    <span class="doc-embed-tech">${escapeHtml(tech)}</span>` : '',
      '  </div>',
      obj?.description ? `  <p class="doc-embed-desc">${escapeHtml(obj.description)}</p>` : '',
      '</div>',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (embed.kind === 'flow') {
    const flow = context?.flows?.find((f) => f.id === embed.targetId || f.name === embed.targetId);
    const flowName = embed.title || flow?.name || `Flow: ${embed.targetId}`;

    return [
      `<div class="doc-embed doc-embed-flow" data-flow-id="${escapeHtml(embed.targetId)}">`,
      '  <div class="doc-embed-header">',
      '    <div class="doc-embed-badge">EXECUTION FLOW</div>',
      `    <strong class="doc-embed-title">${escapeHtml(flowName)}</strong>`,
      '  </div>',
      flow?.description ? `  <p class="doc-embed-desc">${escapeHtml(flow.description)}</p>` : '',
      '</div>',
    ].join('\n');
  }

  if (embed.kind === 'adr') {
    const adr = context?.adrs?.find((a) => a.id === embed.targetId || String(a.number) === embed.targetId);
    const adrTitle = embed.title || adr?.title || `ADR: ${embed.targetId}`;
    const status = adr?.status || 'accepted';

    return [
      `<div class="doc-embed doc-embed-adr" data-adr-id="${escapeHtml(embed.targetId)}">`,
      '  <div class="doc-embed-header">',
      '    <div class="doc-embed-badge">DECISION RECORD</div>',
      `    <strong class="doc-embed-title">${escapeHtml(adrTitle)}</strong>`,
      `    <span class="doc-embed-status">${escapeHtml(status.toUpperCase())}</span>`,
      '  </div>',
      '</div>',
    ].join('\n');
  }

  return `<div class="doc-embed doc-embed-generic">${escapeHtml(embed.rawDirective)}</div>`;
}

// ============================================================================
// Document Comments Support
// ============================================================================

export function addDocumentComment(
  comments: Comment[],
  input: CreateDocCommentInput,
): Comment[] {
  const newComment: Comment = {
    id: createId('cmt'),
    workspaceId: input.workspaceId,
    targetType: 'doc',
    targetId: input.docId,
    author: input.author,
    content: input.content,
    parentCommentId: input.parentCommentId || null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return [...comments, newComment];
}

export function resolveDocumentComment(
  comments: Comment[],
  commentId: string,
  resolver: CommentAuthor,
): Comment[] {
  return comments.map((c) => {
    if (c.id === commentId) {
      return {
        ...c,
        resolved: true,
        resolvedBy: resolver,
        resolvedAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    return c;
  });
}
