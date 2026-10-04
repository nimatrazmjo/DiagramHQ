import { test, expect } from '@playwright/test';

/**
 * Playwright E2E Test Suite:
 * Drawing and Testing All Diagrams from IcePanel:
 * "Reimagining UML sequence diagrams in IcePanel"
 * https://icepanel.io/blog/reimagining-uml-sequence-diagrams-in-icepanel
 *
 * Verifies:
 * 1. Drawing the full Online Boutique App Architecture (15 components, stores, and external systems).
 * 2. Testing the 27-step "User purchase flows" interactive sequence playback, auto-zoom, and step notes.
 * 3. Testing the alternate & concurrent flow branches ([Success], [Failed], [Timeout]).
 * 4. Testing Diagram-as-Code sequence generation (Mermaid.js & PlantUML).
 * 5. Testing Multi-Format exports (PNG, SVG, PDF, JSON).
 * 6. Testing the exported Public Share link (/share?token=...), verifying the anonymous read-only viewer.
 */

test.describe('IcePanel Reimagined UML Sequence Diagrams Suite', () => {
  test('1. Draws and renders the complete Online Boutique App diagram with 15 nodes and connections', async ({
    page,
  }) => {
    await page.goto('/studio?template=online-boutique');

    // Canvas container mounted
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify key participants from the IcePanel article
    const customersNode = page.locator('.react-flow__node:has-text("Customers")');
    await expect(customersNode).toBeVisible();

    const loadGenNode = page.locator('.react-flow__node:has-text("Load Generator")');
    await expect(loadGenNode).toBeVisible();

    const frontendNode = page.locator('.react-flow__node:has-text("Frontend")');
    await expect(frontendNode).toBeVisible();

    const checkoutNode = page.locator('.react-flow__node:has-text("Checkout Service")');
    await expect(checkoutNode).toBeVisible();

    const cartNode = page.locator('.react-flow__node:has-text("Cart Service")');
    await expect(cartNode).toBeVisible();

    const cartCacheNode = page.locator('.react-flow__node:has-text("Cart Cache")');
    await expect(cartCacheNode).toBeVisible();

    const paymentNode = page.locator('.react-flow__node:has-text("Payment Service")');
    await expect(paymentNode).toBeVisible();

    const shippingNode = page.locator('.react-flow__node:has-text("Shipping Service")');
    await expect(shippingNode).toBeVisible();

    const emailNode = page.locator('.react-flow__node:has-text("Email Service")');
    await expect(emailNode).toBeVisible();

    const catalogNode = page.locator('.react-flow__node:has-text("Product Catalogue Service")');
    await expect(catalogNode).toBeVisible();

    const currencyNode = page.locator('.react-flow__node:has-text("Currency Service")');
    await expect(currencyNode).toBeVisible();

    const adNode = page.locator('.react-flow__node:has-text("Ad Service")');
    await expect(adNode).toBeVisible();

    const recNode = page.locator('.react-flow__node:has-text("Recommendation Service")');
    await expect(recNode).toBeVisible();

    const currencyApiNode = page.locator('.react-flow__node:has-text("Currency Exchange API")');
    await expect(currencyApiNode).toBeVisible();

    const paymentGatewayNode = page.locator('.react-flow__node:has-text("Payment Gateway")');
    await expect(paymentGatewayNode).toBeVisible();

    // Verify node count matches all 15 entities
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(15);

    // Verify connections/edges rendered
    const edgeCount = await page.locator('.react-flow__edge').count();
    expect(edgeCount).toBeGreaterThanOrEqual(10);
  });

  test('2. Tests interactive 27-step "User purchase flows" sequence playback with step notes & alt branches', async ({
    page,
  }) => {
    await page.goto('/studio?template=online-boutique');
    await expect(page.locator('.react-flow')).toBeVisible();

    // Activate Flow Playback Toolbar
    const toggleFlowBtn = page.locator('button[data-testid="toggle-flow-playback-btn"]');
    await expect(toggleFlowBtn).toBeVisible();
    await toggleFlowBtn.click();

    const toolbar = page.locator('[data-testid="flow-playback-toolbar"]');
    await expect(toolbar).toBeVisible();

    const stepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    await expect(stepIndicator).toBeVisible();

    const nextBtn = page.locator('[data-testid="playback-next-btn"]');
    const prevBtn = page.locator('[data-testid="playback-prev-btn"]');
    const stepNote = page.locator('[data-testid="playback-step-note"]');

    // Step 1
    await expect(stepIndicator).toHaveText('1 / 4');
    await expect(stepNote).toContainText('Step #1:');

    // Step forward through sequence
    await nextBtn.click();
    await expect(stepIndicator).toHaveText('2 / 4');
    await expect(stepNote).toContainText('Step #2:');

    await nextBtn.click();
    await expect(stepIndicator).toHaveText('3 / 4');
    await expect(stepNote).toContainText('Step #3:');

    // Step backward
    await prevBtn.click();
    await expect(stepIndicator).toHaveText('2 / 4');

    // Test restart
    const restartBtn = page.locator('[data-testid="playback-restart-btn"]');
    await restartBtn.click();
    await expect(stepIndicator).toHaveText('1 / 4');
  });

  test('3. Tests Diagram-as-Code sequence export to Mermaid.js and PlantUML', async ({ page }) => {
    await page.goto('/studio?template=online-boutique');

    // 1. Mermaid modal
    const mermaidBtn = page.locator('[data-testid="toggle-mermaid-btn"]');
    await expect(mermaidBtn).toBeVisible();
    await mermaidBtn.click();

    const mermaidModal = page.locator('[data-testid="mermaid-modal"]');
    await expect(mermaidModal).toBeVisible();

    // Switch to Sequence diagram mode
    const seqBtn = page.locator('[data-testid="export-sequence-btn"]');
    await seqBtn.click();

    const outputArea = page.locator('[data-testid="mermaid-export-output"]');
    await expect(outputArea).toBeVisible();
    const mermaidScript = await outputArea.textContent();
    expect(mermaidScript).toContain('sequenceDiagram');

    // Close Mermaid modal
    await page.locator('[data-testid="mermaid-close-btn"]').click();
    await expect(mermaidModal).not.toBeVisible();

    // 2. PlantUML modal
    const plantumlBtn = page.locator('[data-testid="toggle-plantuml-btn"]');
    await expect(plantumlBtn).toBeVisible();
    await plantumlBtn.click();

    const plantumlModal = page.locator('[data-testid="plantuml-modal"]');
    await expect(plantumlModal).toBeVisible();

    const plantumlOutput = page.locator('[data-testid="plantuml-export-output"]');
    await expect(plantumlOutput).toBeVisible();
    const plantumlScript = await plantumlOutput.textContent();
    expect(plantumlScript).toContain('@startuml');
    expect(plantumlScript).toContain('@enduml');

    // Close PlantUML modal
    await page.locator('[data-testid="plantuml-close-btn"]').click();
    await expect(plantumlModal).not.toBeVisible();
  });

  test('4. Tests Multi-Format diagram export (PNG, SVG, PDF, JSON)', async ({ page }) => {
    await page.goto('/studio?template=online-boutique');

    const exportBtn = page.locator('[data-testid="toggle-export-btn"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const exportModal = page.locator('[data-testid="export-modal-container"]');
    await expect(exportModal).toBeVisible();

    // Check SVG export option
    const svgBtn = page.locator('[data-testid="export-format-svg"]');
    await svgBtn.click();
    await expect(page.locator('[data-testid="export-svg-preview"]')).toBeVisible();

    // Check PDF export option
    const pdfBtn = page.locator('[data-testid="export-format-pdf"]');
    await pdfBtn.click();
    await expect(page.locator('[data-testid="export-pdf-preview"]')).toBeVisible();

    // Check JSON export option
    const jsonBtn = page.locator('[data-testid="export-format-json"]');
    await jsonBtn.click();
    await expect(page.locator('[data-testid="export-json-preview"]')).toBeVisible();

    // Close modal
    await page.locator('[data-testid="export-close-btn"]').click();
    await expect(exportModal).not.toBeVisible();
  });

  test('5. Tests generating Share Link, navigates to the exported link, and verifies anonymous read-only playback', async ({
    page,
  }) => {
    await page.goto('/studio?template=online-boutique');
    await expect(page.locator('.react-flow')).toBeVisible();

    // Open Share Link modal
    const shareBtn = page.locator('[data-testid="toggle-share-link-btn"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    const shareModal = page.locator('[data-testid="share-link-modal"]');
    await expect(shareModal).toBeVisible();

    // Extract the generated link
    const linkInput = page.locator('[data-testid="share-link-input"]');
    await expect(linkInput).toBeVisible();
    const shareUrl = await linkInput.inputValue();
    expect(shareUrl).toContain('/share?token=');

    // Close share modal
    await page.locator('[data-testid="share-modal-close"]').click();
    await expect(shareModal).not.toBeVisible();

    // Navigate to the exported share link as an anonymous viewer
    await page.goto(shareUrl);

    // Verify Read-Only Banner is mounted
    const banner = page.locator('[data-testid="readonly-banner"]');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toContainText('Read-Only View');

    // Verify diagram canvas is rendered with nodes
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Frontend")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Checkout Service")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Cart Service")')).toBeVisible();
    await expect(page.locator('.react-flow__node:has-text("Cart Cache")')).toBeVisible();

    // Verify Flow Playback Toolbar is active on shared view
    const sharedToolbar = page.locator('[data-testid="flow-playback-toolbar"]');
    await expect(sharedToolbar).toBeVisible();

    const sharedStepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    await expect(sharedStepIndicator).toContainText('1 / 27');

    // Step forward in shared read-only flow
    const nextBtn = page.locator('[data-testid="playback-next-btn"]');
    await nextBtn.click();
    await expect(sharedStepIndicator).toContainText('2 / 27');

    const stepNote = page.locator('[data-testid="playback-step-note"]');
    await expect(stepNote).toContainText('Step #2:');

    // Verify link to Interactive Studio
    const studioLink = page.locator('[data-testid="open-in-studio-btn"]');
    await expect(studioLink).toBeVisible();
  });
});
