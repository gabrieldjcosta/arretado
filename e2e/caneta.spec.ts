import type { Locator, Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// A caneta que desenha (D-D7): o quadro do cacto no Resumo do Dia, o traço de seleção e a passagem do
// cartão. Os testes de unidade não têm layout nem geometria de SVG; aqui roda o desenho de verdade.

const DIA = 86_400_000;

async function usarPerfilCalmo(page: Page) {
  await page.goto('/#/conta/perfis');
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();
}

/** Encerra uma Sessão e fecha o Dia; devolve o bloco do Resumo. */
async function fecharODia(page: Page): Promise<Locator> {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
  await page.goto('/#/');
  const bloco = page.getByRole('region', { name: 'Fechar o Dia' });
  await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
  await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
  return bloco;
}

test('Hoje: a caneta desenha a parte do Dia no quadro do cacto; com movimento reduzido ele aparece pronto', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const bloco = await fecharODia(page);
  const caneta = bloco.locator('.quadro-caneta');
  const legenda = bloco.locator('.quadro-legenda');

  // A legenda só é dita quando a parte terminou de se fazer; até lá a caneta anda sobre o traço.
  const posicoes = new Set<string>();
  await expect
    .poll(
      async () => {
        posicoes.add((await caneta.getAttribute('transform')) ?? '');
        return legenda.textContent();
      },
      { timeout: 15_000, intervals: [40] },
    )
    .toBe('Hoje a caneta desenhou o chão.');
  expect(posicoes.size).toBeGreaterThan(3);

  // Uma caneta só na tela, largada ao fim, e nenhum fio ficou pela metade.
  await expect(page.locator('svg.caneta, .quadro-caneta')).toHaveCount(1);
  await expect(caneta).toHaveAttribute('data-pose', 'deitada');
  const repouso = await caneta.getAttribute('transform');
  const fios = await bloco.locator('.quadro-fio').count();
  expect(fios).toBeGreaterThan(0);
  await expect(bloco.locator('.quadro-fio[style*="stroke-dash"]')).toHaveCount(0);
  await semViolacoes(page);

  // Com movimento reduzido, o mesmo Dia fechado mostra a parte pronta de uma vez, sem a caneta sair.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bloco.getByRole('button', { name: 'Reabrir o Dia' }).click();
  await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
  await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
  await expect(legenda).toHaveText('Hoje a caneta desenhou o chão.', { timeout: 1_000 });
  await expect(caneta).toHaveAttribute('transform', repouso ?? '');
  await expect(bloco.locator('.quadro-fio')).toHaveCount(fios);
  await semViolacoes(page);
});

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

test('Navegação: o traço de seleção rodeia a área escolhida e some sozinho; no Calmo, sem a ponta que anda', async ({
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

  await page.goto('/#/');
  const areas = page.getByRole('navigation', { name: 'Áreas' });
  const escolher = async (area: string, quantos: number, comPonta: boolean) => {
    await areas.getByRole('link', { name: area }).click();
    await expect.poll(async () => (await registros()).length).toBe(quantos);
    const { traco, item, ponta } = (await registros())[quantos - 1] ?? {};
    if (!traco || !item) throw new Error('o traço não nasceu');
    expect(ponta).toBe(comPonta);
    // O <svg> passa 3 px do item de cada lado, e o fio roda no limite dele.
    expect(Math.abs(traco.x - (item.x - 3))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.y - (item.y - 3))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.width - (item.width + 6))).toBeLessThanOrEqual(1);
    expect(Math.abs(traco.height - (item.height + 6))).toBeLessThanOrEqual(1);
    await expect(page.locator('.traco-sel[data-ativo]')).toHaveCount(0);
    await expect(page.locator('.traco-sel > *')).toHaveCount(0);
  };

  await escolher('Fixar', 1, true);
  await usarPerfilCalmo(page);
  await escolher('Trilha', 2, false);
  await semViolacoes(page);
});

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
