import type { Locator, Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O anel de evidência (D-D13, contorno B do Gabriel): a linha branca, a faixa piscina suave e o halo no
// cartão do Agora (Hoje) e no artigo do Modo foco. O jsdom não aplica CSS; aqui o navegador calcula as
// sombras, o repouso do halo, o Calmo, o movimento reduzido e as cores forçadas, e confere que a página
// não ganha rolagem lateral nem o anel reacende ao trocar de artigo.

/** O que o navegador calculou de um pseudoelemento do anel. */
const pseudo = (el: Locator, qual: '::before' | '::after') =>
  el.evaluate((e, q) => {
    const c = getComputedStyle(e, q);
    return {
      sombra: c.boxShadow,
      opacidade: c.opacity,
      animacao: c.animationName,
      duracao: c.animationDuration,
      repeticoes: c.animationIterationCount,
      exibicao: c.display,
    };
  }, qual);

/** Espera o fim da animação do halo (as outras animações da tela não contam). */
const assentou = (page: Page) =>
  page.evaluate(async () => {
    const doHalo = document
      .getAnimations()
      .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::before');
    await Promise.allSettled(doHalo.map((a) => a.finished));
  });

/** Quantas animações de halo estão rodando agora. */
const haloAnimando = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::before').length,
  );

const rolagemLateral = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Uma tarefa na fila: sem mais nada, ela é o Agora do Hoje. */
async function prepararOAgora(page: Page) {
  await page.goto('/#/plano/tarefas');
  await page.getByLabel('O que fazer?').fill('Ler arts. 112 a 117 da LEP');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(
    page.getByRole('region', { name: 'Fila' }).getByText('Ler arts. 112 a 117 da LEP'),
  ).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByRole('region', { name: 'Agora' })).toBeVisible();
}

const LINHA_E_FAIXA_DE_DIA =
  /^rgb\(255, 255, 255\) 0px 0px 0px 2px, rgba\(57, 202, 239, 0\.5\) 0px 0px 0px 5px$/;
const LINHA_E_FAIXA_DE_NOITE =
  /^rgb\(255, 255, 255\) 0px 0px 0px 2px, rgba\(57, 202, 239, 0\.35\) 0px 0px 0px 5px$/;

test('Hoje: o cartão do Agora leva a linha, a faixa e o halo; o halo acende uma vez e assenta, de dia e de noite', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await prepararOAgora(page);
  const agora = page.getByRole('region', { name: 'Agora' });
  await expect(agora).toHaveClass(/\bevidencia\b/);

  // A linha branca de 2 px e a faixa de 5 px são sombras duras (sem desfoque), iguais nos dois mundos
  // fora a opacidade da faixa.
  const linha = await pseudo(agora, '::after');
  expect(linha.sombra).toMatch(LINHA_E_FAIXA_DE_DIA);
  // O halo: 20 px de raio com 6 de espalhamento por fora e o tom de dentro; roda 0,9 s, uma vez.
  const halo = await pseudo(agora, '::before');
  expect(halo.animacao).toBe('ev-acende');
  expect(halo.duracao).toBe('0.9s');
  expect(halo.repeticoes).toBe('1');
  await assentou(page);
  expect(await haloAnimando(page)).toBe(0);
  const repouso = await pseudo(agora, '::before');
  expect(repouso.opacidade).toBe('0.45');
  expect(repouso.sombra).toBe(
    'rgb(57, 202, 239) 0px 0px 20px 6px, rgba(57, 202, 239, 0.4) 0px 0px 14px 0px inset',
  );

  // À noite a faixa fica a 35% e o halo repousa mais forte (0,5); a linha é a mesma.
  await page.emulateMedia({ colorScheme: 'dark' });
  expect((await pseudo(agora, '::after')).sombra).toMatch(LINHA_E_FAIXA_DE_NOITE);
  expect((await pseudo(agora, '::before')).opacidade).toBe('0.5');

  // O Calmo não acende: só esmaece o repouso, em 0,24 s.
  await page.evaluate(() => {
    document.documentElement.dataset.perfil = 'calmo';
  });
  const calmo = await pseudo(agora, '::before');
  expect(calmo.animacao).toBe('ev-esmaece');
  expect(calmo.duracao).toBe('0.24s');

  await semViolacoes(page);
});

test('Hoje: com movimento reduzido o anel nasce parado, em cores forçadas vira borda de 2 px e a 320 px nada rola de lado', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOAgora(page);
  const agora = page.getByRole('region', { name: 'Agora' });

  // Movimento reduzido: sem animação, o halo já no repouso.
  const parado = await pseudo(agora, '::before');
  expect(parado.animacao).toBe('none');
  expect(parado.opacidade).toBe('0.45');
  expect(await haloAnimando(page)).toBe(0);

  // Cores forçadas: o halo e a faixa somem e o cartão ganha uma borda de 2 px na cor do sistema.
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  expect((await pseudo(agora, '::before')).exibicao).toBe('none');
  expect((await pseudo(agora, '::after')).exibicao).toBe('none');
  const borda = await agora.evaluate((e) => {
    const c = getComputedStyle(e);
    return { largura: c.borderTopWidth, estilo: c.borderTopStyle };
  });
  expect(borda).toEqual({ largura: '2px', estilo: 'solid' });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });

  // A menor tela que o app testa: o halo não alarga a página.
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(agora).toBeVisible();
  expect(await rolagemLateral(page)).toBe(0);
});

test('Modo foco: o artigo leva o anel por fora do cartão que rola, e trocar de artigo não o reacende', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await page.getByRole('button', { name: 'Modo foco' }).click();
  await expect(page).toHaveURL(/[?&]foco=artigo/);
  const envoltorio = page.locator('.evidencia-foco');
  const cartao = page.locator('.cartao-artigo');
  await expect(cartao).toBeVisible();

  // O envoltório é o que ganha o anel (o cartão rola por dentro e cortaria o halo) e mede o mesmo que o cartão.
  expect((await pseudo(envoltorio, '::after')).sombra).toMatch(LINHA_E_FAIXA_DE_DIA);
  expect((await pseudo(envoltorio, '::before')).animacao).toBe('ev-acende');
  const medidas = await page.evaluate(() => {
    const e = document.querySelector('.evidencia-foco')?.getBoundingClientRect();
    const c = document.querySelector('.cartao-artigo')?.getBoundingClientRect();
    return e && c ? { largura: [e.width, c.width], altura: [e.height, c.height] } : null;
  });
  expect(medidas?.largura[0]).toBeCloseTo(medidas?.largura[1] ?? -1, 0);
  expect(medidas?.altura[0]).toBeCloseTo(medidas?.altura[1] ?? -1, 0);
  expect(await rolagemLateral(page)).toBe(0);
  await assentou(page);
  expect((await pseudo(envoltorio, '::before')).opacidade).toBe('0.45');

  // Trocar de artigo mantém o envoltório e não acende o halo de novo.
  await page.evaluate(() => {
    (window as unknown as { __anel?: Element }).__anel =
      document.querySelector('.evidencia-foco') ?? undefined;
  });
  const rotulo = () => cartao.getAttribute('aria-label');
  const antes = await rotulo();
  await page.getByRole('button', { name: 'Próximo artigo' }).click();
  await expect.poll(rotulo).not.toBe(antes);
  const mesmo = await page.evaluate(
    () =>
      document.querySelector('.evidencia-foco') ===
      (window as unknown as { __anel?: Element }).__anel,
  );
  expect(mesmo).toBe(true);
  expect(await haloAnimando(page)).toBe(0);

  await semViolacoes(page);
});
