import { expect, semViolacoes, test } from './apoio';

test('Aparência: o seletor de lua e sol troca o tema nos dois sentidos', async ({ page }) => {
  await page.goto('/#/conta/aparencia');
  const html = page.locator('html');
  const seletor = page.getByRole('button', { name: 'Alternar entre noite e dia' });
  await page.emulateMedia({ colorScheme: 'dark' });

  await seletor.click();
  await expect(html).toHaveAttribute('data-tema', 'claro');
  await expect(page.getByRole('radio', { name: 'Claro' })).toBeChecked();
  await semViolacoes(page);

  await seletor.click();
  await expect(html).toHaveAttribute('data-tema', 'escuro');
  await expect(page.getByRole('radio', { name: 'Escuro' })).toBeChecked();
  await semViolacoes(page);
});
