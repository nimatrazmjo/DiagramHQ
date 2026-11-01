export interface DynamicNodeDimensionsInput {
  label?: string;
  description?: string;
  systemType?: string;
  domain?: string;
  technology?: string;
  runtime?: string;
  status?: string;
  port?: string | number;
  kind?: string;
  fontSize?: number;
  labelFontSize?: number;
  descriptionFontSize?: number;
  paddingY?: number;
  paddingX?: number;
  hasHeader?: boolean;
  hasFooter?: boolean;
  badgesCount?: number;
  extraLines?: number;
  nodeType?: string;
  [key: string]: unknown;
}

export interface DynamicNodeDimensions {
  minWidth: number;
  minHeight: number;
}

/**
 * Calculates dynamic minimum width and height for canvas nodes based on
 * text content (label, description, domain, badges) and font size.
 *
 * Ensures nodes never clip or overflow text regardless of content length
 * or typography settings.
 */
export function calculateDynamicNodeDimensions(
  input: DynamicNodeDimensionsInput = {},
  nodeType?: string,
): DynamicNodeDimensions {
  const label = typeof input.label === 'string' ? input.label : '';
  const description =
    typeof input.description === 'string' && input.description.trim().length > 0
      ? input.description.trim()
      : undefined;
  const domain =
    typeof input.domain === 'string' && input.domain.trim().length > 0
      ? input.domain.trim()
      : undefined;
  const systemType =
    typeof input.systemType === 'string' && input.systemType.trim().length > 0
      ? input.systemType.trim()
      : undefined;

  // Font sizes: support custom fontSize from nodeData or style
  const customFontSize =
    typeof input.fontSize === 'number' && input.fontSize > 0
      ? input.fontSize
      : typeof input.labelFontSize === 'number' && input.labelFontSize > 0
      ? input.labelFontSize
      : undefined;

  // Default font size: 18px for system/c4Context, 16px for others
  const effectiveLabelFontSize =
    customFontSize ?? (nodeType === 'system' || nodeType === 'c4Context' ? 18 : 16);
  const effectiveDescFontSize =
    typeof input.descriptionFontSize === 'number' && input.descriptionFontSize > 0
      ? input.descriptionFontSize
      : 11;

  // Vertical and horizontal padding
  const paddingY = typeof input.paddingY === 'number' ? input.paddingY : 24; // p-3: 12px top + 12px bottom
  const paddingX = typeof input.paddingX === 'number' ? input.paddingX : 24;

  // Header height (Icon + badge + spacing)
  const hasHeader = input.hasHeader !== false;
  const headerHeight = hasHeader ? 28 : 0;

  // Label height (handles multiline labels when long or with newlines)
  const labelLineHeight = Math.round(effectiveLabelFontSize * 1.35);
  const explicitLabelLines = label.split(/\r?\n/).length;
  // Estimate wrapping: inside ~180px text area, 1 line fits ~180 / (fontSize * 0.58) chars
  const charsPerLabelLine = Math.max(10, Math.floor(180 / (effectiveLabelFontSize * 0.58)));
  const estimatedWrappedLines = label.length > 0 ? Math.ceil(label.length / charsPerLabelLine) : 1;
  const labelLines = Math.max(explicitLabelLines, estimatedWrappedLines);
  const labelHeight = labelLines * labelLineHeight;

  // Description height (handles multiple lines and larger font sizes)
  let descHeight = 0;
  if (description) {
    const descLineHeight = Math.round(effectiveDescFontSize * 1.35);
    const explicitDescLines = description.split(/\r?\n/).length;
    // Inside ~180px text area at 11px, fits ~28-30 chars per line
    const charsPerDescLine = Math.max(14, Math.floor(180 / (effectiveDescFontSize * 0.55)));
    const estimatedDescLines = Math.ceil(description.length / charsPerDescLine);
    const descLines = Math.max(explicitDescLines, estimatedDescLines);
    // 4px top margin (mt-1) + lines
    descHeight = 4 + descLines * descLineHeight;
  }

  // Footer / Bottom Bar (e.g. "External System", "Person", domain tag)
  const hasFooter = input.hasFooter !== false;
  let footerHeight = 0;
  if (hasFooter) {
    footerHeight = 24; // text-[11px] + pt-1 (4px) + margin (4px)
    if (domain) {
      footerHeight += 16; // [Domain: ...] line
    }
  }

  // Active badges (security, technology, flow, data overlays)
  const badgeRows = typeof input.badgesCount === 'number' ? input.badgesCount : 0;
  const badgesHeight = badgeRows * 20;

  // Internal breathing room between flex sections
  const verticalSpacing = 8;

  const minHeight = Math.round(
    paddingY + headerHeight + labelHeight + descHeight + footerHeight + badgesHeight + verticalSpacing,
  );

  // Width requirements:
  // 1. Header: icon (20px) + gap (8px) + badge text + padding
  const badgeLen = Math.max(
    (systemType?.length ?? 11) + 2, // [Third-Party] = 13
    typeof input.status === 'string' ? input.status.length : 0,
  );
  const headerNeededWidth = hasHeader ? 20 + 8 + badgeLen * 7.5 + paddingX : 140;

  // 2. Longest word width (prevents overflow on long words)
  const words = label.split(/\s+/);
  const longestWordLen = words.reduce((max, w) => Math.max(max, w.length), 0);
  const wordNeededWidth = Math.round(longestWordLen * effectiveLabelFontSize * 0.65 + paddingX + 16);

  // 3. Minimum base width
  const minWidth = Math.max(160, headerNeededWidth, wordNeededWidth);

  return {
    minWidth: Math.round(minWidth),
    minHeight: Math.round(minHeight),
  };
}
