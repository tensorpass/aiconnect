// The demo's end to end tests, on the demo's dev server with no wallet installed: what a visitor without AI
// Wallet is offered on each device. The wallet's own end to end tests run in the wallet's repository. Phones
// are emulated in Chromium from Playwright's device list, since the step reads the user agent alone.

import { defineConfig } from '@playwright/test';

// A port of its own, so the tests never read a dev server already running on the demo's 4605.
const PORT = 4615;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.e2e.ts',
  outputDir: './test-results',
  timeout: 30_000,
  reporter: 'list',
  use: { baseURL: ORIGIN, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: `vite --port ${PORT} --strictPort`, url: ORIGIN, reuseExistingServer: false },
});
