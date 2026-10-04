import { test, expect } from '@playwright/test';

/**
 * Playwright E2E: Diagram Exports, Code Generation & Public Sharing Suite.
 *
 * Verifies:
 * 1. Multi-format Export modal: format switching (PNG, SVG, PDF, JSON) with live preview updates.
 * 2. Export configuration options: resolution scaling (1x, 2x, 4x), background themes, title overrides, and toggles.
 * 3. Mermaid.js Diagram-as-Code modal: flowchart & sequence script generation, copy to clipboard, and import tab.
 * 4. PlantUML Diagram-as-Code modal: C4 syntax generation (@startuml / @enduml), copy to clipboard, and import options.
 * 5. Public read-only Share Link modal: link generation with camera/selection preservation and expiration options.
 * 6. Diagram JSON export & Reset workflow: clearing canvas to empty state and restoring baseline architecture.
 */

test.describe('Diagram Exports, Code Generation & Sharing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('1. Multi-format export modal allows format switching with dynamic previews', async ({ page }) => {
    const exportBtn = page.locator('[data-testid="toggle-export-btn"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify modal container
    const modalContainer = page.locator('[data-testid="export-modal-container"]');
    await expect(modalContainer).toBeVisible();
    await expect(modalContainer).toContainText('Export Architecture Diagram');

    // Default format is PNG
    const filenameEl = page.locator('[data-testid="export-filename"]');
    await expect(filenameEl).toContainText('.png');

    // 1. Switch to SVG format
    const svgFormatBtn = page.locator('[data-testid="export-format-svg"]');
    await svgFormatBtn.click();
    await expect(filenameEl).toContainText('.svg');
    await expect(page.locator('[data-testid="export-svg-preview"]')).toBeVisible();

    // 2. Switch to PDF format
    const pdfFormatBtn = page.locator('[data-testid="export-format-pdf"]');
    await pdfFormatBtn.click();
    await expect(filenameEl).toContainText('.pdf');
    await expect(page.locator('[data-testid="export-pdf-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf-preview"]')).toContainText('PDF Document');

    // 3. Switch to JSON format
    const jsonFormatBtn = page.locator('[data-testid="export-format-json"]');
    await jsonFormatBtn.click();
    await expect(filenameEl).toContainText('.json');
    await expect(page.locator('[data-testid="export-json-preview"]')).toBeVisible();

    // Close modal
    const closeBtn = page.locator('[data-testid="export-close-btn"]');
    await closeBtn.click();
    await expect(modalContainer).not.toBeVisible();
  });

  test('2. Export configuration settings adjust resolution, theme, and title', async ({ page }) => {
    const exportBtn = page.locator('[data-testid="toggle-export-btn"]');
    await exportBtn.click();

    const modalContainer = page.locator('[data-testid="export-modal-container"]');
    await expect(modalContainer).toBeVisible();

    // Adjust scale to 4x
    const scale4xBtn = page.locator('[data-testid="export-scale-4x"]');
    await expect(scale4xBtn).toBeVisible();
    await scale4xBtn.click();
    await expect(page.locator('[data-testid="export-preview-pane"]')).toContainText('Scale: 4x');

    // Change background to transparent
    const themeTransparentBtn = page.locator('[data-testid="export-theme-transparent"]');
    await expect(themeTransparentBtn).toBeVisible();
    await themeTransparentBtn.click();

    // Title override input
    const titleInput = page.locator('[data-testid="export-title-input"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Core Banking Architecture');

    // Toggle metadata banner checkbox
    const metadataCheckbox = page.locator('[data-testid="export-metadata-checkbox"]');
    await expect(metadataCheckbox).toBeChecked();
    await metadataCheckbox.uncheck();
    await expect(metadataCheckbox).not.toBeChecked();

    // Verify download button label reflects active format
    const downloadBtn = page.locator('[data-testid="export-download-btn"]');
    await expect(downloadBtn).toHaveText('Download PNG');

    // Close modal
    const closeBtn = page.locator('[data-testid="export-close-btn"]');
    await closeBtn.click();
    await expect(modalContainer).not.toBeVisible();
  });

  test('3. Mermaid.js diagram-as-code modal generates flowchart and sequence scripts', async ({ page }) => {
    const mermaidBtn = page.locator('[data-testid="toggle-mermaid-btn"]');
    await expect(mermaidBtn).toBeVisible();
    await mermaidBtn.click();

    // Modal container
    const mermaidModal = page.locator('[data-testid="mermaid-modal"]');
    await expect(mermaidModal).toBeVisible();
    await expect(mermaidModal).toContainText('Mermaid.js Integration');

    // Output should contain flowchart syntax
    const outputArea = page.locator('[data-testid="mermaid-export-output"]');
    await expect(outputArea).toBeVisible();
    const scriptText = await outputArea.textContent();
    expect(scriptText).toContain('flowchart');

    // Switch to Sequence diagram mode
    const sequenceBtn = page.locator('[data-testid="export-sequence-btn"]');
    await sequenceBtn.click();
    await expect(outputArea).toContainText('sequenceDiagram');

    // Test copy script button
    const copyBtn = page.locator('[data-testid="copy-mermaid-btn"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toContainText('Copied to Clipboard!');

    // Switch to Import tab
    const importTab = page.locator('[data-testid="tab-import"]');
    await importTab.click();
    const importTextarea = page.locator('[data-testid="mermaid-import-textarea"]');
    await expect(importTextarea).toBeVisible();

    // Close modal
    const closeBtn = page.locator('[data-testid="mermaid-close-btn"]');
    await closeBtn.click();
    await expect(mermaidModal).not.toBeVisible();
  });

  test('4. PlantUML diagram-as-code modal generates C4 syntax and allows copying', async ({ page }) => {
    const plantumlBtn = page.locator('[data-testid="toggle-plantuml-btn"]');
    await expect(plantumlBtn).toBeVisible();
    await plantumlBtn.click();

    // Modal container
    const plantumlModal = page.locator('[data-testid="plantuml-modal"]');
    await expect(plantumlModal).toBeVisible();
    await expect(plantumlModal).toContainText('PlantUML Integration');

    // Output should contain @startuml and C4 constructs
    const outputArea = page.locator('[data-testid="plantuml-export-output"]');
    await expect(outputArea).toBeVisible();
    const scriptText = await outputArea.textContent();
    expect(scriptText).toContain('@startuml');
    expect(scriptText).toContain('@enduml');

    // Test copy script button
    const copyBtn = page.locator('[data-testid="copy-plantuml-btn"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toContainText('Copied to Clipboard!');

    // Close modal
    const closeBtn = page.locator('[data-testid="plantuml-close-btn"]');
    await closeBtn.click();
    await expect(plantumlModal).not.toBeVisible();
  });

  test('5. Public read-only share link modal generates URL with configuration options', async ({ page }) => {
    const shareBtn = page.locator('[data-testid="toggle-share-link-btn"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Modal container
    const shareModal = page.locator('[data-testid="share-link-modal"]');
    await expect(shareModal).toBeVisible();
    await expect(shareModal).toContainText('Share Diagram View');

    // Read-only link input
    const linkInput = page.locator('[data-testid="share-link-input"]');
    await expect(linkInput).toBeVisible();
    const linkValue = await linkInput.inputValue();
    expect(linkValue).toContain('https://diagramhq.com/share?');

    // Camera preservation option
    const cameraOpt = page.locator('[data-testid="share-opt-camera"]');
    await expect(cameraOpt).toBeChecked();

    // Expiry selector
    const expirySelect = page.locator('[data-testid="share-opt-expiry"]');
    await expect(expirySelect).toBeVisible();
    await expirySelect.selectOption('7d');

    // Copy button
    const copyBtn = page.locator('[data-testid="share-copy-button"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toContainText('Copied');

    // Close modal
    const closeBtn = page.locator('[data-testid="share-modal-close"]');
    await closeBtn.click();
    await expect(shareModal).not.toBeVisible();
  });

  test('6. Canvas clear reset action empties diagram and allows restoring baseline', async ({ page }) => {
    // Handle window confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Initial nodes present
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click Reset button in header
    const resetBtn = page.getByRole('button', { name: /Reset/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Canvas should now be empty and show empty state prompt
    await expect(page.getByText('Canvas is ready')).toBeVisible();
    await expect(page.getByRole('button', { name: /Load Reference Architecture/i })).toBeVisible();

    // Click "Load Reference Architecture" button to restore starter architecture
    await page.getByRole('button', { name: /Load Reference Architecture/i }).click();
    await page.waitForTimeout(300);

    // Nodes restored
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });
});
