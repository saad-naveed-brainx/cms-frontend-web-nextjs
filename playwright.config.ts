import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run against a production build (`npm run start:test`), never the dev server,
 * so screenshots carry no dev-only overlays.
 *
 * Port: a devflow slot sets DEVFLOW_PORT_WEB. In the main checkout tests use 3090, not 3000, so
 * they never collide with a dev server you have running.
 */
const port = Number(process.env.DEVFLOW_PORT_WEB ?? 3090);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'e2e',
      testIgnore: 'visual/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Baselines are per-OS (macOS renders fonts differently from Linux), so this project runs
      // locally and in slots, not in CI.
      name: 'visual',
      testMatch: 'visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start:test',
    url: baseURL,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
