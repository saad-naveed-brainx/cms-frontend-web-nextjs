import { expect, test } from '@playwright/test';

const widths = [375, 768, 1280];

for (const width of widths) {
  test(`Corrick's full page looks as approved at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preview/corrick');
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`corrick-${width}.png`, { fullPage: true });
  });
}
