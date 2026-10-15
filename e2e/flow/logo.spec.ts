import { expect, test } from '@playwright/test';
import { siteUrl } from './env';
import { realApi, sql, unique } from './support';

/**
 * The site's logo on the REAL flow (feature media, MED-03): a picture uploaded to the real API's
 * media library, chosen as the logo through the real Appearance route, drawn in the header.
 */

/** A real 96 × 64 PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAMAAADS6oI8AAAAA1BMVEXWhD6w8DS8AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAHUlEQVRYw+3BMQEAAADCoPVP7W0HoAAAAAAAAN4AGEAAAVgzK50AAAAASUVORK5CYII=',
  'base64',
);

test('[UC-MD-08] a site with a logo shows it in the header beside its name, loaded from the API; without one, or with an unsafe one, the name alone', async ({
  page,
  request,
}) => {
  const api = await realApi(request);
  const made = await api.createSite('Logo Cafe', `logo-${unique()}.localhost`);
  const logo = await made.uploadPicture('logo.png', PNG);
  await made.setAppearance({ logoUrl: logo });

  await page.goto(siteUrl(made.host));
  const home = page.getByRole('banner').getByRole('link', { name: 'Logo Cafe' });
  const picture = home.locator('img');
  await expect(picture).toHaveAttribute('src', logo);
  await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(96);
  await expect(home).toHaveAttribute('href', '/');

  // Removed: the name alone.
  await made.setAppearance({ logoUrl: '' });
  await page.reload();
  await expect(home).toBeVisible();
  await expect(home.locator('img')).toHaveCount(0);

  // A stored logo that is not an address a picture may load from is ignored (written by SQL: the API refuses it).
  const other = await api.createSite('Sneaky Cafe', `sneaky-${unique()}.localhost`);
  sql(`UPDATE sites SET settings = '{"logoUrl":"javascript:alert(1)"}'::jsonb WHERE name = 'Sneaky Cafe'`);
  await page.goto(siteUrl(other.host));
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sneaky Cafe' })).toBeVisible();
  await expect(page.getByRole('banner').locator('img')).toHaveCount(0);
});
