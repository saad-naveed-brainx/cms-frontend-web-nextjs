import { expect, test } from '@playwright/test';
import { corrick, kestrel } from '../support/sample-sites';
import { siteUrl } from './env';
import { realApi, unique } from './support';

/**
 * Preview links on the REAL flow (feature site-preview): the link comes from the real API, as the
 * admin's Preview button asks for it, and is opened on the real website at the site's own address.
 */

const HERO = { type: 'hero', headline: 'Spring menu, not ready yet' };

test('[UC-SP-11] a draft opens through its preview link, under a Preview strip, never indexed, while its address stays a 404', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const site = await api.createSampleSite(corrick, `corrick-${unique()}.localhost`);
  const draft = await site.createPage({ slug: 'spring', title: 'Spring menu', blocks: [HERO] });
  const token = await site.previewLink(draft.id);

  const response = await page.goto(siteUrl(site.host, `/spring?preview=${token}`));
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText(
    'Preview · This page is a draft. Visitors cannot see it yet.',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.headline);
  await expect(page).toHaveTitle(`Preview: Spring menu — ${corrick.name}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  // The site's own look and navigation are around it.
  await expect(page.locator('header').getByRole('link', { name: corrick.name })).toBeVisible();

  // Without the link, the draft is not there.
  const plain = await page.goto(siteUrl(site.host, '/spring'));
  expect(plain?.status()).toBe(404);

  // A published page's link says so.
  const live = await site.publishPage({ slug: 'open', title: 'Open today' });
  await page.goto(siteUrl(site.host, `/open?preview=${await site.previewLink(live.id)}`));
  await expect(page.getByRole('status')).toHaveText(
    'Preview · This page is published. You are seeing it as it was last saved.',
  );
});

test('[UC-SP-12] a link that is not valid says it has expired, and a good link at another site’s address is not found', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const first = await api.createSampleSite(corrick, `corrick-${token}.localhost`);
  const second = await api.createSampleSite(kestrel, `kestrel-${token}.localhost`);
  const draft = await first.createPage({ slug: 'spring', title: 'Spring menu', blocks: [HERO] });

  await page.goto(siteUrl(first.host, '/spring?preview=not-a-link'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This preview link has expired');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

  const link = await first.previewLink(draft.id);
  const elsewhere = await page.goto(siteUrl(second.host, `/spring?preview=${link}`));
  expect(elsewhere?.status()).toBe(404);
  await expect(page.getByText(HERO.headline)).toHaveCount(0);
});
