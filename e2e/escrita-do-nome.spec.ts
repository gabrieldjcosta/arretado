import type { Page } from '@playwright/test';
import { expect, pularAAbertura, semViolacoes, test } from './apoio';

// A escrita do nome (D-D9, Q6): a caneta escreve "arretado", volta por baixo deixando um traço de luz e
// vira o cacto. Os testes de unidade não têm layout, CSS nem animação; aqui roda o desenho de verdade, no
// Chromium. Safari e Firefox não são exercitados (ver docs/planos/tinta-e-noite.md).
//
// Na primeira vez no aparelho e na primeira abertura de cada Dia o nome se escreve em tela cheia (a
// Abertura, ver `abertura.spec.ts`). O cabeçalho continua a escrevê-lo quando a tela cheia não abre: com uma
// Sessão aberta ou com o "só estudo" ligado (o perfil Calmo o liga). É esse desenho, o mesmo componente, que
// estes testes exercitam: o aparelho nasce sem a semeadura da escrita e é posto num desses casos.
test.use({ semearEscrita: false });

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

/**
 * O lockup do cabeçalho como pixels: o quadro final tem de ser o mesmo em qualquer caminho até ele. Espera a tela de
 * carregamento (index.html) sair: ela esmaece por 160 ms por cima do app que acabou de montar, e um recorte feito
 * nessa saída tem uns três pontos do nome mais claros (o teste da parada aceita zero).
 */
async function lockup(page: Page): Promise<Buffer> {
  await expect(page.locator('#carregamento')).toHaveCount(0);
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
 * A maior diferença, em níveis de 255, entre as médias de blocos de `lado` × `lado` pontos de dois recortes
 * PNG: a serrilha que muda de lugar por meia casa de ponto some na média do bloco, e um brilho que
 * faltasse (em volta das letras, à noite) não. -1 se os tamanhos diferem.
 */
async function diferencaPorBloco(page: Page, a: Buffer, b: Buffer, lado = 8): Promise<number> {
  return page.evaluate(
    async ({ primeiro, segundo, bloco }) => {
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
      let maior = 0;
      for (let por = 0; por + bloco <= x.height; por += bloco) {
        for (let pox = 0; pox + bloco <= x.width; pox += bloco) {
          for (let canal = 0; canal < 3; canal += 1) {
            let somaX = 0;
            let somaY = 0;
            for (let l = por; l < por + bloco; l += 1) {
              for (let c = pox; c < pox + bloco; c += 1) {
                const i = (l * x.width + c) * 4 + canal;
                somaX += x.data[i] ?? 0;
                somaY += y.data[i] ?? 0;
              }
            }
            maior = Math.max(maior, Math.abs(somaX - somaY) / (bloco * bloco));
          }
        }
      }
      return maior;
    },
    { primeiro: a.toString('base64'), segundo: b.toString('base64'), bloco: lado },
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

/**
 * O aparelho no caso em que o cabeçalho escreve o nome: com uma Sessão aberta a tela cheia não abre. Começa
 * a Sessão (pulando a Abertura da primeira vez) e recarrega o Hoje com o nome por escrever (`outroDia`
 * falso: a primeira vez no aparelho) ou escrito em outro Dia (a primeira abertura de hoje, no modo curto).
 */
async function comASessaoAberta(page: Page, outroDia = false) {
  await page.goto('/#/sessao/iniciar');
  await pularAAbertura(page);
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  // `exact`: sem ele o título casa com o `h1` "Começar uma Sessão" da tela de começar, antes de a Sessão existir, e o
  // `reload` abaixo pode chegar antes da gravação (`sessoes` vazio; a tela cheia abre e o cabeçalho nunca escreve).
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão', exact: true })).toBeVisible();
  await page.evaluate(
    ([chave, valor]: [string, string | null]) => {
      if (valor === null) window.localStorage.removeItem(chave);
      else window.localStorage.setItem(chave, valor);
    },
    [CHAVE, outroDia ? DIA_ANTIGO : null] as [string, string | null],
  );
  await page.goto('/#/');
  await page.reload();
  // A tela cheia não abre: o nome se escreve no cabeçalho.
  await expect(page.locator('.abertura')).toHaveCount(0);
}

test('primeira abertura no aparelho, no cabeçalho: escreve as 8 letras em ordem e termina no lockup, nos dois mundos', async ({
  page,
}) => {
  await comASessaoAberta(page);
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
          const traços = [
            ...document.querySelectorAll<SVGPathElement>('.marca svg.eb path.tr:not(.tn)'),
          ];
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
    const parada = await lockup(page);
    if (esquema === 'light') {
      expect(await pontosDiferentes(page, parada, natural), `${esquema}: parada`).toBe(0);
    } else {
      // À noite o brilho de repouso (o néon, D-D10) entra no desenho, e o Chromium, a 1x, refaz as bordas de
      // algumas letras com menos de meio ponto de diferença entre a escrita acabada e o lockup parado (medido:
      // 7 de 255 na média de um bloco de 8 pontos; sem o brilho seriam 25). Por isso aqui vale o bloco.
      expect(await diferencaPorBloco(page, parada, natural), `${esquema}: parada`).toBeLessThan(12);
    }
    await lembrarOutroDia(page);
    await page.reload();
    await terminou(page);
  }
  await semViolacoes(page);
});

test('segunda abertura do mesmo Dia: o lockup parado, sem escrita', async ({ page }) => {
  await comASessaoAberta(page);
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

test('primeira abertura de outro Dia, no cabeçalho: a escrita curta, já com o nome escrito', async ({
  page,
}) => {
  await comASessaoAberta(page, true);
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

test('um toque em qualquer lugar pula a escrita do cabeçalho', async ({ page }) => {
  await comASessaoAberta(page);
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

  // Quando a pessoa deixa de reduzir, a primeira vez ainda está lá: o nome inteiro, em tela cheia.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(page.locator('.abertura svg.eb')).not.toHaveClass(/pulou|curta|calmo/);
  expect((await noAr(page)).length).toBeGreaterThan(0);
});

test('perfil Calmo: o desenho só esmaece, sem caneta nem traço', async ({ page }) => {
  await page.goto('/#/conta/perfis');
  await pularAAbertura(page);
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();
  await lembrarOutroDia(page);
  await page.reload();

  // O perfil liga o "só estudo", e com ele a tela cheia não abre: o cabeçalho escreve, e só esmaece.
  // O perfil vem das Preferências, lidas de forma assíncrona: a escrita espera por elas.
  await expect(page.locator('.abertura')).toHaveCount(0);
  const svg = page.locator('.marca svg.eb');
  await expect(svg).toHaveClass(/calmo/);
  // Só o esmaecer (a animação fica no ar com o preenchimento final): sem caneta, sem traço.
  expect(await noAr(page)).toEqual(['eb-calmo']);
  await expect(svg).toHaveCSS('opacity', '1');
});

test('sem d: path() e offset-path (Safari e Firefox): o quadro final continua sendo o lockup', async ({
  page,
}) => {
  await comASessaoAberta(page);
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
