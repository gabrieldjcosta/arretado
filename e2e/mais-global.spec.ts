import type { Locator, Page } from '@playwright/test';
import { abrirOLembrete, expect, importarEPublicar, test } from './apoio';

// D-D23: o "+" é um só, da casca, fixo no canto de cima à direita. O jsdom não tem layout; aqui o
// navegador confere que ele fica no mesmo ponto em toda tela (cabeçalho e modo foco), cai na reserva
// do cabeçalho sem cobrir nada (nem com a fonte ampliada), que o cartão do foco não passa por baixo
// dele e que o Lembrete abre por cima da tela em que a pessoa está.

const mais = (page: Page) => page.getByRole('button', { name: 'Novo registro' });

type Caixa = { x: number; y: number; width: number; height: number };

async function caixaDe(alvo: Locator, nome: string): Promise<Caixa> {
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error(`sem caixa: ${nome}`);
  return caixa;
}

const larguraDaTela = (page: Page) => page.evaluate(() => document.documentElement.clientWidth);

/** Mesmo ponto, com meio pixel de folga para o arredondamento do navegador. */
function igual(a: Caixa, b: Caixa) {
  expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(0.5);
}

const sobrepoe = (a: Caixa, b: Caixa) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const TELAS = [
  ['/', 'Hoje'],
  ['/#/plano', 'Trilha'],
  ['/#/recall', 'Fixar'],
  ['/#/biblioteca', 'Biblioteca'],
  ['/#/conta', 'Conta e ajustes'],
  ['/#/orientacoes', 'Orientações'],
] as const;

test.describe('"+" da casca', () => {
  test('fica no mesmo ponto, com 48 px, em toda tela', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    const referencia = await caixaDe(mais(page), 'Hoje');
    expect([Math.round(referencia.width), Math.round(referencia.height)]).toEqual([48, 48]);
    for (const [rota, titulo] of TELAS.slice(1)) {
      await page.goto(rota);
      await expect(
        page.getByRole('heading', { level: 1, name: new RegExp(`^${titulo}`) }),
      ).toBeVisible();
      igual(await caixaDe(mais(page), titulo), referencia);
    }
  });

  test('cai na reserva do cabeçalho: à direita da Conta, centrado, no recuo da página e sem cobrir nada', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    const topo = page.getByRole('banner');
    const caixaTopo = await caixaDe(topo, 'cabeçalho');
    const m = await caixaDe(mais(page), '+');
    const marca = await caixaDe(topo.getByRole('link', { name: 'Arretado, início' }), 'marca');
    const ajuda = await caixaDe(topo.getByRole('button', { name: 'Ajuda', exact: true }), 'Ajuda');
    const conta = await caixaDe(topo.getByRole('link', { name: 'Conta e ajustes' }), 'Conta');

    // Uma linha só, e o "+" no meio dela.
    expect(caixaTopo.height).toBeLessThanOrEqual(64);
    expect(Math.abs(m.y + m.height / 2 - (caixaTopo.y + caixaTopo.height / 2))).toBeLessThanOrEqual(
      1,
    );
    // Ordem e distância: marca, Ajuda, Conta, "+", sem que nenhum cubra o vizinho.
    expect(marca.x + marca.width).toBeLessThanOrEqual(ajuda.x);
    expect(ajuda.x + ajuda.width).toBeLessThanOrEqual(conta.x);
    expect(conta.x + conta.width).toBeLessThanOrEqual(m.x);
    for (const outro of [marca, ajuda, conta]) expect(sobrepoe(m, outro)).toBe(false);
    // O cabeçalho reserva à direita o recuo da página, os 48 px do "+" e 4 px de respiro (a mesma conta
    // do CSS, em celular, tablet e computador): o que sobra à direita do "+" é o recuo da página.
    const reserva = await topo.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
    const margem = (await larguraDaTela(page)) - (m.x + m.width);
    expect(Math.abs(margem + m.width + 4 - reserva)).toBeLessThanOrEqual(1);
    // Os links da casca não repetem o "Registrar erro" (ele mora no painel do "+" e na tecla E).
    await expect(topo.getByRole('link', { name: /Registrar erro/ })).toHaveCount(0);
  });

  test('com a fonte ampliada o cabeçalho quebra em linhas e nada fica sob o "+" nem passa da tela', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/orientacoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Orientações' })).toBeVisible();
    const topo = page.getByRole('banner');
    const filhos = [
      ['marca', topo.getByRole('link', { name: 'Arretado, início' })],
      ['Ajuda', topo.getByRole('button', { name: 'Ajuda', exact: true })],
      ['Conta', topo.getByRole('link', { name: 'Conta e ajustes' })],
    ] as const;
    for (const fonte of [200, 300]) {
      await page.evaluate((f) => {
        document.documentElement.style.fontSize = `${String(f)}%`;
      }, fonte);
      const m = await caixaDe(mais(page), '+');
      const largura = await larguraDaTela(page);
      expect(m.x, `${String(fonte)}%: o "+" cabe na tela`).toBeGreaterThanOrEqual(0);
      expect(m.x + m.width, `${String(fonte)}%: o "+" cabe na tela`).toBeLessThanOrEqual(largura);
      for (const [nome, alvo] of filhos) {
        const caixa = await caixaDe(alvo, nome);
        expect(sobrepoe(m, caixa), `${String(fonte)}%: ${nome} sob o "+"`).toBe(false);
        expect(
          caixa.x + caixa.width,
          `${String(fonte)}%: ${nome} dentro da tela`,
        ).toBeLessThanOrEqual(largura + 0.5);
      }
    }
  });

  test('o Lembrete abre por cima da tela em que a pessoa está, sem trocar de rota', async ({
    page,
  }) => {
    for (const rota of ['/#/plano', '/#/conta', '/#/biblioteca']) {
      await page.goto(rota);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const dialogo = await abrirOLembrete(page);
      expect(new URL(page.url()).hash).toBe(rota.slice(1));
      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(mais(page)).toBeFocused();
      expect(new URL(page.url()).hash).toBe(rota.slice(1));
    }
  });

  test('a tecla E leva ao registro com o painel aberto, e o painel não vai junto', async ({
    page,
  }) => {
    await page.goto('/#/plano');
    await expect(page.getByRole('heading', { level: 1, name: 'Trilha' })).toBeVisible();
    await mais(page).click();
    await expect(page.locator('.mais-itens')).toBeVisible();
    await page.keyboard.press('e');
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
    await expect(page.locator('.mais-itens')).toHaveCount(0);
    await expect(mais(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('na leitura e no modo foco ele não sai do lugar, não cobre o cartão e o Esc fecha só o painel', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await importarEPublicar(page, 'lep-compilado', 'LEP');
    await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
    const base = await page.evaluate(() => window.location.hash.split('?')[0] ?? '');
    const referencia = await caixaDe(mais(page), 'leitura');

    // Modo foco por artigo: o cabeçalho sai e o "+" fica onde estava.
    await page.goto(`/${base}?foco=artigo&ir=art112`);
    await page.reload();
    await expect(page.getByRole('region', { name: /^Art\. 112, \d+ de \d+$/ })).toBeVisible();
    await expect(page.getByRole('banner')).toBeHidden();
    const noFoco = await caixaDe(mais(page), 'foco');
    igual(noFoco, referencia);

    // O cartão não passa por baixo dele: em tela estreita começa abaixo; na larga, a pilha do artigo
    // fica ao lado (a margem da página).
    const pilha = await caixaDe(page.locator('.area-artigo'), 'pilha do artigo');
    const largura = await larguraDaTela(page);
    if (largura <= 832) expect(pilha.y).toBeGreaterThanOrEqual(noFoco.y + noFoco.height - 0.5);
    else expect(sobrepoe(pilha, noFoco)).toBe(false);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    ).toBeLessThanOrEqual(0);

    // Esc com o painel aberto fecha só o painel: a pessoa continua no foco.
    await mais(page).click();
    await expect(page.locator('.mais-itens')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mais-itens')).toHaveCount(0);
    await expect(mais(page)).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-modo-foco', 'artigo');

    // O Lembrete abre no foco, por cima do cartão, e o foco volta ao "+" ao fechar.
    const dialogo = await abrirOLembrete(page);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(mais(page)).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-modo-foco', 'artigo');

    // Foco no texto corrido: o mesmo ponto.
    await page.goto(`/${base}?foco=texto`);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-modo-foco', 'texto');
    igual(await caixaDe(mais(page), 'foco no texto'), referencia);
  });
});
