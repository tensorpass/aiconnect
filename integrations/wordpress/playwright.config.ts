// The plugin's end to end tests, run by scripts/e2e.sh once WordPress is up at http://localhost:5046.
// The wallet is loaded as an extension, which needs a persistent Chromium, so the tests start their own.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.e2e.ts',
  outputDir: './test-results',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5046',
    trace: 'retain-on-failure',
  },
});
