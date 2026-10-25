import { expect, semViolacoes, test } from './apoio';

// A data da prova objetiva (AP-03): linha recolhida no Plano; fica guardada, sem contagem regressiva.
test('informar a data da prova no Plano, ver depois de recarregar e tirar', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00-03:00'));
  await page.goto('/#/plano');
  const abrir = page.getByRole('button', { name: 'Informar a data da prova (opcional)' });
  await expect(abrir).toHaveAttribute('aria-expanded', 'false');
  expect((await abrir.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await abrir.click();
  const campo = page.getByLabel('Data da prova objetiva (opcional)');
  await expect(campo).toBeFocused();
  await campo.fill('2026-10-25');
  await expect(page.getByText('Escolha uma data depois de hoje.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar a data' })).toHaveCount(0);
  await campo.fill('2027-01-10');
  const guardar = page.getByRole('button', { name: 'Guardar a data' });
  expect((await guardar.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await semViolacoes(page);
  await guardar.click();
  await expect(page.getByText('Prova objetiva: 10/01/2027')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mudar' })).toBeFocused();
  await page.reload();
  await expect(page.getByText('Prova objetiva: 10/01/2027')).toBeVisible();
  await expect(page.getByText(/faltam|contagem regressiva/i)).toHaveCount(0);

  await page.getByRole('button', { name: 'Tirar' }).click();
  await expect(
    page.getByRole('button', { name: 'Informar a data da prova (opcional)' }),
  ).toBeVisible();
});
