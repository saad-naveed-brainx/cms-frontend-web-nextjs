import { expect, test } from '@playwright/test';
import { baseURL, revalidateSecret, siteUrl } from './env';
import { realApi, unique, writeBlocks } from './support';

/**
 * The website's cache on the REAL flow (CNT-08, D-032): the website keeps the API's answers per site
 * address and page, and the real API tells it to forget a site when something on it is published.
 * A change written straight to the database tells nobody, so it shows whether an answer came from
 * the cache.
 */

const hero = (headline: string) => [{ type: 'hero', headline }];

test('[UC-CC-04] a visited page is remembered, and a publish on its site makes the website forget it at once', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const site = await api.createSite('Cached Bakery', `cached-${unique()}.localhost`);
  const home = await site.publishPage({ slug: 'home', title: 'Home', blocks: hero('Before') });

  await page.goto(siteUrl(site.host));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Before');

  // Changed behind the API's back: nobody tells the website, so it keeps showing what it has.
  writeBlocks(home.id, hero('After'));
  await page.goto(siteUrl(site.host));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Before');

  // A publish on the same site, through the API: the website forgets the site, and shows the change.
  await site.publishPage({ slug: 'news', title: 'News' });
  await page.goto(siteUrl(site.host));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('After');
  await expect(page.getByRole('navigation').first().getByRole('link', { name: 'News' })).toBeVisible();
});

test('[UC-CC-05] two sites with a page at the same address each keep their own, however they are visited', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const first = await api.createSite('First Bakery', `first-${token}.localhost`);
  const second = await api.createSite('Second Books', `second-${token}.localhost`);
  await first.publishPage({ slug: 'about', title: 'About', blocks: hero('We bake bread') });
  await second.publishPage({ slug: 'about', title: 'About', blocks: hero('We sell books') });

  for (let round = 0; round < 2; round += 1) {
    await page.goto(siteUrl(first.host, '/about'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We bake bread');
    await page.goto(siteUrl(second.host, '/about'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We sell books');
  }
});

test('[UC-CC-06] only the API, with the shared secret and a list of addresses, can make the website forget', async ({
  request,
}) => {
  const forget = (headers: Record<string, string>, data: unknown) =>
    request.post(`${baseURL}/api/revalidate`, { headers, data });

  expect((await forget({}, { hosts: ['a.localhost'] })).status()).toBe(401);
  expect((await forget({ authorization: 'Bearer wrong' }, { hosts: ['a.localhost'] })).status()).toBe(401);

  const good = { authorization: `Bearer ${revalidateSecret}` };
  for (const bad of [{}, { hosts: [] }, { hosts: 'a.localhost' }, { hosts: [42] }]) {
    expect((await forget(good, bad)).status()).toBe(400);
  }

  const done = await forget(good, { hosts: ['Cafe.Localhost:3000', 'cafe.localhost'] });
  expect(done.status()).toBe(200);
  expect(await done.json()).toEqual({ forgotten: ['site:cafe.localhost'] });
});
