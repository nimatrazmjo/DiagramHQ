import { test, expect } from '@playwright/test';

test.describe('Phase H — Technology Picker, Inline Rename & Severity Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('Double-click inline rename allows renaming node directly on canvas', async ({ page }) => {
    // 1. Locate node label on the canvas
    const nodeLabel = page.locator('[data-testid="node-label"][data-node-id="sys-saas"]');
    await expect(nodeLabel).toBeVisible();

    // 2. Double-click label to start inline renaming
    await nodeLabel.dblclick();

    // 3. Inline rename text input appears
    const input = page.locator('[data-testid="inline-node-rename-input"]');
    await expect(input).toBeVisible();

    // 4. Fill new name and press Enter
    await input.fill('SaaS Platform Core V2');
    await input.press('Enter');

    // 5. Input disappears and label updates
    await expect(input).not.toBeVisible();
    await expect(nodeLabel).toHaveText('SaaS Platform Core V2');
  });

  test('Tags with severity render warning glyphs and distinct severity colors', async ({ page }) => {
    // 1. Click a node to open inspector
    const node = page.locator('.react-flow__node').first();
    await node.click();

    const inspector = page.getByTestId('inspector-panel');
    await expect(inspector).toBeVisible();

    // 2. Click + ⚠ High preset tag button
    const highBtn = inspector.locator('[data-testid="tag-preset-high"]');
    await expect(highBtn).toBeVisible();
    await highBtn.click();

    // 3. Verify High severity tag chip renders with rose coloring
    const highTag = inspector.locator('span.bg-rose-500\\/20');
    await expect(highTag).toBeVisible();
    await expect(highTag).toHaveClass(/text-rose-300/);

    // 4. Click + Medium preset tag button
    const medBtn = inspector.locator('[data-testid="tag-preset-medium"]');
    await expect(medBtn).toBeVisible();
    await medBtn.click();

    // 5. Verify Medium tag chip renders with amber coloring
    const medTag = inspector.locator('span.bg-amber-500\\/20');
    await expect(medTag).toBeVisible();
    await expect(medTag).toHaveClass(/text-amber-300/);
  });

  test('Zoom slider in pan-zoom toolbar allows continuous zoom adjustments', async ({ page }) => {
    // 1. Locate zoom slider in toolbar
    const zoomSlider = page.locator('[data-testid="zoom-slider"]');
    await expect(zoomSlider).toBeVisible();

    // 2. Reset zoom to 100% first
    const resetBtn = page.locator('[data-testid="reset-zoom-btn"]');
    await resetBtn.click();
    await expect(resetBtn).toContainText('100%');

    // 3. Adjust zoom slider to 1.5 (150%)
    await zoomSlider.fill('1.5');
    await zoomSlider.dispatchEvent('change');

    // 4. Verify zoom readout updates
    await expect(resetBtn).toContainText('150%');
  });
});
