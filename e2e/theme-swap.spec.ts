import { expect, test } from '@playwright/test';

test.describe('dev comparison view', () => {
  test('swapping themes moves each tenant onto the other tenant\'s theme, and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Two tenants, one set of block components' })).toBeVisible();

    const swap = page.getByRole('button', { name: 'Swap themes' });
    await expect(swap).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('theme: corrick')).toBeVisible();

    await swap.click();

    const restore = page.getByRole('button', { name: 'Restore themes' });
    await expect(restore).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('theme borrowed from Kestrel Rigging')).toBeVisible();
    await expect(page.getByText('theme borrowed from Corrick Oyster Co.')).toBeVisible();

    await restore.click();

    await expect(page.getByRole('button', { name: 'Swap themes' })).toBeVisible();
    await expect(page.getByText('theme: corrick')).toBeVisible();
  });

  test('a tenant that does not exist gets a 404 page', async ({ page }) => {
    const response = await page.goto('/preview/no-such-tenant');

    expect(response?.status()).toBe(404);
  });
});
