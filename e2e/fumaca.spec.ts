import { expect, telaDoAgora, test } from './apoio';

test('abre o app no Agora', async ({ page }) => {
  await page.goto('/');
  await expect(telaDoAgora(page)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
});
