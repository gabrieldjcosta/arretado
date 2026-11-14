import type { Page } from '@playwright/test';
import { expect, semViolacoesNoFio, test } from './apoio';

// A linha de retorno do Agora (desvio 476), o backup na folha da Conta (476b) e a porta de quem já usa o Arretado na
// tela da prova (476c). O jsdom não tem layout: aqui o navegador confere que a linha cabe na largura, tem alvos de
// toque de verdade, não fica debaixo da pílula dos lugares, passa no axe nos dois mundos, e que o "Depois" vale
// também depois de recarregar. Confere ainda que a linha não mexe no retorno dos passos, que no mockup se chama
// `.m-retorno` (a classe da linha já teve esse nome e herdou a altura dele).

const FRASE = 'Primário com violência progride com 25% da pena.';

/** Guarda um erro pelo "+": é o que faz o Aparelho ter o que perder, e o backup passar a ser lembrado. */
async function guardarUmErro(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.getByRole('button', { name: /Guardar um erro/ }).click();
  const folha = page.getByRole('dialog');
  await folha.getByRole('textbox').fill(FRASE);
  await folha.getByRole('button', { name: /Pendurar no varal/ }).click();
  await expect(page.getByText('Pendurada no varal. Volta na revisão amanhã.')).toBeVisible();
}

const linhaDeRetorno = (page: Page) => page.locator('.m-linha-de-retorno');

test('com um erro guardado e sem backup, o Agora lembra do backup numa linha só, que cabe e se toca', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await guardarUmErro(page);
  // A linha só entra quando o Agora monta: nada sobe debaixo do dedo de quem já está na tela.
  await expect(linhaDeRetorno(page)).toHaveCount(0);
  await page.reload();

  const linha = linhaDeRetorno(page);
  await expect(linha).toHaveCount(1);
  await expect(linha).toHaveAttribute('role', 'status');
  await expect(linha).toContainText('Você ainda não fez backup.');
  await expect(linha.getByRole('link', { name: 'Fazer agora' })).toHaveAttribute(
    'href',
    '#/conta/dados',
  );

  const medidas = await page.evaluate(() => {
    const caixa = (e: Element) => {
      const c = e.getBoundingClientRect();
      return { x: c.left, y: c.top, w: c.width, h: c.height };
    };
    const el = document.querySelector('.m-linha-de-retorno');
    const nav = document.querySelector('nav[aria-label="Lugares"]');
    if (!el || !nav) throw new Error('sem a linha ou sem a nav');
    return {
      linha: caixa(el),
      nav: caixa(nav),
      alvos: [...el.querySelectorAll('a, button')].map(caixa),
      rolaDeLado: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      janela: window.innerWidth,
    };
  });
  expect(medidas.rolaDeLado).toBe(false);
  expect(medidas.linha.x).toBeGreaterThanOrEqual(0);
  expect(medidas.linha.x + medidas.linha.w).toBeLessThanOrEqual(medidas.janela);
  // Texto numa linha e ações na outra, no máximo: sem a altura mínima de 96 px que o `.m-retorno` do mockup daria.
  expect(medidas.linha.h).toBeLessThanOrEqual(70);
  expect(medidas.linha.y + medidas.linha.h).toBeLessThanOrEqual(medidas.nav.y);
  expect(medidas.alvos).toHaveLength(2);
  for (const alvo of medidas.alvos) {
    expect(alvo.h).toBeGreaterThanOrEqual(44);
    expect(alvo.w).toBeGreaterThanOrEqual(44);
  }
  await semViolacoesNoFio(page);

  // A folha da Conta diz o mesmo, sem depender da linha.
  await page.getByRole('button', { name: 'Menu: sua conta e ajustes' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /^Seus dados/ })).toContainText(
    'ainda sem backup',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // "Depois" dispensa por dias, neste Aparelho: recarregar não traz a linha de volta.
  await linha.getByRole('button', { name: 'Depois' }).click();
  await expect(linha).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Guardar um erro/ })).toBeVisible();
  await expect(linhaDeRetorno(page)).toHaveCount(0);
});

test('"Fazer agora" leva aos dados do Aparelho', async ({ page }) => {
  await guardarUmErro(page);
  await page.reload();
  await linhaDeRetorno(page).getByRole('link', { name: 'Fazer agora' }).click();
  await expect(page).toHaveURL(/#\/conta\/dados$/);
  await expect(page.getByRole('button', { name: /backup/i }).first()).toBeVisible();
});

test('em tela baixa a linha fica depois do cartão e se alcança rolando, acima da pílula', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await guardarUmErro(page);
  await page.reload();
  const linha = linhaDeRetorno(page);
  await expect(linha).toHaveCount(1);
  await linha.getByRole('link', { name: 'Fazer agora' }).scrollIntoViewIfNeeded();
  const [caixaDaLinha, caixaDaNav] = await Promise.all([
    linha.boundingBox(),
    page.getByRole('navigation', { name: 'Lugares' }).boundingBox(),
  ]);
  if (!caixaDaLinha || !caixaDaNav) throw new Error('sem caixa');
  expect(caixaDaLinha.y + caixaDaLinha.height).toBeLessThanOrEqual(caixaDaNav.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('na primeira abertura, a tela da prova tem a porta de quem já usa o Arretado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/#/fio/prova');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pra qual prova você estuda?' }),
  ).toBeVisible();
  const porta = page.getByRole('link', { name: 'Já uso o Arretado: restaurar um backup' });
  await expect(porta).toBeVisible();
  const caixa = await porta.boundingBox();
  if (!caixa) throw new Error('sem caixa');
  expect(caixa.height).toBeGreaterThanOrEqual(44);
  // Centrada na coluna: o link do mockup era um botão, que se centra sozinho.
  const meio = caixa.x + caixa.width / 2;
  expect(Math.abs(meio - 180)).toBeLessThanOrEqual(2);
  await semViolacoesNoFio(page);

  await porta.click();
  await expect(page).toHaveURL(/#\/conta\/dados$/);
});
