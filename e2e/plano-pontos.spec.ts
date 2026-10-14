import { expect, semViolacoes, test } from './apoio';

test('Pontos do programa: matéria, ponto, faixa e adiar (B3)', async ({ page }) => {
  await page.goto('/#/plano/pontos');
  await expect(page.getByRole('heading', { level: 1, name: 'Pontos do programa' })).toBeVisible();
  await semViolacoes(page);

  await page.getByText('Nova matéria').click();
  await page.getByLabel('Nome da matéria').fill('Direito Civil');
  await page.getByRole('button', { name: 'Adicionar matéria' }).click();
  const secao = page.getByRole('region', { name: 'Direito Civil' });
  await secao.getByText('Adicionar ponto').click();
  await secao.getByLabel('Título do ponto').fill('Prescrição');
  await secao.getByRole('button', { name: 'Salvar ponto' }).click();
  await expect(secao.getByText('Não iniciado')).toBeVisible();
  await semViolacoes(page);

  await secao.getByRole('link', { name: 'Prescrição' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Prescrição' })).toBeVisible();
  await page.getByLabel('Faixa').selectOption('altissima');
  await page.getByText('Histórico da faixa').click();
  await expect(page.getByText(/sem faixa para Altíssima/)).toBeVisible();
  await page.getByLabel('Adiar até').fill('2099-01-01');
  await page.getByRole('button', { name: 'Adiar', exact: true }).click();
  await expect(page.getByText(/Adiado até 2099-01-01/)).toBeVisible();
  await semViolacoes(page);
});
