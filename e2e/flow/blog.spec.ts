import { expect, test } from '@playwright/test';
import { corrick } from '../support/sample-sites';
import { siteUrl } from './env';
import { realApi, sql, unique } from './support';

/**
 * The blog page on the REAL flow (feature blog-page): posts made and published through the real
 * API, listed by the real website at /blog of their own site, newest first.
 */

test('[UC-BP-04] /blog lists the site’s published posts, newest first, each linking to the post, and the menu links to it', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const site = await api.createSite(corrick.name, `blog-${token}.localhost`, corrick.theme);
  const other = await api.createSite('Elsewhere', `elsewhere-${token}.localhost`);
  const older = await site.publishPage({ type: 'post', slug: 'older', title: 'Older news' });
  const newer = await site.publishPage({
    type: 'post',
    slug: 'newer',
    title: 'Newer news',
    blocks: [{ type: 'hero', headline: 'Fresh this week' }],
  });
  sql(`UPDATE content SET published_at = '2026-10-01T09:00:00Z' WHERE id = '${older.id}'`);
  sql(`UPDATE content SET published_at = '2026-10-05T09:00:00Z' WHERE id = '${newer.id}'`);
  await site.createPage({ type: 'post', slug: 'unfinished', title: 'Not ready' });
  await site.publishPage({ slug: 'home', title: 'Home' });
  await other.publishPage({ type: 'post', slug: 'theirs', title: 'Another site’s post' });

  await page.goto(siteUrl(site.host));
  await page
    .getByRole('navigation', { name: `${corrick.name} navigation` })
    .getByRole('link', { name: 'Posts' })
    .click();
  await expect(page).toHaveURL(siteUrl(site.host, '/blog'));
  await expect(page).toHaveTitle(`Posts — ${corrick.name}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts');

  const items = page.locator('main li');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('Newer news');
  await expect(items.nth(0)).toContainText('5 October 2026');
  await expect(items.nth(1)).toContainText('Older news');
  await expect(page.getByText('Not ready')).toHaveCount(0);
  await expect(page.getByText('Another site’s post')).toHaveCount(0);

  await page.getByRole('link', { name: 'Newer news' }).click();
  await expect(page).toHaveURL(siteUrl(site.host, '/blog/newer'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fresh this week');
});

test('[UC-BP-05] a long blog pages through ten at a time, and a site with no posts says so', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const site = await api.createSite('Busy blog', `busy-${token}.localhost`);
  for (let n = 1; n <= 12; n += 1) {
    const made = await site.publishPage({ type: 'post', slug: `post-${n}`, title: `Post ${n}` });
    sql(
      `UPDATE content SET published_at = '2026-10-01T${String(n).padStart(2, '0')}:00:00Z' WHERE id = '${made.id}'`,
    );
  }

  await page.goto(siteUrl(site.host, '/blog'));
  await expect(page.locator('main li')).toHaveCount(10);
  await expect(page.locator('main li').first()).toContainText('Post 12');
  await page.getByRole('link', { name: 'Older →' }).click();
  await expect(page).toHaveURL(siteUrl(site.host, '/blog?page=2'));
  await expect(page).toHaveTitle('Posts, page 2 — Busy blog');
  await expect(page.locator('main li')).toHaveCount(2);
  await page.getByRole('link', { name: '← Newer' }).click();
  await expect(page).toHaveURL(siteUrl(site.host, '/blog'));

  const pastTheEnd = await page.goto(siteUrl(site.host, '/blog?page=9'));
  expect(pastTheEnd?.status()).toBe(404);

  const quiet = await api.createSite('Quiet', `quiet-${token}.localhost`);
  await page.goto(siteUrl(quiet.host, '/blog'));
  await expect(page.getByText('Nothing has been published here yet.')).toBeVisible();
});
