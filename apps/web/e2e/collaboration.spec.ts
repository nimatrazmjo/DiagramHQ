import { test, expect } from '@playwright/test';

/**
 * Playwright E2E: Collaboration, Threaded Comments, Live Presence & Architecture Review Suite.
 *
 * Verifies:
 * 1. Live presence indicator displaying collaborator peer count and active teammate avatars.
 * 2. Opening and closing the comments drawer, with Open vs. All filter toggling.
 * 3. Posting a new top-level comment thread on an architecture element.
 * 4. Replying to an existing comment thread with inline threaded replies.
 * 5. Resolving and reopening comment threads.
 * 6. Opening Architecture Pull Request review modal, reviewing diff & risk assessment, and submitting an approval.
 */

test.describe('Collaboration & Architecture Reviews Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('1. Active presence indicator displays peer count and collaborator avatars', async ({ page }) => {
    const presenceContainer = page.locator('[data-testid="presence-indicators"]');
    await expect(presenceContainer).toBeVisible();

    // Live pulsing dot
    const pulseDot = page.locator('[data-testid="presence-live-pulse"]');
    await expect(pulseDot).toBeVisible();

    // Peer count badge
    const peerCount = page.locator('[data-testid="presence-peer-count"]');
    await expect(peerCount).toHaveText('3 peers');

    // Individual collaborator avatars
    const aliceAvatar = page.locator('[data-testid="presence-avatar-user-alice"]');
    await expect(aliceAvatar).toBeVisible();
    const aliceTitle = await aliceAvatar.getAttribute('title');
    expect(aliceTitle).toContain('Alice Chen');
    expect(aliceTitle).toContain('Lead Architect');

    const bobAvatar = page.locator('[data-testid="presence-avatar-user-bob"]');
    await expect(bobAvatar).toBeVisible();
    const bobTitle = await bobAvatar.getAttribute('title');
    expect(bobTitle).toContain('Bob Smith');
    expect(bobTitle).toContain('Security Engineer');

    const carolAvatar = page.locator('[data-testid="presence-avatar-user-carol"]');
    await expect(carolAvatar).toBeVisible();
    const carolTitle = await carolAvatar.getAttribute('title');
    expect(carolTitle).toContain('Carol Davis');
    expect(carolTitle).toContain('Idle');
  });

  test('2. Toggling comments drawer and filtering threads between Open and All', async ({ page }) => {
    const toggleCommentsBtn = page.locator('[data-testid="toggle-comments-btn"]');
    await expect(toggleCommentsBtn).toBeVisible();

    // Verify unresolved comment counter badge
    const badgeCount = page.locator('[data-testid="comments-badge-count"]');
    await expect(badgeCount).toHaveText('1');

    // Open comments drawer
    await toggleCommentsBtn.click();
    const commentsPanel = page.locator('[data-testid="comments-panel"]');
    await expect(commentsPanel).toBeVisible();

    // Verify Open filter is active by default
    const filterUnresolved = page.locator('[data-testid="comments-filter-unresolved"]');
    await expect(filterUnresolved).toBeVisible();

    // Open thread is visible
    const openThread = page.locator('[data-testid="comment-thread-cmt-root-1"]');
    await expect(openThread).toBeVisible();
    await expect(openThread).toContainText('Should we terminate TLS');

    // Resolved thread is filtered out in Open view
    const resolvedThread = page.locator('[data-testid="comment-thread-cmt-root-2"]');
    await expect(resolvedThread).not.toBeVisible();

    // Switch to All filter
    const filterAll = page.locator('[data-testid="comments-filter-all"]');
    await filterAll.click();

    // Both threads should now be visible
    await expect(openThread).toBeVisible();
    await expect(resolvedThread).toBeVisible();
    await expect(resolvedThread).toContainText('Architecture baseline approved');

    // Close comments drawer
    const closeBtn = page.locator('[data-testid="comments-panel-close"]');
    await closeBtn.click();
    await expect(commentsPanel).not.toBeVisible();
  });

  test('3. Creating a new architecture comment thread', async ({ page }) => {
    // Open comments drawer
    await page.locator('[data-testid="toggle-comments-btn"]').click();
    await expect(page.locator('[data-testid="comments-panel"]')).toBeVisible();

    // Target the comment textarea
    const commentInput = page.locator('[data-testid="comment-new-textarea"]');
    await expect(commentInput).toBeVisible();

    const submitBtn = page.locator('[data-testid="comment-new-submit"]');
    await expect(submitBtn).toBeDisabled();

    // Type new architectural comment
    const newCommentText = 'Configure CORS and rate-limiting headers on API Gateway before production deployment.';
    await commentInput.fill(newCommentText);
    await expect(submitBtn).toBeEnabled();

    // Submit comment
    await submitBtn.click();

    // Verify comment appears in the thread list
    const newThread = page.locator('[data-testid^="comment-thread-"]').filter({ hasText: newCommentText });
    await expect(newThread).toBeVisible();
    await expect(newThread).toContainText('Admin Superuser');
    await expect(newThread).toContainText(newCommentText);

    // Verify input textarea is reset
    await expect(commentInput).toHaveValue('');
  });

  test('4. Replying to an existing comment thread', async ({ page }) => {
    // Open comments drawer
    await page.locator('[data-testid="toggle-comments-btn"]').click();
    await expect(page.locator('[data-testid="comments-panel"]')).toBeVisible();

    const rootThread = page.locator('[data-testid="comment-thread-cmt-root-1"]');
    await expect(rootThread).toBeVisible();

    // Locate inline reply input
    const replyInput = page.locator('[data-testid="comment-reply-input-cmt-root-1"]');
    await expect(replyInput).toBeVisible();

    const replyText = 'Verified: automated certificate renewal passes test suite in staging environment.';
    await replyInput.fill(replyText);

    const replySubmit = page.locator('[data-testid="comment-reply-submit-cmt-root-1"]');
    await replySubmit.click();

    // Verify reply rendered inside the thread
    await expect(rootThread).toContainText(replyText);
    await expect(rootThread).toContainText('Admin Superuser');

    // Verify reply input is cleared
    await expect(replyInput).toHaveValue('');
  });

  test('5. Resolving and reopening comment threads', async ({ page }) => {
    // Open comments drawer
    await page.locator('[data-testid="toggle-comments-btn"]').click();
    await expect(page.locator('[data-testid="comments-panel"]')).toBeVisible();

    const rootThread = page.locator('[data-testid="comment-thread-cmt-root-1"]');
    await expect(rootThread).toBeVisible();

    // Click Resolve
    const resolveBtn = page.locator('[data-testid="comment-resolve-btn-cmt-root-1"]');
    await expect(resolveBtn).toHaveText('Resolve');
    await resolveBtn.click();

    // In default 'Open' view, thread disappears when resolved
    await expect(rootThread).not.toBeVisible();

    // Switch to 'All' filter to see the resolved thread
    await page.locator('[data-testid="comments-filter-all"]').click();
    await expect(rootThread).toBeVisible();

    // Verify Reopen button is now shown
    const reopenBtn = page.locator('[data-testid="comment-reopen-btn-cmt-root-1"]');
    await expect(reopenBtn).toBeVisible();
    await expect(reopenBtn).toHaveText('Resolved ✓');

    // Click Reopen button
    await reopenBtn.click();

    // Verify thread is re-opened and Resolve button reappears
    await expect(page.locator('[data-testid="comment-resolve-btn-cmt-root-1"]')).toBeVisible();
  });

  test('6. Architecture Review PR modal navigation and approving pull request', async ({ page }) => {
    const prToggleBtn = page.locator('[data-testid="toggle-review-pr-btn"]');
    await expect(prToggleBtn).toBeVisible();
    await expect(prToggleBtn).toContainText('#14');
    await expect(prToggleBtn).toContainText('open');

    // Open PR review modal
    await prToggleBtn.click();
    const prModal = page.locator('[data-testid="pull-request-modal"]');
    await expect(prModal).toBeVisible();

    // Verify PR Header info
    await expect(page.locator('[data-testid="pr-title"]')).toHaveText(
      'feat(auth): Upgrade Auth Service to OAuth2 / OIDC & Deploy Billing'
    );
    const branchesText = await page.locator('[data-testid="pr-branches"]').innerText();
    expect(branchesText).toContain('feat/auth-v2');
    expect(branchesText).toContain('main');
    expect(branchesText).toContain('Alice Chen');

    // Verify Risk banner
    const riskBanner = page.locator('[data-testid="pr-risk-banner"]');
    await expect(riskBanner).toBeVisible();
    await expect(riskBanner).toContainText('Risk Assessment');

    // Switch between tabs
    const diffTab = page.locator('[data-testid="pr-tab-diff"]');
    await diffTab.click();
    await expect(prModal).toContainText('added');
    await expect(prModal).toContainText('modified');

    const reviewsTab = page.locator('[data-testid="pr-tab-reviews"]');
    await reviewsTab.click();
    await expect(prModal).toContainText('No reviews submitted yet');

    // Submit PR Review Approval
    const reviewInput = page.locator('[data-testid="pr-review-input"]');
    await expect(reviewInput).toBeVisible();
    await reviewInput.fill('Architecture review complete. Changes conform to enterprise standard.');

    const approveBtn = page.locator('[data-testid="pr-approve-btn"]');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify review is posted under reviews tab
    await expect(prModal).toContainText('Admin Superuser');
    await expect(prModal).toContainText('approve');
    await expect(prModal).toContainText('Architecture review complete');

    // Verify header PR badge status updated to 'approved'
    await expect(prToggleBtn).toContainText('approved');

    // Close modal
    const closeBtn = page.locator('[data-testid="pr-close-btn"]');
    await closeBtn.click();
    await expect(prModal).not.toBeVisible();
  });
});
