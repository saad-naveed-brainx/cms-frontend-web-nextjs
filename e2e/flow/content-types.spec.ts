import { expect, test } from '@playwright/test';
import { siteUrl } from './env';
import { realApi, unique } from './support';

/**
 * A content type made at runtime on the REAL flow (feature content-types, D-043): made through the
 * real API, it routes on the real website at once. No build, no deploy, no website change.
 */

test('[UC-CT-03] a type made through the API routes on the website at once: its item, its list and its menu link', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const made = await api.createSite('Recipe Cafe', `recipes-${unique()}.localhost`);
  const type = await made.createType('Recipe', '/recipes');

  // Made, nothing published yet: the list is there and says so; the menu has no link.
  const nav = page.getByRole('navigation', { name: 'Recipe Cafe navigation' });
  expect((await page.goto(siteUrl(made.host, '/recipes')))?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recipes');
  await expect(nav.getByRole('link', { name: 'Recipes' })).toHaveCount(0);

  const item = await made.createPage({
    type: type.slug,
    slug: 'seeded-rye',
    title: 'Seeded rye',
    blocks: [{ type: 'hero', headline: 'Seeded rye, every Saturday' }],
  });
  await made.publish(item.id);

  expect((await page.goto(siteUrl(made.host, '/recipes/seeded-rye')))?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seeded rye, every Saturday');
  await expect(page).toHaveTitle('Seeded rye — Recipe Cafe');

  await nav.getByRole('link', { name: 'Recipes' }).click();
  await expect(page).toHaveURL(siteUrl(made.host, '/recipes'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recipes');
  await expect(page.getByRole('link', { name: 'Seeded rye' })).toHaveAttribute('href', '/recipes/seeded-rye');
});
