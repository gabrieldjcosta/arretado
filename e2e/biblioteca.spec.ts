import { colar, expect, publicar, semViolacoes, test } from './apoio';

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

test('colar a LEP e o ECA compilados e publicar: as normas aparecem na Biblioteca (9.5)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/#/biblioteca/importar');
  await colar(page, 'lep-compilado');

  const estrutura = page.getByRole('region', { name: 'Estrutura encontrada' });
  await expect(estrutura).toBeVisible({ timeout: 30_000 });
  await expect(estrutura.locator('.contagens > div').filter({ hasText: 'Artigos' })).toHaveText(
    'Artigos219',
  );
  await expect(page.getByRole('region', { name: 'Avisos' })).toContainText(
    'Nenhuma linha tachada: a página parece a compilada',
  );
  await expect(page.getByRole('textbox', { name: 'Título curto' })).toHaveValue(
    'Lei nº 7.210/1984',
  );
  await expect(page).toHaveURL(/#\/biblioteca\/importar\/[0-9a-f-]+$/);
  await semViolacoes(page);

  // A faixa do rascunho pendente, e retomar por ela.
  await page.getByRole('link', { name: 'Biblioteca', exact: true }).click();
  const faixa = page.getByRole('region', { name: 'Importações pendentes' });
  await expect(faixa).toContainText('Lei nº 7.210/1984: importação pendente de revisão');
  await expect(page.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeVisible();
  await semViolacoes(page);
  await faixa.getByRole('link', { name: 'Retomar a importação de Lei nº 7.210/1984' }).click();
  await expect(estrutura).toBeVisible({ timeout: 30_000 });
  await publicar(page, 'LEP');

  const normas = page.getByRole('region', { name: 'Normas' });
  await expect(normas.getByText('LEP', { exact: true })).toBeVisible();
  await expect(faixa).toHaveCount(0);
  await semViolacoes(page);

  await normas.getByRole('link', { name: 'Importar norma' }).click();
  await colar(page, 'eca-compilado');
  await expect(estrutura).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('textbox', { name: 'Título curto' })).toHaveValue(
    'Lei nº 8.069/1990',
  );
  await publicar(page, 'ECA');
  await expect(normas.getByText('ECA', { exact: true })).toBeVisible();
  await expect(normas.getByText('LEP', { exact: true })).toBeVisible();

  // A mesma página de novo: não vira outra norma.
  await normas.getByRole('link', { name: 'Importar norma' }).click();
  await colar(page, 'lep-compilado');
  await expect(page.getByText('LEP já está na Biblioteca, com este mesmo texto.')).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('link', { name: 'Ver na Biblioteca' }).click();
  await expect(normas.locator('li')).toHaveCount(2);
});

test('colar a LEP com todas as redações mostra o aviso de tachado (9.5)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/#/biblioteca/importar');
  await colar(page, 'lep');

  const avisos = page.getByRole('region', { name: 'Avisos' });
  await expect(avisos).toContainText(
    '85 linha(s) tachada(s), de redação anterior, ficaram de fora.',
    {
      timeout: 30_000,
    },
  );
  await expect(avisos).not.toContainText('parece a compilada');
  await expect(page.getByRole('region', { name: 'Ficou de fora' })).toContainText(
    '85 linhas tachadas (redação anterior)',
  );

  await page.getByRole('button', { name: 'Descartar rascunho' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'descartada' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeVisible();
});
