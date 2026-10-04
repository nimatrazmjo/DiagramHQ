import { defineConfig, devices } from '@playwright/test';

/**
 * DiagramHQ E2E Playwright Configuration
 * Includes automated video recording, tracing, and deterministic canvas testing.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  /* Run tests sequentially for deterministic canvas manipulation */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',

    /* Capture screenshot on every test */
    screenshot: 'on',

    /* Detailed video recording for every test execution */
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },

    viewport: { width: 1280, height: 800 },
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
