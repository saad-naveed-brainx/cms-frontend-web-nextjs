import { expect, request as playwrightRequest, test } from '@playwright/test';
import { corrick, kestrel } from '../support/sample-sites';
import { siteUrl } from '../flow/env';
import { realApi, sql } from '../flow/support';

/**
 * Screenshots of real sites against the approved baselines: two sites made through the real API
 * (the same sample content every run, on fixed addresses so the footer reads the same), each in its
 * own theme, with every block the editor offers, at three widths. The flow's tests are in e2e/flow/.
 */

const sites = [
  { key: 'corrick', host: 'corrick.localhost', sample: corrick },
  { key: 'kestrel', host: 'kestrel.localhost', sample: kestrel },
];

/** A blog of its own, so the two sites' menus stay as they are: three posts on fixed dates. */
const blog = {
  host: 'corrick-journal.localhost',
  posts: [
    { slug: 'rye-season', title: 'Rye season is here', at: '2026-10-06T08:00:00Z' },
    { slug: 'night-shift', title: 'A night on the bread shift', at: '2026-09-28T08:00:00Z' },
    { slug: 'new-oven', title: 'We built a new oven', at: '2026-09-14T08:00:00Z' },
  ],
};

// One worker makes the two sites once, then every screenshot visits them.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const context = await playwrightRequest.newContext();
  const api = await realApi(context);
  for (const { sample, host } of sites) await api.createSampleSite(sample, host);
  const journal = await api.createSite('Corrick Journal', blog.host, corrick.theme);
  for (const post of blog.posts) {
    const made = await journal.publishPage({ type: 'post', slug: post.slug, title: post.title });
    sql(`UPDATE content SET published_at = '${post.at}' WHERE id = '${made.id}'`);
  }
  await context.dispose();
});

for (const { key, host, sample } of sites) {
  for (const width of [375, 768, 1280]) {
    test(`[UC-RS-19] ${sample.name}'s home page looks as approved at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(siteUrl(host));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(sample.headline);
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${key}-home-${width}.png`, { fullPage: true });
    });
  }
}

for (const width of [375, 1280]) {
  test(`[UC-BP-06] a blog page looks as approved at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(siteUrl(blog.host, '/blog'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts');
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`blog-${width}.png`, { fullPage: true });
  });
}
