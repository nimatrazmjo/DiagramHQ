import { test, expect } from '@playwright/test';

test.describe('DiagramHQ Authentication & Session Flows', () => {
  test('unauthenticated visitor to /dashboard is redirected to /login with callbackUrl', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('unauthenticated visitor to /workspace route is redirected to /login', async ({ page }) => {
    await page.goto('/workspace/ws-prod-test');
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('displays error alert upon entering invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@diagramhq.com');
    await page.locator('#password').fill('completely-wrong-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toContainText('Invalid credentials');
    // Must remain on login page
    expect(page.url()).toContain('/login');
  });

  test('signs in successfully using 1-Click Admin Superuser button', async ({ page }) => {
    await page.goto('/login');
    const adminButton = page.getByRole('button', { name: /1-Click Sign In as Admin/i });
    await expect(adminButton).toBeVisible();
    await adminButton.click();

    // Verify redirected to dashboard with authenticated session
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'DiagramHQ' })).toBeVisible();
    await expect(page.getByText('Authenticated Session')).toBeVisible();
    await expect(page.getByText(/Signed in as admin/i)).toBeVisible();
  });

  test('signs in successfully with manual credential input', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@diagramhq.com');
    await page.locator('#password').fill('adminpassword');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'DiagramHQ' })).toBeVisible();
    await expect(page.getByText('Authenticated Session')).toBeVisible();
    await expect(page.getByText(/Signed in as admin/i)).toBeVisible();
  });

  test('already authenticated user is redirected from /login directly to /dashboard', async ({ page }) => {
    // First sign in
    await page.goto('/login');
    await page.getByRole('button', { name: /1-Click Sign In as Admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Attempt to access login page
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('signs out and clears authenticated session', async ({ page }) => {
    // Sign in first
    await page.goto('/login');
    await page.getByRole('button', { name: /1-Click Sign In as Admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Click Sign out
    const signOutBtn = page.getByRole('button', { name: 'Sign out' });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // Attempting to visit /dashboard now should redirect back to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?callbackUrl=/, { timeout: 10000 });
  });

  test('Enterprise SSO tab detects domain and displays IdP routing info', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to Enterprise SSO tab using exact match
    await page.getByRole('button', { name: 'Enterprise SSO', exact: true }).click();
    await expect(page.locator('#sso-email')).toBeVisible();

    // Type corporate email
    await page.locator('#sso-email').fill('alex@acme-enterprise.com');

    // Expect detected IdP badge
    await expect(page.getByText('Target IdP:')).toBeVisible();
    await expect(page.getByText('Acme Enterprise Okta').first()).toBeVisible();
  });
});
