import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { corrick, kestrel } from '../support/sample-sites';
import { siteUrl } from './env';
import { asRgb, realApi, unique } from './support';

/**
 * The public site on the REAL flow: a real browser, the real website, the real API and a real
 * database. Sites and pages are made through the real API (a site is created on an address, pages
 * are made and published), never written into the website. Each test makes sites of its own on
 * its own addresses, because the tests share one database.
 */

const notFoundPage = (page: Page) => page.getByRole('heading', { level: 1, name: 'Page not found' });

/** The element that carries a site's theme. */
const themeRoot = (page: Page) => page.locator('div[style*="--site-paper"]').first();

test('[UC-RS-17] two real sites on two hosts each show their own content, name, navigation and theme, and never each other’s', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const first = await api.createSampleSite(corrick, `corrick-${token}.localhost`);
  const second = await api.createSampleSite(kestrel, `kestrel-${token}.localhost`);

  for (const [made, sample, texture] of [
    [first, corrick, 'grain'],
    [second, kestrel, 'grid'],
  ] as const) {
    const response = await page.goto(siteUrl(made.host));
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(`${sample.pages[0].title} — ${sample.name}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(sample.headline);
    await expect(page.locator('header').getByRole('link', { name: sample.name })).toBeVisible();
    // The navigation lists the site's other published pages by title, not the home page.
    const nav = page.getByRole('navigation', { name: `${sample.name} navigation` });
    await expect(nav.getByRole('link')).toHaveText(
      sample.pages
        .slice(1)
        .map((item) => item.title)
        .sort(),
    );
    // The theme: its own paper colour and texture.
    await expect(themeRoot(page)).toHaveCSS('background-color', asRgb(sample.theme.palette.paper));
    await expect(themeRoot(page)).toHaveClass(new RegExp(`site-texture-${texture}`));
    await expect(page.locator('footer')).toContainText(made.host);
  }

  // Each address shows only its own site.
  await page.goto(siteUrl(second.host));
  await expect(page.getByText(corrick.headline)).toHaveCount(0);
  await expect(page.getByText(corrick.name)).toHaveCount(0);
  await page.goto(siteUrl(first.host));
  await expect(page.getByText(kestrel.headline)).toHaveCount(0);

  // A navigation link opens that page, with its own title.
  const nav = page.getByRole('navigation', { name: `${corrick.name} navigation` });
  await nav.getByRole('link', { name: 'Wholesale' }).click();
  await expect(page).toHaveURL(siteUrl(first.host, '/wholesale'));
  await expect(page.getByText('Restaurant orders')).toBeVisible();
  await expect(page).toHaveTitle(`Wholesale — ${corrick.name}`);
});

test('[UC-RS-17] a draft, a path with no page, another site’s page and an address with no site all show a not-found page', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const first = await api.createSampleSite(corrick, `corrick-${token}.localhost`);
  const second = await api.createSampleSite(kestrel, `kestrel-${token}.localhost`);
  await first.createPage({ slug: 'coming-soon', title: 'Coming soon' });
  await first.publishPage({ slug: 'only-here', title: 'Only here' });

  const missing = [
    siteUrl(first.host, '/coming-soon'), // a draft
    siteUrl(first.host, '/nothing-here'), // no such page
    siteUrl(first.host, '/a/b/c'),
    siteUrl(second.host, '/only-here'), // the other site's page
    siteUrl(`nobody-${token}.localhost`, '/'), // no site on this address
  ];
  for (const url of missing) {
    const response = await page.goto(url);
    expect(response?.status(), url).toBe(404);
    await expect(notFoundPage(page), url).toBeVisible();
  }

  const found = await page.goto(siteUrl(first.host, '/only-here'));
  expect(found?.status()).toBe(200);
});

test('[UC-RS-17] a block the site cannot draw is left out, and the rest of the page still shows', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const made = await api.createSite('Robust Cafe', `robust-${token}.localhost`);
  await made.publishPage({
    slug: 'home',
    title: 'Home',
    blocks: [
      { type: 'hero', headline: 'Still here' },
      { type: 'hologram', note: 'a block type from the future' },
      { type: 'hero' }, // no headline: cannot be drawn
      { type: 'richText', html: '<p>Not drawn until stored HTML is cleaned on save</p><img src="x" onerror="alert(1)">' },
      { type: 'cta', heading: 'Unsafe link', action: { label: 'Click', href: 'javascript:alert(1)' } },
      { type: 'cta', heading: 'Real link', action: { label: 'Contact us', href: '/contact' } },
    ],
  });
  page.on('dialog', () => {
    throw new Error('a stored script ran');
  });

  const response = await page.goto(siteUrl(made.host));
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Still here');
  await expect(page.getByRole('heading', { name: 'Real link' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
  await expect(page.getByText('Unsafe link')).toHaveCount(0);
  await expect(page.getByText('Not drawn until stored HTML')).toHaveCount(0);
  await expect(page.locator('a[href^="javascript"], img[src="x"]')).toHaveCount(0);
  // A site with no theme of its own shows the default one.
  await expect(themeRoot(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('[UC-RS-18] publishing a page makes it appear on the site, and unpublishing takes it away again', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const made = await api.createSite('Launch Cafe', `launch-${token}.localhost`);
  await made.publishPage({ slug: 'home', title: 'Home', blocks: [{ type: 'hero', headline: 'Welcome' }] });
  const draft = await made.createPage({
    slug: 'launch',
    title: 'Launch day',
    blocks: [{ type: 'hero', headline: 'We are open' }],
  });
  const address = siteUrl(made.host, '/launch');
  const navLink = page.getByRole('navigation', { name: 'Launch Cafe navigation' }).getByRole('link', {
    name: 'Launch day',
  });

  // A draft is not there.
  expect((await page.goto(address))?.status()).toBe(404);
  await page.goto(siteUrl(made.host));
  await expect(navLink).toHaveCount(0);

  // Published, it shows at once, and the navigation lists it.
  await made.publish(draft.id);
  const live = await page.goto(address);
  expect(live?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('We are open');
  await expect(navLink).toBeVisible();

  // Unpublished, it is gone again.
  await made.unpublish(draft.id);
  expect((await page.goto(address))?.status()).toBe(404);
  await expect(notFoundPage(page)).toBeVisible();
  await page.goto(siteUrl(made.host));
  await expect(navLink).toHaveCount(0);
});

test('[UC-RS-20] the old demo addresses show a not-found page, on a real site and on an address with no site', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const made = await api.createSampleSite(corrick, `corrick-${token}.localhost`);

  for (const url of [
    siteUrl(made.host, '/preview/corrick'),
    siteUrl(made.host, '/preview/kestrel'),
    siteUrl(`nobody-${token}.localhost`, '/'),
    siteUrl('127.0.0.1', '/'),
  ]) {
    const response = await page.goto(url);
    expect(response?.status(), url).toBe(404);
    await expect(notFoundPage(page), url).toBeVisible();
  }
});
