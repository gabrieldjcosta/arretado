import { expect, test } from './apoio';

test('abre o app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arretado' })).toBeVisible();
});
