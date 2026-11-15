import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// A caneta que desenha (D-D7): a passagem do cartão na revisão e o traço de seleção nas abas do Fixar. Os testes
// de unidade não têm layout, geometria de SVG nem animação; aqui roda de verdade.

const DIA = 86_400_000;

test('Revisar: o cartão passa para o seguinte e não deixa animação nem deslocamento para trás', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  for (const frente of ['Primeira pergunta', 'Segunda pergunta']) {
    await page.goto('/#/recall/cartoes/novo');
    await page.getByLabel('Frente (pergunta)').fill(frente);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  }

  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/#/recall/revisar');
  await page.reload();
  await expect(page.getByText('1 de 2')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('3');
  await expect(page.getByText('2 de 2')).toBeVisible();

  // Quando a passagem termina, o cartão está inteiro e no lugar, sem animação pendente.
  const cartao = page.locator('.cartao-drill');
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(cartao).toHaveCSS('opacity', '1');
  await expect(cartao).toHaveCSS('transform', 'none');
  await expect(page.getByText(/Primeira pergunta|Segunda pergunta/)).toHaveCount(1);
  await semViolacoes(page);
});

async function usarPerfilCalmo(page: Page) {
  await page.goto('/#/conta/perfis');
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();
}

interface Medida {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Registro {
  traco: Medida;
  item: Medida;
  ponta: boolean;
}

test('Fixar: o traço de seleção rodeia a aba escolhida e some sozinho; no Calmo, sem a ponta que anda', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // O traço dura menos que um piscar: um observador anota onde ele nasce e onde o item está.
  await page.addInitScript(() => {
    const janela = window as unknown as { __tracos: Registro[] };
    janela.__tracos = [];
    const medida = (el: Element): Medida => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height };
    };
    new MutationObserver((lista) => {
      for (const m of lista) {
        const svg = m.target;
        if (svg instanceof SVGElement && svg.dataset.ativo !== undefined && svg.parentElement) {
          janela.__tracos.push({
            traco: medida(svg),
            item: medida(svg.parentElement),
            ponta: svg.querySelector('circle') !== null,
          });
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-ativo'] });
  });
  const registros = () =>
    page.evaluate(() => (window as unknown as { __tracos: Registro[] }).__tracos);

  const abas = page.getByRole('navigation', { name: 'Seções do Fixar' });
  const escolher = async (aba: string, quantos: number, comPonta: boolean) => {
    await abas.getByRole('link', { name: aba }).click();
    await expect(abas.getByRole('link', { name: aba })).toHaveAttribute('aria-current', 'page');
    await expect.poll(async () => (await registros()).length).toBe(quantos);
    const { traco, item, ponta } = (await registros())[quantos - 1] ?? {};
    if (!traco || !item) throw new Error('o traço não nasceu');
    expect(ponta).toBe(comPonta);
    // O <svg> passa 3 px do item de cada lado, e o fio roda no limite dele.
    expect(Math.abs(traco.x - (item.x - 3))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.y - (item.y - 3))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.width - (item.width + 6))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.height - (item.height + 6))).toBeLessThanOrEqual(1);
    // Some sozinho e deixa a aba como estava.
    await expect(page.locator('.traco-sel[data-ativo]')).toHaveCount(0);
    await expect(page.locator('.traco-sel > *')).toHaveCount(0);
  };

  // Quem chega cai na aba Frases, sem toque: nada se desenha.
  await page.goto('/#/recall');
  await expect(abas.getByRole('link', { name: 'Frases' })).toHaveAttribute('aria-current', 'page');
  await escolher('Cartões', 1, true);

  await usarPerfilCalmo(page);
  await page.goto('/#/recall');
  await expect(abas.getByRole('link', { name: 'Frases' })).toHaveAttribute('aria-current', 'page');
  await escolher('Histórico', 2, false);
  await semViolacoes(page);
});
