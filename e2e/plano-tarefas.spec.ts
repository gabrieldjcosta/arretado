import { expect, semViolacoes, test } from './apoio';

test('Tarefas: adicionar, dividir, começar uma Sessão e concluir (B4)', async ({ page }) => {
  await page.goto('/#/plano/tarefas');
  await expect(page.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible();
  await semViolacoes(page);

  await page.getByLabel('O que fazer?').fill('Estudar execução penal');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  const fila = page.getByRole('region', { name: 'Fila' });
  await expect(fila.getByText('Estudar execução penal')).toBeVisible();
  await fila.getByText('Mais', { exact: true }).click();
  await fila.getByLabel('Dividir (uma parte por linha)').fill('Ler arts. 1 a 5\nLer arts. 6 a 10');
  await fila.getByRole('button', { name: 'Dividir esta tarefa' }).click();
  await expect(fila.getByText('Ler arts. 1 a 5')).toBeVisible();
  await semViolacoes(page);

  await fila.getByRole('link', { name: 'Começar' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();

  await page.goto('/#/plano/tarefas');
  await page.getByRole('button', { name: 'Feita' }).first().click();
  await expect(page.getByText('Feitas (1)')).toBeVisible();
  await semViolacoes(page);
});
