import { expect, test } from '@playwright/test';
import { PALETTES } from '../../src/site/palettes';
import { siteUrl } from './env';
import { asRgb, realApi, unique } from './support';

/**
 * A site's appearance on the REAL flow (GOV-04): saved through the real API route the admin's
 * Appearance screen uses, drawn by the real website. Caching is on, as in production, so a later
 * save showing at once proves the website was told.
 */

const HERO = {
  type: 'hero',
  headline: 'Fresh every morning',
  primaryAction: { label: 'See the menu', href: '/menu' },
};
const [, harbour, bakery] = PALETTES;

test('[UC-AP-06] the header shows the tagline, the footer the note, and the page the chosen palette; a later save shows at once, and another site is untouched', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const token = unique();
  const site = await api.createSite('Orchard Bakery', `look-${token}.localhost`);
  const other = await api.createSite('Maple Books', `look-other-${token}.localhost`);
  await site.publishPage({ slug: 'home', title: 'Home', blocks: [HERO] });
  await other.publishPage({ slug: 'home', title: 'Home', blocks: [HERO] });
  await site.setAppearance({
    tagline: 'Baked at five',
    footerNote: '12 Harbour Street · Open daily from 7',
    theme: {
      typeSet: 'editorial',
      shape: 'soft',
      density: 'comfortable',
      texture: 'none',
      palette: harbour.palette,
    },
  });

  await page.goto(siteUrl(site.host));
  const header = page.getByRole('banner');
  const footer = page.getByRole('contentinfo');
  const button = page.getByRole('link', { name: 'See the menu' });
  await expect(header).toContainText('Orchard Bakery');
  await expect(header).toContainText('Baked at five');
  await expect(footer).toContainText('12 Harbour Street · Open daily from 7');
  await expect(button).toHaveCSS('background-color', asRgb(harbour.palette.brand));

  // Seen once, so the website holds the answer; a new save must still show on the next visit.
  await site.setAppearance({
    name: 'Orchard & Co',
    tagline: '',
    theme: {
      typeSet: 'technical',
      shape: 'sharp',
      density: 'tight',
      texture: 'grid',
      palette: bakery.palette,
    },
  });
  await page.goto(siteUrl(site.host));
  await expect(header).toContainText('Orchard & Co');
  await expect(header).not.toContainText('Baked at five');
  await expect(footer).toContainText('12 Harbour Street · Open daily from 7');
  await expect(button).toHaveCSS('background-color', asRgb(bakery.palette.brand));
  await expect(button).toHaveCSS('border-radius', '0px');

  // The other site keeps the default look and has no tagline or note.
  await page.goto(siteUrl(other.host));
  await expect(header).toContainText('Maple Books');
  await expect(footer).not.toContainText('Harbour Street');
  await expect(button).toHaveCSS('background-color', asRgb(PALETTES[0].palette.brand));
});
