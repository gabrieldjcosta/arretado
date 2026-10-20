import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// A escrita do nome (D-D9, Q6): a caneta escreve "arretado" no cabeçalho, volta por baixo deixando um
// traço de luz e vira o cacto. Os testes de unidade não têm layout, CSS nem animação; aqui roda o
// desenho de verdade, no Chromium. Safari e Firefox não são exercitados (ver docs/planos/tinta-e-noite.md).

const CHAVE = 'arretado:escrita-do-nome:v1';
const DIA_ANTIGO = JSON.stringify({ dia: '2026-01-01' });

/** Animações CSS da escrita ainda em curso: só ela usa nomes `eb-` (o resto do app, outros). */
function noAr(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .flatMap((a) =>
        a instanceof CSSAnimation && a.animationName.startsWith('eb-') ? [a.animationName] : [],
      ),
  );
}

/** Espera a escrita começar (antes disso, enquanto lê as Preferências, não há animação) e acabar. */
async function terminou(page: Page) {
  await expect(page.locator('.marca svg.eb')).toBeVisible();
  await expect.poll(() => noAr(page), { timeout: 10_000, intervals: [100] }).toEqual([]);
}

/** O lockup do cabeçalho como pixels: o quadro final tem de ser o mesmo em qualquer caminho até ele. */
async function lockup(page: Page): Promise<Buffer> {
  return page.locator('.marca').screenshot({ animations: 'allow' });
}

/**
 * Quantos pontos diferem de verdade entre dois recortes PNG (canal a canal, além de 16 em 255): o
 * lockup parado e o quadro final da escrita desenham os mesmos caminhos, mas um é tracejado e o outro
 * não, e a serrilha do Chromium muda 1 ou 2 níveis nas bordas. -1 se os tamanhos diferem.
 */
async function pontosDiferentes(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ({ primeiro, segundo }) => {
      const ler = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const imagem = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const tela = new OffscreenCanvas(imagem.width, imagem.height);
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('sem canvas');
        contexto.drawImage(imagem, 0, 0);
        return contexto.getImageData(0, 0, imagem.width, imagem.height);
      };
      const [x, y] = await Promise.all([ler(primeiro), ler(segundo)]);
      if (x.width !== y.width || x.height !== y.height) return -1;
      let diferentes = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const maior = Math.max(
          ...[0, 1, 2, 3].map((k) => Math.abs((x.data[i + k] ?? 0) - (y.data[i + k] ?? 0))),
        );
        if (maior > 16) diferentes += 1;
      }
      return diferentes;
    },
    { primeiro: a.toString('base64'), segundo: b.toString('base64') },
  );
}

/**
 * Desembrulha as regras de reserva (`@supports not (d: path(...))` e `(offset-path: ...)`) para o
 * Chromium, que as ignoraria. Pelo CSSOM: a CSP `style-src 'self'` barra um `<style>` de dentro da página.
 */
async function usarAsReservas(page: Page): Promise<number> {
  return page.evaluate(() => {
    let achadas = 0;
    for (const folha of document.styleSheets) {
      for (const regra of [...folha.cssRules]) {
        if (!(regra instanceof CSSSupportsRule)) continue;
        if (!/^not\s*\(\s*(d|offset-path)\s*:/.test(regra.conditionText)) continue;
        for (const interna of [...regra.cssRules]) {
          folha.insertRule(interna.cssText, folha.cssRules.length);
        }
        achadas += 1;
      }
    }
    return achadas;
  });
}

async function lembrarOutroDia(page: Page) {
  await page.evaluate(
    ([chave, valor]) => {
      window.localStorage.setItem(chave as string, valor as string);
    },
    [CHAVE, DIA_ANTIGO],
  );
}

test('primeira abertura no aparelho: escreve as 8 letras em ordem e termina no lockup, nos dois mundos', async ({
  page,
}) => {
  await page.goto('/#/');
  const svg = page.locator('.marca svg.eb');
  await expect(svg).toBeVisible();
  await expect(svg).not.toHaveClass(/curta|calmo|pulou/);

  // A escrita é do CSS: as animações existem de fato (a CSP não derrubou o `style` do JSX).
  expect(await noAr(page)).toEqual(
    expect.arrayContaining(['eb-t0', 'eb-t13', 'eb-pen', 'eb-cacto']),
  );

  // Quadro a quadro: os 14 traços entram na ordem da mão (cada um, no mínimo tão desenhado quanto o
  // seguinte), a página nunca rola na horizontal e há um momento com o começo feito e o fim por fazer.
  const visto = await page.evaluate(
    () =>
      new Promise<{ ordem: boolean; meio: boolean; largura: boolean; completos: boolean }>(
        (resolver) => {
          const traços = [...document.querySelectorAll<SVGPathElement>('.marca svg.eb path.tr')];
          const raiz = document.documentElement;
          const fim = performance.now() + 4_500;
          let [ordem, meio, largura] = [true, false, true];
          let ultimo = [] as number[];
          const quadro = () => {
            // 1 = por fazer, 0 = feito (o traço anda por `stroke-dashoffset`, em `pathLength` 1).
            ultimo = traços.map((t) => parseFloat(getComputedStyle(t).strokeDashoffset));
            if (ultimo.some((o, i) => i > 0 && (ultimo[i - 1] ?? 0) > o + 1e-6)) ordem = false;
            if (ultimo[0] === 0 && (ultimo[ultimo.length - 1] ?? 0) >= 0.999) meio = true;
            if (raiz.scrollWidth > raiz.clientWidth) largura = false;
            if (performance.now() < fim) requestAnimationFrame(quadro);
            else resolver({ ordem, meio, largura, completos: ultimo.every((o) => o === 0) });
          };
          requestAnimationFrame(quadro);
        },
      ),
  );
  expect(visto).toEqual({ ordem: true, meio: true, largura: true, completos: true });

  for (const esquema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: esquema });
    await terminou(page);
    const natural = await lockup(page);
    // Pular (uma tecla) vai ao mesmo quadro; e a abertura seguinte do Dia, parada, também.
    await page.keyboard.press('Shift');
    await expect(svg).toHaveClass(/pulou/);
    expect(await noAr(page)).toEqual([]);
    expect(Buffer.compare(await lockup(page), natural), `${esquema}: pulou`).toBe(0);
    await page.reload();
    await expect(page.locator('.marca svg').first()).toBeVisible();
    expect(await noAr(page)).toEqual([]);
    expect(await pontosDiferentes(page, await lockup(page), natural), `${esquema}: parada`).toBe(0);
    await lembrarOutroDia(page);
    await page.reload();
    await terminou(page);
  }
  await semViolacoes(page);
});

test('segunda abertura do mesmo Dia: o lockup parado, sem escrita', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.marca svg.eb')).toBeVisible();
  await page.reload();
  const marca = page.locator('.marca svg');
  await expect(marca.first()).toBeVisible();
  await expect(page.locator('.marca svg.eb:not(.pulou)')).toHaveCount(0);
  expect(await noAr(page)).toEqual([]);
  const guardado = await page.evaluate((c) => localStorage.getItem(c), CHAVE);
  expect(JSON.parse(guardado ?? 'null')).toMatchObject({
    dia: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
});

test('primeira abertura de outro Dia: a escrita curta, já com o nome escrito', async ({ page }) => {
  await page.goto('/#/');
  await terminou(page);
  await lembrarOutroDia(page);
  await page.reload();
  const svg = page.locator('.marca svg.eb');
  await expect(svg).toHaveClass(/curta/);
  // Entra 1,45 s adiantada: o primeiro traço já está feito no primeiro quadro, e acaba em 1,2 s.
  const atraso = await page.evaluate(
    () =>
      document
        .getAnimations()
        .flatMap((a) =>
          a instanceof CSSAnimation && a.animationName === 'eb-t0'
            ? [a.effect?.getComputedTiming().delay]
            : [],
        )[0],
  );
  expect(atraso).toBe(-1450);
  await terminou(page);
  expect(
    JSON.parse((await page.evaluate((c) => localStorage.getItem(c), CHAVE)) ?? 'null'),
  ).not.toEqual({
    dia: '2026-01-01',
  });
});

test('um toque em qualquer lugar pula a escrita', async ({ page }) => {
  await page.goto('/#/');
  const svg = page.locator('.marca svg.eb');
  await expect(svg).not.toHaveClass(/pulou/);
  expect((await noAr(page)).length).toBeGreaterThan(0);
  await page.mouse.click(2, 2);
  await expect(svg).toHaveClass(/pulou/);
  expect(await noAr(page)).toEqual([]);
});

test('movimento reduzido: o lockup parado, e a primeira vez continua guardada', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(page.locator('.marca svg').first()).toBeVisible();
  expect(await noAr(page)).toEqual([]);
  expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE)).toBeNull();
  await semViolacoes(page);

  // Quando a pessoa deixa de reduzir, a primeira vez ainda está lá.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(page.locator('.marca svg.eb')).not.toHaveClass(/pulou|curta|calmo/);
  expect((await noAr(page)).length).toBeGreaterThan(0);
});

test('perfil Calmo: o desenho só esmaece, sem caneta nem traço', async ({ page }) => {
  await page.goto('/#/conta/perfis');
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();
  await lembrarOutroDia(page);
  await page.reload();

  // O perfil vem das Preferências, lidas de forma assíncrona: a escrita espera por elas.
  const svg = page.locator('.marca svg.eb');
  await expect(svg).toHaveClass(/calmo/);
  // Só o esmaecer (a animação fica no ar com o preenchimento final): sem caneta, sem traço.
  expect(await noAr(page)).toEqual(['eb-calmo']);
  await expect(svg).toHaveCSS('opacity', '1');
});

test('sem d: path() e offset-path (Safari e Firefox): o quadro final continua sendo o lockup', async ({
  page,
}) => {
  await page.goto('/#/');
  await terminou(page);
  const esperado = await lockup(page);

  const regras = await usarAsReservas(page);
  expect(regras).toBe(2);
  const calculado = await page.evaluate(() => {
    const css = (seletor: string, prop: 'display' | 'animationName') => {
      const el = document.querySelector(seletor);
      return el ? getComputedStyle(el)[prop] : 'ausente';
    };
    return {
      tinta: css('.marca .eb-tinta', 'display'),
      luz: css('.marca .eb-luz', 'display'),
      halo: css('.marca .eb-halo', 'display'),
      reserva: css('.marca .eb-luzfb', 'display'),
      cacto: css('.marca .eb-cacto', 'animationName'),
    };
  });
  expect(calculado).toEqual({
    tinta: 'none',
    luz: 'none',
    halo: 'none',
    reserva: 'inline',
    cacto: 'eb-cacto-fb',
  });

  // Escrita de novo, agora pela reserva: termina no mesmo lockup.
  await lembrarOutroDia(page);
  await page.reload();
  expect(await usarAsReservas(page)).toBe(2);
  await terminou(page);
  expect(await pontosDiferentes(page, await lockup(page), esperado)).toBe(0);
});
