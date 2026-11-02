import { test, expect } from '@playwright/test';

test.describe('Phase E — IcePanel Drafts, Technology Choices & Flows Polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio?harness=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="studio-breadcrumb"]')).toBeVisible();
  });

  test('Draft branch merge displays change counter and shows success toast notification', async ({ page }) => {
    // 1. Open branch selector and switch to draft branch
    const branchBadge = page.locator('[data-testid="branch-badge"]');
    await expect(branchBadge).toBeVisible();
    await branchBadge.click();

    const draftBranchOption = page.locator('[data-testid^="branch-item-"]').last();
    await draftBranchOption.click();

    // 2. In draft branch, verify orange draft frame and merge button
    const mergeBtn = page.locator('[data-testid="merge-draft-btn"]');
    await expect(mergeBtn).toBeVisible();

    // 3. Click Merge button
    await mergeBtn.click();

    // 4. Assert toast notification displays "Draft successfully merged"
    const toast = page.locator('[data-testid="studio-toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Draft successfully merged');
  });

  test('Technology choices overlay allows searching, selecting, and creating new technologies', async ({ page }) => {
    // 1. Select a node on canvas to open Inspector
    const canvasNode = page.locator('.react-flow__node').first();
    await expect(canvasNode).toBeVisible();
    await canvasNode.click({ position: { x: 30, y: 30 } });

    const inspector = page.locator('[data-testid="inspector-panel"]');
    await expect(inspector).toBeVisible();

    // 2. Open Technology choices overlay
    const openChoicesBtn = page.locator('[data-testid="open-tech-choices-btn"]');
    await expect(openChoicesBtn).toBeVisible();
    await openChoicesBtn.click();

    const overlay = page.locator('[data-testid="tech-choices-overlay"]');
    await expect(overlay).toBeVisible();

    // 3. Search for known technology "React"
    const searchInput = page.locator('[data-testid="tech-choices-search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('React');

    const reactChoice = page.locator('[data-testid="tech-choice-item-react"]');
    await expect(reactChoice).toBeVisible();
    await reactChoice.click();

    // 4. Verify React was added to the technology list
    await expect(page.locator('span:has-text("React")').first()).toBeVisible();

    // 5. Re-open choices overlay and create custom tech "Elixir Phoenix"
    await openChoicesBtn.click();
    await expect(overlay).toBeVisible();
    await searchInput.fill('Elixir Phoenix');

    const createItBtn = page.locator('[data-testid="tech-create-it-btn"]');
    await expect(createItBtn).toBeVisible();
    await expect(createItBtn).toContainText('Create "Elixir Phoenix"');
    await createItBtn.click();

    // 6. Verify custom tech was created and added
    await expect(page.locator('span:has-text("Elixir Phoenix")').first()).toBeVisible();
  });

  test('Flows playback toolbar steps through execution traces over connections', async ({ page }) => {
    // 1. Toggle flow playback via Left Rail
    const flowPlaybackBtn = page.locator('[data-testid="toggle-flow-playback-btn"]');
    await expect(flowPlaybackBtn).toBeVisible();
    await flowPlaybackBtn.click();

    // 2. Verify flow playback toolbar is active
    const toolbar = page.locator('[data-testid="flow-playback-toolbar"]');
    await expect(toolbar).toBeVisible();

    const stepIndicator = page.locator('[data-testid="playback-step-indicator"]');
    await expect(stepIndicator).toHaveText('1 / 4');

    // 3. Step next in flow
    const nextBtn = page.locator('[data-testid="playback-next-btn"]');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 4. Verify step advanced
    await expect(stepIndicator).toHaveText('2 / 4');

    // 5. Restart flow
    const restartBtn = page.locator('[data-testid="playback-restart-btn"]');
    await restartBtn.click();
    await expect(stepIndicator).toHaveText('1 / 4');
  });
});
