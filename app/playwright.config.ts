import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-engine end-to-end config. The flood raster is a deck.gl overlay on a
 * WebGL canvas, and the bug it guards against was engine-specific: switching
 * the return period redrew on Chromium but not on WebKit (Safari, most Macs).
 * So the suite runs on both engines — WebKit is the stand-in for Mac, Chromium
 * for Windows and Linux Chrome.
 *
 * The tests stream real tiles from Source Cooperative, so they need network and
 * a longer timeout than a pure-DOM suite. CI installs browsers with
 * `pnpm exec playwright install --with-deps chromium webkit`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm dev --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
