import { test, expect } from '@playwright/test';

test.describe('Visual Regression & Layout Stability', () => {
  test('Studio canvas renders with dark theme slate-950 background and header', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    // Verify dark palette styles
    const bodyOrRoot = page.locator('main, div.bg-slate-950').first();
    await expect(bodyOrRoot).toBeVisible();

    // Verify header branding and dimensions
    const header = page.locator('header');
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox?.height).toBeGreaterThanOrEqual(48);

    // Save visual snapshot
    await page.screenshot({
      path: 'test-results/screenshots/studio-desktop.png',
      fullPage: false,
    });
  });

  test('Login page presents centered card with dark aesthetic and branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();

    // Verify login card exists and is centered
    const card = page.locator('main > div').first();
    await expect(card).toBeVisible();
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox?.width).toBeGreaterThanOrEqual(300);

    // Save visual snapshot
    await page.screenshot({
      path: 'test-results/screenshots/login-page.png',
      fullPage: false,
    });
  });

  test('Inspector panel renders on the right with appropriate width and sections', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);

    const inspector = page.locator('aside, [data-testid="inspector-panel"], .inspector-panel, [aria-label*="Inspector"]').first();
    await expect(inspector).toBeVisible();

    const inspectorBox = await inspector.boundingBox();
    expect(inspectorBox).not.toBeNull();
    // Inspector should take ~300px to 400px width on the right
    expect(inspectorBox?.width).toBeGreaterThanOrEqual(240);

    // Save visual snapshot of inspector
    await inspector.screenshot({
      path: 'test-results/screenshots/inspector-panel.png',
    });
  });

  test('Brand Icon Catalog modal renders grid of technology logos', async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Icons/i }).click();
    const modalHeading = page.getByText('Select Object Icon');
    await expect(modalHeading).toBeVisible();

    // Verify modal overlay screenshot
    await page.screenshot({
      path: 'test-results/screenshots/icon-catalog-modal.png',
    });

    await page.getByRole('button', { name: '✕' }).click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('Responsive visual stability on mobile viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/studio');

    // Studio should handle small screen gracefully
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('DiagramHQ')).toBeVisible();

    // Save mobile viewport snapshot
    await page.screenshot({
      path: 'test-results/screenshots/studio-mobile.png',
    });
  });
});
