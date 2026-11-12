import { expect, test } from '@playwright/test';
import { siteUrl } from './env';
import { realApi, sql, unique } from './support';

/**
 * A suspended organization's website on the REAL flow (platform-admin T4, D-062): the real API answers
 * 503 `site_suspended` and the website says the site is unavailable, with none of the site's content.
 * The suspension is written straight to the database, before the first visit, so no cache holds an
 * older answer; the suspend route itself and its cache clearing are proved in the API's own tests.
 */
test('[UC-PA-46] a suspended organization\'s website shows "This site is unavailable" and none of its content', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const site = await api.createSite('Suspended Bakery', `suspended-${unique()}.localhost`);
  await site.publishPage({
    slug: 'home',
    title: 'Home',
    blocks: [{ type: 'hero', headline: 'Secret headline' }],
  });
  sql(
    `UPDATE organizations SET suspended_at = now() WHERE id = (SELECT organization_id FROM sites WHERE id = '${site.siteId}')`,
  );

  await page.goto(siteUrl(site.host));

  await expect(page.getByRole('heading', { level: 1, name: 'This site is unavailable' })).toBeVisible();
  await expect(page.getByText('Secret headline')).toHaveCount(0);
  await expect(page).toHaveTitle('This site is unavailable');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
