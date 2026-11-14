import type { Locator, Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O anel de evidência (D-D13, contorno B do Gabriel): a linha branca, a faixa piscina suave e o halo no
// artigo do Modo foco. O jsdom não aplica CSS; aqui o navegador calcula as
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

const LINHA_E_FAIXA_DE_DIA =
  /^rgb\(255, 255, 255\) 0px 0px 0px 2px, rgba\(57, 202, 239, 0\.5\) 0px 0px 0px 5px$/;
const LINHA_E_FAIXA_DE_NOITE =
  /^rgb\(255, 255, 255\) 0px 0px 0px 2px, rgba\(57, 202, 239, 0\.35\) 0px 0px 0px 5px$/;

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
