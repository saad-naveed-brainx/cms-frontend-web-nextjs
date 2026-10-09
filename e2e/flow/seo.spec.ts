import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { siteUrl, webPort } from './env';
import { readHead, realApi, unique } from './support';

/**
 * Search engines and share cards on the REAL flow (SEO-01): pages made through the real API, with
 * their search fields, and the `<head>` the real website sends for them, read from the HTML as the
 * server sent it to an ordinary browser (before any script runs), as a search engine or a person
 * viewing the page source sees it.
 */

/**
 * The `<head>` of the HTML the server sends for this address. It waits for the page to settle, so the
 * links Next.js loads ahead in the background finish before the next visit cuts them off.
 */
async function headOf(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  expect(response?.status(), url).toBe(200);
  return readHead(await response!.text());
}

const HERO = { type: 'hero', headline: 'Fresh every morning' };
const LOAF = {
  type: 'imageText',
  heading: 'Our loaf',
  body: 'Baked at five.',
  image: { src: '/media/corrick-flats.svg', alt: 'A loaf on the counter' },
  imagePosition: 'left',
};
const OVEN = {
  type: 'imageText',
  heading: 'The oven',
  body: 'Wood-fired.',
  image: { src: '/media/corrick-lot14.svg', alt: 'The oven' },
  imagePosition: 'right',
};

test('[UC-SEO-04] a page names itself to search engines and share cards in its <head>: title, description, its own address on the main host, and its first picture', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const main = `seo-${token}.localhost`;
  const second = `www.seo-${token}.localhost`;
  const site = await api.createSite('Orchard Bakery', [main, second]);
  await site.publishPage({
    slug: 'visit',
    title: 'Visit',
    seoTitle: 'Visit the bakery & café',
    seoDescription: 'Open every day from seven, on the harbour.',
    blocks: [HERO, LOAF, OVEN],
  });
  await site.publishPage({ slug: 'home', title: 'Home' });

  const head = await headOf(page, siteUrl(main, '/visit'));
  const address = `http://${main}:${webPort}/visit`;
  const picture = `http://${main}:${webPort}/media/corrick-flats.svg`;
  expect(head.title).toBe('Visit the bakery & café');
  expect(head.meta('description')).toBe('Open every day from seven, on the harbour.');
  expect(head.canonical).toBe(address);
  expect(head.meta('robots')).toBeNull();
  expect(head.meta('og:type')).toBe('website');
  expect(head.meta('og:site_name')).toBe('Orchard Bakery');
  expect(head.meta('og:title')).toBe('Visit the bakery & café');
  expect(head.meta('og:description')).toBe('Open every day from seven, on the harbour.');
  expect(head.meta('og:url')).toBe(address);
  expect(head.meta('og:image')).toBe(picture);
  expect(head.meta('og:image:alt')).toBe('A loaf on the counter');
  expect(head.meta('twitter:card')).toBe('summary_large_image');
  expect(head.meta('twitter:title')).toBe('Visit the bakery & café');
  expect(head.meta('twitter:image')).toBe(picture);

  // Visited through the site's other address, the page still names its main address.
  const throughSecond = await headOf(page, siteUrl(second, '/visit'));
  expect(throughSecond.canonical).toBe(address);
  expect(throughSecond.meta('og:image')).toBe(picture);

  // The home page's address is the site's own, whichever way it is reached (Next writes the root
  // without its slash: the same address).
  expect((await headOf(page, siteUrl(main, '/'))).canonical).toBe(`http://${main}:${webPort}`);
  expect((await headOf(page, siteUrl(main, '/home'))).canonical).toBe(`http://${main}:${webPort}`);
});

test('[UC-SEO-05] a page’s own canonical address wins, a page without search fields or pictures stays plain, and a hidden page says noindex', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const host = `plain-${token}.localhost`;
  const site = await api.createSite('Maple Books', host);
  await site.publishPage({
    slug: 'reprint',
    title: 'Reprint',
    canonicalUrl: 'https://maple.example/essays/original?from=1&to=2',
    blocks: [
      {
        ...LOAF,
        image: { src: 'https://images.maple.example/cover.jpg', alt: 'The cover' },
      },
    ],
  });
  await site.publishPage({ slug: 'plain', title: 'Plain page', blocks: [HERO] });
  await site.publishPage({ slug: 'hidden', title: 'Hidden page', noIndex: true });

  const reprint = await headOf(page, siteUrl(host, '/reprint'));
  expect(reprint.canonical).toBe('https://maple.example/essays/original?from=1&to=2');
  expect(reprint.meta('og:url')).toBe('https://maple.example/essays/original?from=1&to=2');
  expect(reprint.meta('og:image')).toBe('https://images.maple.example/cover.jpg');

  const plain = await headOf(page, siteUrl(host, '/plain'));
  expect(plain.title).toBe('Plain page — Maple Books');
  expect(plain.meta('description')).toBeNull();
  expect(plain.canonical).toBe(`http://${host}:${webPort}/plain`);
  expect(plain.meta('og:title')).toBe('Plain page');
  expect(plain.meta('og:description')).toBeNull();
  expect(plain.meta('og:image')).toBeNull();
  expect(plain.meta('twitter:card')).toBe('summary');

  // Kept out of search results, but its links may still be followed, as WordPress does; no canonical.
  const hidden = await headOf(page, siteUrl(host, '/hidden'));
  expect(hidden.meta('robots')).toBe('noindex, follow');
  expect(hidden.canonical).toBeNull();
});

test('[UC-SEO-06] a blog page names each of its pages, and a preview is never indexed and names no address', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const host = `seoblog-${token}.localhost`;
  const site = await api.createSite('Corrick Journal', host);
  for (let n = 1; n <= 11; n += 1) {
    await site.publishPage({ type: 'post', slug: `post-${n}`, title: `Post ${n}` });
  }

  const first = await headOf(page, siteUrl(host, '/blog'));
  expect(first.title).toBe('Posts — Corrick Journal');
  expect(first.canonical).toBe(`http://${host}:${webPort}/blog`);
  expect(first.meta('og:title')).toBe('Posts');
  expect(first.meta('og:site_name')).toBe('Corrick Journal');
  const second = await headOf(page, siteUrl(host, '/blog?page=2'));
  expect(second.canonical).toBe(`http://${host}:${webPort}/blog?page=2`);

  const draft = await site.createPage({
    slug: 'draft',
    title: 'Draft',
    seoTitle: 'Draft for search',
    blocks: [LOAF],
  });
  const link = await site.previewLink(draft.id);
  const preview = await headOf(page, siteUrl(host, `/draft?preview=${encodeURIComponent(link)}`));
  expect(preview.title).toBe('Preview: Draft for search');
  expect(preview.meta('robots')).toBe('noindex, nofollow');
  expect(preview.canonical).toBeNull();
  expect(preview.meta('og:url')).toBeNull();
  expect(preview.meta('og:image')).toBeNull();
});
