import type { Page } from '@playwright/test';
import { expect, importarEPublicar, test } from './apoio';

// D-D22: no modo foco por artigo o cartão toma a altura que a tela deixa (celular e computador), o
// artigo curto fica do tamanho do texto e o ⋯ divide o fim da tela com o pé do cartão sem cobrir a seta.

/** Abaixo disto (52 rem na letra padrão) o ⋯ passa da margem do cartão: o pé desce ao fim da tela e divide a linha com ele. */
const ESTREITA = 832;

const estreita = (page: Page) => (page.viewportSize()?.width ?? Infinity) <= ESTREITA;

/** Abre o cartão do artigo do endereço dado; espera o cartão certo (o nome acessível traz o artigo). */
async function abrirNoCartao(page: Page, base: string, endereco: string, nome: RegExp) {
  await page.goto(`/${base}?foco=artigo&ir=${endereco}`);
  await page.reload();
  await expect(page.getByRole('region', { name: nome })).toBeVisible();
}

const medir = (page: Page) =>
  page.evaluate(() => {
    const caixa = (seletor: string) => {
      const el = document.querySelector(seletor);
      if (!el) throw new Error(`sem ${seletor}`);
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, direita: r.right, base: r.bottom, w: r.width, h: r.height };
    };
    const cartao = document.querySelector('.cartao-artigo');
    return {
      vh: window.innerHeight,
      pagina: document.documentElement.scrollHeight,
      largura: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cartao: caixa('.cartao-artigo'),
      pe: caixa('.pe-do-cartao'),
      rola: cartao ? cartao.scrollHeight > cartao.clientHeight + 1 : false,
    };
  });

test('modo foco por artigo: o cartão toma a altura que sobra, o curto não estica e o ⋯ não cobre as setas', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const base = await page.evaluate(() => window.location.hash.split('?')[0] ?? '');
  const mais = page.getByRole('button', { name: 'Mais ações do foco' });
  const proximo = page.getByRole('button', { name: 'Próximo artigo' });

  // Artigo longo (art. 112 da LEP): o cartão enche a tela, a página não rola e o texto rola por dentro.
  await abrirNoCartao(page, base, 'art112', /^Art\. 112, \d+ de \d+$/);
  const longo = await medir(page);
  expect(longo.cartao.h / longo.vh).toBeGreaterThanOrEqual(0.8);
  expect(longo.cartao.base).toBeLessThanOrEqual(longo.vh);
  expect(longo.pagina).toBe(longo.vh);
  expect(longo.largura).toBe(0);
  expect(longo.rola).toBe(true);

  // O ⋯ e a seta do próximo não se tocam, em nenhuma largura; e, como o cartão chega ao fim da tela, o pé
  // e o ⋯ ficam na mesma linha.
  const caixaDoMais = await mais.boundingBox();
  const caixaDoProximo = await proximo.boundingBox();
  if (!caixaDoMais || !caixaDoProximo) throw new Error('sem caixa do ⋯ ou da seta');
  const separados =
    caixaDoProximo.x + caixaDoProximo.width <= caixaDoMais.x + 0.5 ||
    caixaDoMais.x + caixaDoMais.width <= caixaDoProximo.x + 0.5 ||
    caixaDoProximo.y + caixaDoProximo.height <= caixaDoMais.y + 0.5 ||
    caixaDoMais.y + caixaDoMais.height <= caixaDoProximo.y + 0.5;
  expect(separados).toBe(true);
  const centro = (c: { y: number; height: number }) => c.y + c.height / 2;
  expect(Math.abs(centro(caixaDoMais) - centro(caixaDoProximo))).toBeLessThanOrEqual(6);

  // Artigo curto (art. 1º): do tamanho do texto (sem rolar por dentro, sem esticar), página no lugar.
  await abrirNoCartao(page, base, 'art1', /^Art\. 1º, \d+ de \d+$/);
  const curto = await medir(page);
  expect(curto.rola).toBe(false);
  expect(curto.cartao.h).toBeLessThan(curto.vh * 0.5);
  expect(curto.cartao.h).toBeLessThan(longo.cartao.h);
  expect(curto.pagina).toBe(curto.vh);
  expect(curto.largura).toBe(0);
  if (estreita(page)) {
    // Celular e tablet em pé: o pé fica no fim da tela, onde está o ⋯, e não anda com o artigo.
    expect(curto.vh - curto.pe.base).toBeLessThanOrEqual(24);
  } else {
    // Computador: o pé acompanha o cartão (a pilha fica no meio da tela).
    expect(curto.pe.y - curto.cartao.base).toBeLessThanOrEqual(24);
  }

  // Trocar de artigo mantém a conta: o seguinte também cabe, sem a página rolar.
  await proximo.click();
  await expect(page.locator('.cartao-artigo')).toBeVisible();
  const seguinte = await medir(page);
  expect(seguinte.pagina).toBe(seguinte.vh);
  expect(seguinte.cartao.base).toBeLessThanOrEqual(seguinte.vh);
  info.annotations.push({ type: 'aparelho', description: info.project.name });
});
