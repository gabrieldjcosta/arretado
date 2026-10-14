import { expect, semViolacoes, test } from './apoio';

test('Sessão leve: começa, pausa, volta ao reabrir, fecha com próximo passo (A2)', async ({
  page,
}) => {
  await page.goto('/#/sessao/iniciar');
  await expect(page.getByRole('heading', { level: 1, name: 'Começar uma Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByText('Dizer o que e até onde (opcional)').click();
  await page.getByLabel('O que vai estudar?').fill('Lei de Execução Penal');
  await page.getByLabel('Até onde?').fill('até o art. 15');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pausada' })).toBeVisible();
  await semViolacoes(page);

  // Ao voltar (recarregar), a Sessão aberta continua lá.
  await page.reload();
  await expect(page.getByText('Até onde: até o art. 15')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à Sessão' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

  await page.getByRole('link', { name: 'Encerrar' }).click();
  const campo = page.getByLabel('Próximo passo (opcional)');
  await expect(campo).toHaveValue('Continuar depois de até o art. 15');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
  await semViolacoes(page);
});
