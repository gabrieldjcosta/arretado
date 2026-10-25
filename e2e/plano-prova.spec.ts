import { expect, semViolacoes, test } from './apoio';

// A data da prova objetiva (AP-03): um campo opcional no Plano; fica guardada, sem contagem regressiva.
test('guardar a data da prova no Plano, ver depois de recarregar e tirar', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00-03:00'));
  await page.goto('/#/plano');
  const campo = page.getByLabel('Data da prova objetiva (opcional)');
  await expect(campo).toBeVisible();
  const caixa = await page.getByRole('button', { name: 'Guardar a data' }).boundingBox();
  expect(caixa?.height).toBeGreaterThanOrEqual(44);
  await semViolacoes(page);

  await campo.fill('2027-01-10');
  await page.getByRole('button', { name: 'Guardar a data' }).click();
  await expect(page.getByText('Prova guardada: 10/01/2027.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Data da prova objetiva (opcional)')).toHaveValue('2027-01-10');
  await expect(page.getByText(/faltam|contagem regressiva/i)).toHaveCount(0);

  await page.getByRole('button', { name: 'Tirar a data' }).click();
  await expect(page.getByLabel('Data da prova objetiva (opcional)')).toHaveValue('');
});
