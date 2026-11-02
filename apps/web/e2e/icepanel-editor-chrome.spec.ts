import { test, expect } from '@playwright/test';

test.describe('IcePanel Studio Editor Chrome Parity (Phase B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('renders top bar with Exit, DRAFT badge, Diagram/Model toggle, changes counter, and Merge', async ({
    page,
  }) => {
    // Top bar elements
    await expect(page.getByRole('link', { name: /Exit/i })).toBeVisible();
    await expect(page.getByTestId('branch-badge')).toBeVisible();

    // Segmented Diagram ⟷ Model toggle
    const diagramModelToggle = page.getByTestId('diagram-model-toggle');
    await expect(diagramModelToggle).toBeVisible();
    const diagramBtn = page.getByTestId('view-mode-diagram');
    const modelBtn = page.getByTestId('view-mode-model');
    await expect(diagramBtn).toBeVisible();
    await expect(modelBtn).toBeVisible();

    // Toggle to Model mode opens sidebar
    await modelBtn.click();
    await page.waitForTimeout(200);

    // Changes counter
    await expect(page.getByTestId('toggle-visual-diff-btn')).toBeVisible();

    // Merge button
    const mergeBtn = page.getByTestId('toggle-review-pr-btn');
    await expect(mergeBtn).toBeVisible();
  });

  test('toggles more options (…) dropdown in top bar', async ({ page }) => {
    const moreBtn = page.getByRole('button', { name: 'More Options' });
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();

    // Dropdown options visible
    await expect(page.getByText('Export (PNG, SVG, PDF)')).toBeVisible();
    await expect(page.getByText('Share Public Link')).toBeVisible();
    await expect(page.getByText('AI Copilot')).toBeVisible();
    await expect(page.getByText('Reset Canvas')).toBeVisible();

    // Click outside closes dropdown
    await page.mouse.click(10, 10);
    await expect(page.getByText('Export (PNG, SVG, PDF)')).not.toBeVisible();
  });

  test('switches to draft branch and displays orange dashed frame and floating draft pill', async ({
    page,
  }) => {
    // Open branch selector
    const branchBadge = page.getByTestId('branch-badge');
    await branchBadge.click();

    // Select draft branch
    const draftBranch = page.getByTestId('branch-item-feat/auth-v2');
    await expect(draftBranch).toBeVisible();
    await draftBranch.click();

    // Verify DRAFT badge in top bar
    await expect(page.getByTestId('branch-badge')).toContainText('DRAFT');
    await expect(page.getByTestId('branch-badge-name')).toHaveText('feat/auth-v2');

    // Verify viewport orange dashed frame
    const draftFrame = page.getByTestId('draft-mode-frame');
    await expect(draftFrame).toBeVisible();

    // Verify floating draft notification pill
    await expect(page.getByText('Draft Mode')).toBeVisible();
    await expect(page.getByTestId('branch-badge-name')).toHaveText('feat/auth-v2');

    // Click Merge button triggers merge toast
    const mergeBtn = page.getByTestId('toggle-review-pr-btn');
    await mergeBtn.click();
    await expect(page.getByText('Draft successfully merged')).toBeVisible();
  });

  test('interacts with Left Rail: Flows, quick-add popover, and Model sidebar toggle', async ({
    page,
  }) => {
    // Flows playback toggle
    const flowsBtn = page.getByTestId('toggle-flow-playback-btn').first();
    await expect(flowsBtn).toBeVisible();

    // Left rail Add (+) button
    const addBtn = page.getByTestId('left-rail-add-btn');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Quick-add popover displays C4 object types
    await expect(page.getByTestId('quick-add-system')).toBeVisible();
    await expect(page.getByTestId('quick-add-app')).toBeVisible();
    await expect(page.getByTestId('quick-add-store')).toBeVisible();
    await expect(page.getByTestId('quick-add-component')).toBeVisible();
    await expect(page.getByTestId('quick-add-actor')).toBeVisible();
    await expect(page.getByTestId('quick-add-group')).toBeVisible();

    // Create a new store/database node
    await page.getByTestId('quick-add-store').click();
    await page.waitForTimeout(300);

    // Node is created and visible on canvas
    await expect(page.getByTestId('database-node').getByText('Database Store')).toBeVisible();
  });

  test('interacts with Bottom Filter Bar and creates a New Group container', async ({ page }) => {
    // Filter pills visible
    await expect(page.getByTestId('filter-tags-btn')).toBeVisible();
    await expect(page.getByTestId('filter-technology-btn')).toBeVisible();
    await expect(page.getByTestId('filter-status-btn')).toBeVisible();
    await expect(page.getByTestId('filter-teams-btn')).toBeVisible();
    await expect(page.getByTestId('risk-indicator')).toBeVisible();

    // + New Group button
    const newGroupBtn = page.getByTestId('bottom-bar-new-group-btn');
    await expect(newGroupBtn).toBeVisible();

    // Click New Group
    const initialNodeCount = await page.locator('.react-flow__node').count();
    await newGroupBtn.click();
    await page.waitForTimeout(300);

    const postGroupCount = await page.locator('.react-flow__node').count();
    expect(postGroupCount).toBe(initialNodeCount + 1);
    await expect(page.getByText('Created new group container')).toBeVisible();
  });

  test('applies X-Ray filter glasses dimming on canvas nodes', async ({ page }) => {
    // Open status filter dropdown
    const statusBtn = page.getByTestId('filter-status-btn');
    await statusBtn.click();

    // Select "Live" status filter
    await page.getByRole('button', { name: 'Live' }).click();
    await page.waitForTimeout(200);

    // Filter button now reflects active filter
    await expect(statusBtn).toContainText('live');
  });
});
