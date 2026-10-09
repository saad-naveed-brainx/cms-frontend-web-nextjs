import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The parts of the public site that need no API. In this project the website is pointed at an
 * address nothing listens on (see playwright.config.ts), so "the API is down" is real, not played.
 * What the site draws from real sites is in e2e/flow/.
 */

test('[UC-RS-25] when the API cannot be reached the visitor gets a plain error page, not a stack trace or a false "not found"', async ({
  page,
}) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(500);
  await expect(page.getByRole('heading', { level: 1, name: 'This page can’t load right now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText(/ECONNREFUSED|fetch failed|NEXT_PUBLIC_API_URL|at \w+ \(/)).toHaveCount(0);
});

test('[UC-RS-20] the demo pages and the fixtures they drew from are gone', () => {
  for (const gone of ['src/app/preview', 'src/app/page.tsx', 'src/fixtures']) {
    expect(existsSync(path.resolve(process.cwd(), gone)), gone).toBe(false);
  }
});
