import { expect, request as playwrightRequest, test } from '@playwright/test';
import { corrick, kestrel } from '../support/sample-sites';
import { siteUrl } from '../flow/env';
import { realApi } from '../flow/support';

/**
 * Screenshots of real sites against the approved baselines: two sites made through the real API
 * (the same sample content every run, on fixed addresses so the footer reads the same), each in its
 * own theme, with every block the editor offers, at three widths. The flow's tests are in e2e/flow/.
 */

const sites = [
  { key: 'corrick', host: 'corrick.localhost', sample: corrick },
  { key: 'kestrel', host: 'kestrel.localhost', sample: kestrel },
];

// One worker makes the two sites once, then every screenshot visits them.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const context = await playwrightRequest.newContext();
  const api = await realApi(context);
  for (const { sample, host } of sites) await api.createSampleSite(sample, host);
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
