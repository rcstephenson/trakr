import { defineConfig, devices } from '@playwright/test';

// Set E2E_PORT to run several suites at once (e.g. parallel worktrees) without sharing a preview server.
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        // iPhone 13 defaults to WebKit; run it on Chromium with touch enabled.
        defaultBrowserType: 'chromium',
        browserName: 'chromium',
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.E2E_PORT,
    timeout: 180_000,
  },
});
