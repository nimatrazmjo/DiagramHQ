import { test, expect } from '@playwright/test';

test.describe('Phase F — Connections as First-Class Objects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('Selecting an edge opens Connection Inspector with complete IcePanel controls', async ({ page }) => {
    // 1. Click mid-edge label pill badge to select connection
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    // 2. Connection Inspector is visible with header
    const inspector = page.getByTestId('inspector-panel');
    await expect(inspector).toBeVisible();
    await expect(inspector.getByText('Connection Inspector')).toBeVisible();

    // 3. Sender and Receiver are displayed
    await expect(inspector.getByText('Sender:')).toBeVisible();
    await expect(inspector.getByText('Receiver:')).toBeVisible();

    // 4. Flip Direction button is functional
    const flipBtn = page.locator('[data-testid="inspector-edge-flip-btn"]');
    await expect(flipBtn).toBeVisible();

    // 5. Label input has default "Sends data to" or existing label
    const labelInput = page.locator('[data-testid="inspector-edge-label"]');
    await expect(labelInput).toBeVisible();
    const currentLabel = await labelInput.inputValue();
    expect(currentLabel.length).toBeGreaterThan(0);

    // 6. Status pill toggles between Live and Future
    const statusBtn = page.locator('[data-testid="inspector-edge-status-btn"]');
    await expect(statusBtn).toBeVisible();
    await statusBtn.click();
    await expect(statusBtn).toContainText('Future');
    await statusBtn.click();
    await expect(statusBtn).toContainText('Live');

    // 7. Direction buttons (Outgoing, Incoming, Both)
    await expect(page.locator('[data-testid="inspector-edge-direction-outgoing"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspector-edge-direction-incoming"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspector-edge-direction-bidirectional"]')).toBeVisible();

    // 8. Routing Shape toggle (Square vs Curved)
    const squareShapeBtn = page.locator('[data-testid="inspector-edge-shape-square"]');
    const curvedShapeBtn = page.locator('[data-testid="inspector-edge-shape-curved"]');
    await expect(squareShapeBtn).toBeVisible();
    await expect(curvedShapeBtn).toBeVisible();
    await curvedShapeBtn.click();
    await expect(curvedShapeBtn).toHaveClass(/text-\[#2BB5E8\]/);

    // 9. Label Position slider
    const labelPosSlider = page.locator('[data-testid="inspector-edge-label-position"]');
    await expect(labelPosSlider).toBeVisible();
    await labelPosSlider.fill('75');
    await expect(inspector.getByText('75%')).toBeVisible();

    // 10. Via input
    const viaInput = page.locator('[data-testid="inspector-edge-via"]');
    await expect(viaInput).toBeVisible();
    await viaInput.fill('Cloudflare Edge Ingress');
    await expect(viaInput).toHaveValue('Cloudflare Edge Ingress');

    // 11. Technology input
    const techInput = page.locator('[data-testid="inspector-edge-technology"]');
    await expect(techInput).toBeVisible();
    await techInput.fill('gRPC / HTTP/2');
    await expect(techInput).toHaveValue('gRPC / HTTP/2');

    // 12. Diagrams & Flows metadata
    await expect(inspector.getByText('In 1 diagram')).toBeVisible();
    await expect(inspector.getByText('In 0 flows')).toBeVisible();

    // 13. Tags addition
    const tagInput = page.locator('[data-testid="inspector-edge-tags"]');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('encrypted');
    await tagInput.press('Enter');
    await expect(inspector.getByText('encrypted', { exact: true })).toBeVisible();

    // 14. Links addition
    const linkInput = page.locator('[data-testid="inspector-edge-links"]');
    await expect(linkInput).toBeVisible();
    await linkInput.fill('https://docs.diagramhq.internal/connections');
    await linkInput.press('Enter');
    await expect(inspector.getByText('https://docs.diagramhq.internal/connections', { exact: true })).toBeVisible();

    // 15. Description input
    const descTextarea = page.locator('[data-testid="inspector-edge-description"]');
    await expect(descTextarea).toBeVisible();
    await descTextarea.fill('Authoritative sync RPC call');
    await expect(descTextarea).toHaveValue('Authoritative sync RPC call');
  });

  test('Double clicking an edge opens inline label editor', async ({ page }) => {
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.dblclick();

    const inlineInput = page.locator('[data-testid="inline-edge-label-input"]');
    await expect(inlineInput).toBeVisible();
    await inlineInput.fill('Streams real-time metrics to');
    await inlineInput.press('Enter');

    await expect(inlineInput).toBeHidden();
    await expect(page.locator('span:has-text("Streams real-time metrics to")')).toBeVisible();
  });

  test('Flipping direction swaps source and target nodes on connection', async ({ page }) => {
    const edgePill = page.locator('[data-testid="edge-pill-badge"]').first();
    await expect(edgePill).toBeVisible();
    await edgePill.click();

    const inspector = page.getByTestId('inspector-panel');
    await expect(inspector).toBeVisible();

    // Read initial sender and receiver
    const senderText = await inspector.locator('div:has-text("Sender:") > span.font-semibold').first().innerText();
    const receiverText = await inspector.locator('div:has-text("Receiver:") > span.font-semibold').first().innerText();

    // Click Flip Direction
    const flipBtn = page.locator('[data-testid="inspector-edge-flip-btn"]');
    await flipBtn.click();

    // Confirm sender and receiver swapped
    const newSenderText = await inspector.locator('div:has-text("Sender:") > span.font-semibold').first().innerText();
    const newReceiverText = await inspector.locator('div:has-text("Receiver:") > span.font-semibold').first().innerText();

    expect(newSenderText).toBe(receiverText);
    expect(newReceiverText).toBe(senderText);
  });
});
