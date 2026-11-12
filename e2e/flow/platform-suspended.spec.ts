import { expect, test } from '@playwright/test';
import { siteUrl } from './env';
import { sql, unique } from './support';

/**
 * A suspended organization's website on the REAL flow (platform-admin T4, D-062): the real API answers
 * 503 `site_suspended` and the website says the site is unavailable. The organization is made straight in
 * the database, suspended and with no owner, so no other test's organization is touched (a suspended
 * organization refuses writes, and the other tests share the owner's). The suspend route itself and its
 * cache clearing are proved in the API's own tests.
 */
test('[UC-PA-46] a suspended organization\'s website shows "This site is unavailable"', async ({ page }) => {
  const host = `suspended-${unique()}.localhost`;
  sql(
    `WITH o AS (INSERT INTO organizations (name, suspended_at) VALUES ('Suspended Co ${host}', now()) RETURNING id),
          s AS (INSERT INTO sites (organization_id, name) SELECT id, 'Suspended Bakery' FROM o RETURNING id)
     INSERT INTO hostnames (site_id, hostname, is_primary) SELECT id, '${host}', true FROM s`,
  );

  const response = await page.goto(siteUrl(host));

  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole('heading', { level: 1, name: 'This site is unavailable' })).toBeVisible();
  await expect(page.getByText('Suspended Bakery')).toHaveCount(0);
  await expect(page).toHaveTitle('This site is unavailable');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
