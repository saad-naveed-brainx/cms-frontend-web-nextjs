import { expect, test } from '@playwright/test';
import { siteUrl } from './env';
import { realApi, unique } from './support';

/**
 * A text block on the REAL flow (feature `text-block`, D-041): saved through the real API, which
 * cleans its HTML, then drawn by the website as stored.
 */

test('[UC-TB-03] a published text block shows on the site with its heading, formatting, list and link; anything unsafe sent with it is gone', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const made = await api.createSite('Wordy Cafe', `wordy-${unique()}.localhost`);
  await made.publishPage({
    slug: 'home',
    title: 'Home',
    blocks: [
      { type: 'hero', headline: 'Welcome' },
      {
        type: 'richText',
        heading: 'Our story',
        html:
          '<p>We bake <strong>every</strong> morning.</p>' +
          '<h3>What we make</h3><ul><li>Rye bread</li><li>Seed cake</li></ul>' +
          '<p><a href="/menu">See the menu</a> <a href="javascript:alert(1)">Tricky</a></p>' +
          '<img src="x" onerror="alert(1)"><script>alert(1)</script>',
      },
      { type: 'cta', heading: 'Come in', action: { label: 'Find us', href: '/visit' } },
    ],
  });
  page.on('dialog', () => {
    throw new Error('a stored script ran');
  });

  const response = await page.goto(siteUrl(made.host));
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 2, name: 'Our story' })).toBeVisible();
  await expect(page.getByText('We bake every morning.')).toBeVisible();
  await expect(page.locator('strong', { hasText: 'every' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'What we make' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('listitem')).toHaveText(['Rye bread', 'Seed cake']);
  await expect(page.getByRole('link', { name: 'See the menu' })).toHaveAttribute('href', '/menu');
  // The bad link keeps its words but goes nowhere; the picture and script are gone.
  await expect(page.getByText('Tricky')).toBeVisible();
  await expect(page.locator('a[href^="javascript"], img[src="x"], main script')).toHaveCount(0);
  // Between the page's other blocks, in order.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome');
  await expect(page.getByRole('heading', { name: 'Come in' })).toBeVisible();
});
