import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optionally drive a system-installed browser (e.g. E2E_CHANNEL=chrome
        // or msedge) to avoid downloading Playwright's bundled Chromium.
        channel: process.env.E2E_CHANNEL || undefined,
      },
    },
  ],
  // Reuse a running dev server if present; otherwise start one.
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
