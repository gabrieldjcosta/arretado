import { expect, semViolacoes, test } from './apoio';

const CSV =
  'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\nDireito Penal;1;Furto;Alta\nDireito Penal;2;Roubo;Média\n';

test('Trilha: matérias recolhidas; tocar no nome abre e fecha os assuntos', async ({ page }) => {
  await page.goto('/#/plano');
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Direito Penal' })).toBeVisible();
  await expect(page.getByText('2 pontos')).toBeVisible();
  await expect(page.getByText('1. Furto')).toBeHidden();

  await page.getByRole('heading', { level: 2, name: 'Direito Penal' }).click();
  await expect(page.getByText('1. Furto')).toBeVisible();
  await expect(page.getByText('1. Progressão de regime')).toBeHidden();
  await semViolacoes(page);

  await page.getByRole('heading', { level: 2, name: 'Direito Penal' }).click();
  await expect(page.getByText('1. Furto')).toBeHidden();
});
