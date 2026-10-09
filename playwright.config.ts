import { defineConfig, devices } from '@playwright/test';
import { baseURL, downApiUrl, flowApiPort, flowApiUrl, flowDatabase, webPort } from './e2e/flow/env';
import { owner, ownerTenant } from './e2e/flow/people';

/**
 * Browser tests run against a production build (`npm run start:test`), never the dev server,
 * so screenshots carry no dev-only overlays.
 *
 * Port: a devflow slot sets DEVFLOW_PORT_WEB. In the main checkout tests use 3090, not 3000, so
 * they never collide with a dev server you have running.
 *
 * Projects:
 * - e2e:    no API at all: the website is pointed at an address nothing listens on, so the tests
 *           can see what a visitor gets when the API is down. This is what GitHub CI runs.
 * - flow:   the REAL flow. Needs the api repo next to this one (../api): its server is started on
 *           its own port and database (FLOW=1), sites and pages are made through it, and the
 *           website draws them.
 * - visual: screenshots of real sites against approved baselines (macOS only, so not in CI).
 */
const realApi = process.env.FLOW === '1';

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
      testIgnore: ['visual/**', 'flow/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'flow',
      testMatch: 'flow/**/*.spec.ts',
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
  webServer: [
    {
      command: 'npm run start:test',
      // A file route answers 200 on any address; the site's own pages would be a 404 or an error here.
      url: `${baseURL}/favicon.ico`,
      env: { PORT: String(webPort), NEXT_PUBLIC_API_URL: realApi ? flowApiUrl : downApiUrl },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    ...(realApi
      ? [
          {
            command: 'node e2e/flow/start-api.mjs',
            url: `${flowApiUrl}/health`,
            env: {
              FLOW_DATABASE: flowDatabase,
              FLOW_API_PORT: String(flowApiPort),
              FLOW_OWNER: JSON.stringify(owner),
              FLOW_TENANT: JSON.stringify(ownerTenant),
            },
            reuseExistingServer: false,
            // Build, migrate, create the owner, start: about half a minute.
            timeout: 180_000,
          },
        ]
      : []),
  ],
});
