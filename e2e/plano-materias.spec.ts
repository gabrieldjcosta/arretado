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

const CSV_LONGO =
  'Disciplina;Código;Ponto;Faixa\nPrincípios Institucionais e Organização da Defensoria Pública do Estado de São Paulo;1;Autonomia funcional;Alta\nDireito Civil;1;Contratos;Alta\n';

test('Trilha: nome longo quebra ao lado da seta, e a contagem não desce para baixo dela', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/#/plano');
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV_LONGO, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();

  const resumo = page.locator('.trilha-materia > summary').filter({ hasText: 'Princípios' });
  const seta = await resumo.locator('.trilha-seta').boundingBox();
  const nome = await resumo.getByRole('heading', { level: 2 }).boundingBox();
  const conta = await resumo.locator('.dica').boundingBox();
  const linha = await resumo.boundingBox();
  if (!seta || !nome || !conta || !linha) throw new Error('sem caixa na tela');
  // O nome fica ao lado da seta (não embaixo dela), e a seta na altura da primeira linha.
  expect(nome.x).toBeGreaterThan(seta.x + seta.width);
  expect(Math.abs(seta.y + seta.height / 2 - (nome.y + 12))).toBeLessThan(6);
  // A contagem fica na coluna do nome, nunca na da seta.
  expect(conta.x).toBeGreaterThanOrEqual(nome.x - 1);
  expect(linha.height).toBeGreaterThanOrEqual(44);
});
