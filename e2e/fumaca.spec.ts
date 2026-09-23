import { expect, test } from './apoio';

test('abre o app no Hoje', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});
