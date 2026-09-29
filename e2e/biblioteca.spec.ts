import { expect, test } from './apoio';

test('Biblioteca vazia: "Importar norma" leva à importação e volta (9.5)', async ({ page }) => {
  await page.goto('/#/biblioteca');
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Importações pendentes' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Importar norma' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Importar norma' })).toBeVisible();
  await expect(page).toHaveURL(/#\/biblioteca\/importar$/);
  await expect(page.getByRole('link', { name: 'Biblioteca', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.getByRole('link', { name: 'Voltar à Biblioteca' }).click();
  await expect(page.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeVisible();
});
