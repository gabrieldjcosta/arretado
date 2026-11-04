import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// O Arretado novo (prévia do Fio, D-D25): o Agora com o fio que se puxa, o passo, o Destino e o Varal. O
// jsdom não tem layout nem ponteiro de verdade; aqui o navegador confere o arrasto, que a pílula dos
// lugares não cobre o que a tela mostra e que as quatro telas passam no axe em tema claro e escuro.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Traz uma matéria pelo edital (a Trilha é igual nas duas interfaces) e liga a prévia. */
async function comMateriaNaPrevia(page: Page) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
}

test('o Agora mostra o fio, o que vem na ponta e os três lugares embaixo', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);

  const puxador = page.getByRole('button', { name: /Puxe o fio/ });
  const ponta = page.getByRole('group', { name: 'Na ponta do fio' });
  await expect(puxador).toBeVisible();
  await expect(ponta).toContainText('Adicionar a lei de Execução Penal');

  const nav = page.getByRole('navigation', { name: 'Lugares' });
  await expect(nav.getByRole('link')).toHaveText(['Agora', 'Destino', 'Varal']);
  await expect(nav.getByRole('link', { name: 'Agora' })).toHaveAttribute('aria-current', 'page');

  // A pílula não cobre o cartão da ponta do fio, nem a página ganha rolagem lateral.
  const [caixaNav, caixaPonta] = await Promise.all([nav.boundingBox(), ponta.boundingBox()]);
  if (!caixaNav || !caixaPonta) throw new Error('sem caixa');
  expect(caixaPonta.y + caixaPonta.height).toBeLessThanOrEqual(caixaNav.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  // O nó que se puxa é um alvo de toque de verdade (84 px).
  const caixaNo = await puxador.boundingBox();
  expect(caixaNo?.width).toBeGreaterThanOrEqual(80);

  await semViolacoes(page);
});

test('com zoom de 200% (195 px de layout), o cabeçalho e a pílula cabem sem rolar de lado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 195, height: 400 });
  await comMateriaNaPrevia(page);

  // A pílula fica numa linha só (rótulo quebrado em letras a deixaria com mais de 100 px) e a página não rola de lado.
  const nav = page.getByRole('navigation', { name: 'Lugares' });
  await expect(nav).toBeVisible();
  const caixa = await nav.boundingBox();
  if (!caixa) throw new Error('sem caixa');
  expect(caixa.height).toBeLessThan(70);
  expect(caixa.x).toBeGreaterThanOrEqual(0);
  expect(caixa.x + caixa.width).toBeLessThanOrEqual(195);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await semViolacoes(page);
});

test('arrastar o nó para baixo e soltar puxa o fio e abre o passo', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);

  const puxador = page.getByRole('button', { name: /Puxe o fio/ });
  const caixa = await puxador.boundingBox();
  if (!caixa) throw new Error('sem caixa');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;

  // Soltar antes do limite devolve o nó ao lugar e não puxa nada.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('group', { name: 'Na ponta do fio' })).toBeVisible();
  expect(page.url()).not.toContain('/fio/passo');

  // Além de 70 px, puxa.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 110, { steps: 8 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  const passo = page.getByRole('region', { name: 'Passo do Fio' });
  await expect(passo.getByRole('heading', { level: 1 })).toHaveText(
    'Adicionar a lei de Execução Penal',
  );
  await expect(passo.getByRole('link', { name: 'Escolher a lei' })).toBeVisible();
  await semViolacoes(page);

  // Pular não custa nada: a etapa fecha sem fato e o pouso deixa a pessoa descansar.
  await passo.getByRole('button', { name: 'Pular este passo' }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(page.getByRole('heading', { level: 1, name: /Pode descansar\.$/ })).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: /seguir para o próximo passo/ }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('o teclado também puxa o fio, e Destino e Varal passam no axe', async ({ page }) => {
  await comMateriaNaPrevia(page);
  await page.getByRole('button', { name: /Puxe o fio/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);

  await page
    .getByRole('navigation', { name: 'Lugares' })
    .getByRole('link', { name: 'Destino' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'O caminho começa aqui' }),
  ).toBeVisible();
  await semViolacoes(page);

  await page
    .getByRole('navigation', { name: 'Lugares' })
    .getByRole('link', { name: 'Varal' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /pendurado no fio/ })).toBeVisible();
  await expect(page.getByRole('group', { name: 'O que você estuda' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'O que você guarda' })).toBeVisible();
  await semViolacoes(page);
});

test('sem ligar a prévia, a casca de sempre continua igual', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toHaveCount(0);
  await page.goto('/#/destino');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});
