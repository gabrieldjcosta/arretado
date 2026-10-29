import type { Page } from '@playwright/test';
import { expect, pontosDiferentes, test } from './apoio';

// A luz da Abertura visita o Zé das Boas-vindas (M3b do Zé, contrato §9). Na primeira vez no aparelho a luz do
// nome não vai ao cabeçalho: vai ao pé esquerdo do Zé, que a Chegada, já aberta mas escondida por baixo do
// nome, oferece. Quando a luz pousa a Chegada se revela e a caneta do Zé continua dali: desenha o contorno,
// o texto sobe na metade, a luz salta à flor. Os testes de unidade não têm layout, camada de topo nem
// quadros; aqui roda tudo de verdade, no Chromium. Safari e Firefox não são exercitados.
//
// Sem as duas semeaduras: o aparelho nasce novo, e a primeira vez é a de verdade.
test.use({ semearAbertura: false, semearEscrita: false });

const CHAVE_DA_ESCRITA = 'arretado:escrita-do-nome:v1';
const CHAVE_DA_CHEGADA = 'arretado:chegada:v1';
const CHAVE_DA_ENTRADA = 'arretado:entrada-do-dia:v1';
const DIA_ANTIGO = '2026-01-01';

const camada = (page: Page) => page.locator('.abertura');
const folha = (page: Page) => page.locator('dialog.dialogo-chegada');
const chegada = (page: Page) => page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
const tela = (page: Page) => page.locator('.chegada-tela');
const guardado = (page: Page, chave: string) =>
  page.evaluate((c) => localStorage.getItem(c), chave);

interface Ponto {
  x: number;
  y: number;
}

/** A folha da Chegada num quadro: o que a deixa escondida por baixo do nome. */
interface EstadoDaFolha {
  opacidade: string;
  eventos: string;
  fundo: string;
}

/** O que se viu, quadro a quadro, da camada até a caneta do Zé acabar. */
interface Visita {
  /** As fases da camada, na ordem (`data-fase`), e o `data-voo` que ela mostrou (`ze` se a luz vai ao Zé). */
  fases: string[];
  voo: string | null;
  /** A última posição da luz da Abertura e a primeira da caneta do Zé (o centro dela na tela). */
  luz: Ponto | null;
  pena: Ponto | null;
  /** O pé esquerdo do Zé, pela caixa do <svg> dele (viewBox 22 10 196 240; o pé em 84, 230). */
  pe: Ponto | null;
  /** O ponto do lockup do cabeçalho, onde a luz pousa quando não vai ao Zé. */
  alvo: Ponto | null;
  /** Quadros, entre a luz sair do nome e a caneta do Zé acabar, em que nenhuma das duas estava à vista. */
  semLuz: number;
  /**
   * Vezes em que a luz do nome sumiu antes de a caneta do Zé aparecer. O olhar quadro a quadro pode perder
   * esse vão (a caneta que chega no quadro seguinte é um quadro sem luz na tela); um observador de mutações
   * roda logo depois do código que as fez, antes de qualquer quadro, e o vê.
   */
  lacunas: number;
  /** Quadros em que havia uma folha modal aberta (escondida ou não) com a camada na tela, e em que ela estava opaca. */
  folhasAbertas: number;
  folhaVisivelAntes: number;
  /** A folha no último quadro antes de a luz pousar e no último quadro visto. */
  antes: EstadoDaFolha | null;
  depois: EstadoDaFolha | null;
  /**
   * Quadros, depois do pouso e antes de o texto subir, em que o toque no centro do "Vamos" ainda cairia
   * nele (invisível, ele não pode pegar o toque de quem tocava em "Pular").
   */
  tocavaEscondido: number;
  /** Ms depois do pouso: o texto começa a subir, o texto e o "Vamos" ficam inteiros, a caneta some. */
  textoSobe: number | null;
  textoInteiro: number | null;
  rodapeInteiro: number | null;
  penaDuracao: number | null;
}

/**
 * Olha a visita a cada quadro, de dentro da página, até a caneta do Zé sumir da flor (ou, se a luz não
 * vai ao Zé, até a camada sair e a Chegada aparecer). A camada já tem de estar na tela.
 */
function acompanharAVisita(page: Page): Promise<Visita> {
  return page.evaluate(
    () =>
      new Promise<Visita>((resolver) => {
        const centro = (el: Element): Ponto => {
          const caixa = el.getBoundingClientRect();
          return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
        };
        const folhaAgora = (): EstadoDaFolha | null => {
          const alvo = document.querySelector('dialog.dialogo-chegada');
          if (!alvo) return null;
          const estilo = getComputedStyle(alvo);
          return {
            opacidade: estilo.opacity,
            eventos: estilo.pointerEvents,
            fundo: getComputedStyle(alvo, '::backdrop').backgroundColor,
          };
        };
        const opacidadeDe = (seletor: string): number | null => {
          const el = document.querySelector(seletor);
          return el ? Number(getComputedStyle(el).opacity) : null;
        };
        // viewBox "22 10 196 240" ajustada à caixa sem distorcer; o pé esquerdo do tronco está em (84, 230).
        const peDoZe = (): Ponto | null => {
          const svg = document.querySelector('.chegada-ze svg.ze');
          if (!svg) return null;
          const caixa = svg.getBoundingClientRect();
          const escala = Math.min(caixa.width / 196, caixa.height / 240);
          return {
            x: caixa.left + (caixa.width - 196 * escala) / 2 + (84 - 22) * escala,
            y: caixa.top + (caixa.height - 240 * escala) / 2 + (230 - 10) * escala,
          };
        };

        const visto: Visita = {
          fases: [],
          voo: null,
          luz: null,
          pena: null,
          pe: null,
          alvo: null,
          semLuz: 0,
          lacunas: 0,
          folhasAbertas: 0,
          folhaVisivelAntes: 0,
          antes: null,
          depois: null,
          tocavaEscondido: 0,
          textoSobe: null,
          textoInteiro: null,
          rodapeInteiro: null,
          penaDuracao: null,
        };
        const comeco = performance.now();
        let luzVista = false;
        let penaJaVista = false;
        const vigia = new MutationObserver(() => {
          const abertura = document.querySelector('.abertura');
          const grupo = abertura?.querySelector('.abertura-luz g');
          const pena = document.querySelector('.chegada-ze .z-pena');
          if (
            abertura?.getAttribute('data-voo') === 'ze' &&
            luzVista &&
            !penaJaVista &&
            grupo?.getAttribute('visibility') === 'hidden' &&
            pena?.getAttribute('visibility') !== 'visible'
          ) {
            visto.lacunas += 1;
          }
          if (pena?.getAttribute('visibility') === 'visible') penaJaVista = true;
        });
        vigia.observe(document.documentElement, {
          subtree: true,
          attributes: true,
          attributeFilter: ['visibility'],
        });
        let pouso: number | null = null;
        let penaSumiuEm: number | null = null;
        let camadaSaiuEm: number | null = null;
        const quadro = (agora: number) => {
          const abertura = document.querySelector('.abertura');
          const grupo = abertura?.querySelector('.abertura-luz g') ?? null;
          const pena = document.querySelector('.chegada-ze .z-pena');
          const luzVisivel = grupo?.getAttribute('visibility') === 'visible';
          const penaVisivel = pena?.getAttribute('visibility') === 'visible';

          if (penaVisivel && pouso === null) {
            penaJaVista = true;
            pouso = agora;
            visto.pena = centro(pena);
            visto.pe = peDoZe();
          }
          if (pouso === null) visto.antes = folhaAgora();
          if (abertura) {
            const fase = abertura.getAttribute('data-fase') ?? '';
            if (visto.fases[visto.fases.length - 1] !== fase) visto.fases.push(fase);
            visto.voo ??= abertura.getAttribute('data-voo');
            const aberta = folhaAgora();
            if (document.querySelector('dialog[open]')) visto.folhasAbertas += 1;
            if (
              aberta &&
              aberta.opacidade !== '0' &&
              (fase === 'escrevendo' || fase === 'voando')
            ) {
              visto.folhaVisivelAntes += 1;
            }
          } else {
            camadaSaiuEm ??= agora;
          }
          if (luzVisivel) {
            luzVista = true;
            const lugar = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(
              grupo.getAttribute('transform') ?? '',
            );
            if (lugar) visto.luz = { x: Number(lugar[1]), y: Number(lugar[2]) };
          }
          if (visto.voo === 'ze' && luzVista && !luzVisivel && !penaVisivel && pouso === null) {
            visto.semLuz += 1;
          }
          if (pouso !== null && penaSumiuEm === null) {
            if (penaVisivel) {
              visto.penaDuracao = agora - pouso;
            } else {
              penaSumiuEm = agora;
              // Entre a luz do nome e a caneta do Zé nunca houve um quadro sem uma das duas.
            }
          }
          if (pouso !== null) {
            const dentro = agora - pouso;
            const texto = opacidadeDe('.chegada-texto');
            const rodape = opacidadeDe('.chegada-rodape');
            if (texto !== null) {
              if (visto.textoSobe === null && texto > 0.05) visto.textoSobe = dentro;
              if (visto.textoInteiro === null && texto >= 0.99) visto.textoInteiro = dentro;
            }
            if (rodape !== null && visto.rodapeInteiro === null && rodape >= 0.99) {
              visto.rodapeInteiro = dentro;
            }
          }
          const botao = document.querySelector('.chegada-rodape button');
          const folhaDaChegada = document.querySelector('.chegada-tela');
          if (
            pouso !== null &&
            botao &&
            folhaDaChegada?.getAttribute('data-entrada') === 'desenhar' &&
            !folhaDaChegada.hasAttribute('data-revelado')
          ) {
            const lugar = centro(botao);
            if (document.elementFromPoint(lugar.x, lugar.y)?.closest('.revela')) {
              visto.tocavaEscondido += 1;
            }
          }
          const ponto = document.querySelector('.marca .lockup-ponto');
          if (ponto) visto.alvo = centro(ponto);

          const acabou =
            (penaSumiuEm !== null && agora - penaSumiuEm > 300) ||
            (camadaSaiuEm !== null && pouso === null && agora - camadaSaiuEm > 700) ||
            agora - comeco > 20_000;
          if (acabou) {
            vigia.disconnect();
            visto.depois = folhaAgora();
            resolver(visto);
            return;
          }
          requestAnimationFrame(quadro);
        };
        requestAnimationFrame(quadro);
      }),
  );
}

const distancia = (a: Ponto | null, b: Ponto | null) =>
  a && b ? Math.hypot(a.x - b.x, a.y - b.y) : Number.POSITIVE_INFINITY;

/** O Zé está inteiro e parado: nenhuma parte escondida, nenhum traço por desenhar, o néon assentado, sem caneta. */
function zeInteiro(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const svg = document.querySelector('.chegada-ze svg.ze');
    if (!svg) return false;
    const partes = [
      ...svg.querySelectorAll<SVGElement>('.z-tr, .z-miolo, .z-olho, .z-bochechas, .z-flor'),
    ];
    const tracos = [...svg.querySelectorAll<SVGElement>('.z-tr')];
    return (
      partes.length > 5 &&
      partes.every((el) => el.style.opacity === '') &&
      tracos.every((el) => el.style.strokeDasharray === '') &&
      svg.querySelector('.z-pena')?.getAttribute('visibility') === 'hidden' &&
      !svg.hasAttribute('data-acesa')
    );
  });
}

/** A Chegada à mostra por inteiro: opaca, o texto e o "Vamos" à vista, o Zé inteiro e o desenho acabado. */
async function chegadaInteira(page: Page) {
  await expect(folha(page)).toHaveCSS('opacity', '1');
  await expect(page.locator('.chegada-texto')).toHaveCSS('opacity', '1');
  await expect(page.locator('.chegada-rodape')).toHaveCSS('opacity', '1');
  await expect.poll(() => zeInteiro(page), { timeout: 10_000 }).toBe(true);
}

/** O toque onde está o "Pular" (a folha modal por baixo o torna inerte: vale o gesto de pular do documento). */
async function tocarNoPular(page: Page, hasTouch: boolean) {
  const caixa = await page.getByRole('button', { name: 'Pular', exact: true }).boundingBox();
  if (!caixa) throw new Error('sem "Pular" na tela');
  const [x, y] = [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2];
  if (hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Um aparelho que já escreveu o nome, mas em outro Dia: a Abertura é a do modo curto. */
async function escreveuEmOutroDia(page: Page) {
  await page.addInitScript(
    ([chave, valor]) => {
      try {
        if (window.localStorage.getItem(chave as string) === null) {
          window.localStorage.setItem(chave as string, valor as string);
        }
      } catch {
        /* sem armazenamento */
      }
    },
    [CHAVE_DA_ESCRITA, JSON.stringify({ dia: DIA_ANTIGO })],
  );
}

test('a luz pousa no pé esquerdo do Zé e a caneta dele continua dali; o texto sobe na metade do contorno', async ({
  page,
}) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  // A folha já está aberta por baixo do nome, e ainda não foi vista: não está guardada como vista.
  await expect(folha(page)).toBeAttached();
  expect(await guardado(page, CHAVE_DA_CHEGADA)).toBeNull();

  const visita = await acompanharAVisita(page);
  // Escreve o nome, a luz voa ao Zé (e não ao cabeçalho) e a camada esmaece sobre a folha que se revela.
  expect(visita.fases).toEqual(['escrevendo', 'voando', 'saindo']);
  expect(visita.voo).toBe('ze');
  // Até a luz pousar, a folha esteve escondida: sem opacidade, sem pegar toque e sem véu no fundo.
  expect(visita.folhaVisivelAntes).toBe(0);
  expect(visita.antes).toEqual({
    opacidade: '0',
    eventos: 'none',
    fundo: 'rgba(0, 0, 0, 0)',
  });
  // A luz do nome pousa no pé esquerdo do Zé, a caneta dele sai dali e nunca houve um quadro sem uma das duas.
  expect(distancia(visita.pena, visita.pe)).toBeLessThan(6);
  expect(distancia(visita.luz, visita.pena)).toBeLessThan(8);
  expect(visita.semLuz).toBe(0);
  expect(visita.lacunas).toBe(0);
  // O contorno leva 1,2 s e a luz ainda salta à flor (0,24 s): a caneta fica na tela cerca de 1,4 s.
  expect(visita.penaDuracao).toBeGreaterThan(1_200);
  expect(visita.penaDuracao).toBeLessThan(2_500);
  // Enquanto esperam, o texto e o "Vamos" não pegam toque: um toque no pé da tela logo depois do pouso
  // (quem tocava em "Pular") não pode levar ao passeio sem a pessoa ter visto o botão.
  expect(visita.tocavaEscondido).toBe(0);
  // O texto e o "Vamos" esperam a metade do contorno e sobem juntos.
  expect(visita.textoSobe).toBeGreaterThan(250);
  expect(visita.textoSobe).toBeLessThan(1_100);
  expect(visita.textoInteiro).toBeLessThan(1_500);
  expect(visita.rodapeInteiro).toBeLessThan(1_500);
  // Depois do pouso a folha é a de sempre: opaca, pegando toque e com o véu do fundo.
  expect(visita.depois?.opacidade).toBe('1');
  expect(visita.depois?.eventos).toBe('auto');
  expect(visita.depois?.fundo).not.toBe('rgba(0, 0, 0, 0)');

  await expect(camada(page)).toHaveCount(0);
  await expect(chegada(page)).toBeVisible();
  // Só agora a Chegada conta como vista, e a Entrada do Dia não abre no mesmo Dia.
  expect(await guardado(page, CHAVE_DA_CHEGADA)).toBe('{"vista":true}');
  expect(await guardado(page, CHAVE_DA_ENTRADA)).toMatch(/^\{"dia":"\d{4}-\d{2}-\d{2}"\}$/);
  await expect.poll(() => zeInteiro(page), { timeout: 10_000 }).toBe(true);
});

test('o que a entrada deixa é o Zé de sempre: inteiro e igual ao de uma Chegada que não se desenhou', async ({
  page,
  hasTouch,
}) => {
  const ze = page.locator('.chegada-ze');
  // A Chegada pulada: o Zé aparece pronto, e é o de referência.
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await tocarNoPular(page, hasTouch);
  await expect(camada(page)).toHaveCount(0);
  await chegadaInteira(page);
  const pronto = await ze.screenshot();

  // A mesma Chegada, só que a de verdade: a luz pousa e o Zé se desenha.
  await page.evaluate(
    (chaves) => {
      for (const chave of chaves) localStorage.removeItem(chave);
    },
    [CHAVE_DA_ESCRITA, CHAVE_DA_CHEGADA, CHAVE_DA_ENTRADA],
  );
  await page.reload();
  await expect(camada(page)).toBeVisible();
  await expect(camada(page)).toHaveCount(0, { timeout: 10_000 });
  // O desenho acaba cerca de 3 s depois do pouso e a primeira piscada vem 2,2 s depois disso.
  await expect
    .poll(async () => pontosDiferentes(page, await ze.screenshot(), pronto), {
      timeout: 10_000,
      intervals: [250],
    })
    .toBe(0);
});

test('"Pular" na espera: a luz não voa, a Chegada aparece com o Zé pronto, e o toque que pulou não escolhe nada', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await expect(folha(page)).toBeAttached();
  await tocarNoPular(page, hasTouch);
  await expect(camada(page)).toHaveCount(0);

  await expect(tela(page)).toHaveAttribute('data-entrada', 'pronta');
  await chegadaInteira(page);
  // O toque cai onde ficam os caminhos da folha no celular (o "Vamos" é embaixo, no meio): não aciona nenhum.
  await page.waitForTimeout(800);
  await expect(tela(page)).toHaveAttribute('data-tela', 'boas');
  await expect(page).toHaveURL(/#\/$/);
  expect(await guardado(page, CHAVE_DA_CHEGADA)).toBe('{"vista":true}');
});

test('Esc na espera só pula a Abertura; o segundo Esc fecha as Boas-vindas', async ({ page }) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await expect(folha(page)).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(camada(page)).toHaveCount(0);
  await expect(chegada(page)).toBeVisible();
  await chegadaInteira(page);
  await page.keyboard.press('Escape');
  await expect(chegada(page)).toBeHidden();
});

test('"Vamos" no meio do desenho: a folha segue para o passeio, e voltar às boas-vindas não redesenha o Zé', async ({
  page,
}) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  // O texto sobe na metade do contorno: o "Vamos" já está à mão, e o Zé ainda se desenha.
  await expect(page.locator('.chegada-tela[data-revelado]')).toBeAttached({ timeout: 10_000 });
  expect(await zeInteiro(page)).toBe(false);
  await chegada(page).getByRole('button', { name: 'Vamos' }).click();
  const passo = page.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' });
  await expect(passo).toBeVisible();
  await passo.getByRole('button', { name: 'Voltar às boas-vindas' }).click();
  await expect(chegada(page)).toBeVisible();
  await expect(tela(page)).toHaveAttribute('data-entrada', 'pronta');
  await chegadaInteira(page);
});

test('sem o pé do Zé à vista a luz vai ao cabeçalho, como na Abertura sem Chegada, e a Chegada aparece pronta', async ({
  page,
}) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await expect(folha(page)).toBeAttached();
  // O corpo da folha fica baixo demais e o Zé rola para fora (CSSOM: a CSP barra style="").
  await page.evaluate(() => {
    const corpo = document.querySelector<HTMLElement>('.chegada-corpo');
    if (!corpo) throw new Error('sem corpo da folha');
    corpo.style.flex = 'none';
    corpo.style.height = '24px';
    corpo.style.overflow = 'hidden';
  });

  const visita = await acompanharAVisita(page);
  expect(visita.fases).toEqual(['escrevendo', 'voando']);
  expect(visita.voo).toBeNull();
  expect(visita.pena).toBeNull();
  expect(visita.folhaVisivelAntes).toBe(0);
  expect(distancia(visita.luz, visita.alvo)).toBeLessThan(8);
  await expect(camada(page)).toHaveCount(0);
  await expect(tela(page)).toHaveAttribute('data-entrada', 'pronta');
  await expect(folha(page)).toHaveCSS('opacity', '1');
  await expect(page.locator('.chegada-texto')).toHaveCSS('opacity', '1');
  await expect.poll(() => zeInteiro(page)).toBe(true);
  expect(await guardado(page, CHAVE_DA_CHEGADA)).toBe('{"vista":true}');
});

test('na abertura curta (o nome é de outro Dia) a luz não visita o Zé: a Chegada espera a camada sair e aparece pronta', async ({
  page,
}) => {
  // Só a primeira vez no aparelho leva a luz ao Zé: o modo curto a leva ao cabeçalho, como na Abertura sem Chegada.
  await escreveuEmOutroDia(page);
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pular', exact: true })).toHaveCount(0);

  const visita = await acompanharAVisita(page);
  expect(visita.fases).toEqual(['escrevendo', 'voando']);
  expect(visita.voo).toBeNull();
  // Nenhuma folha abre por baixo do nome: a Chegada espera a camada sair.
  expect(visita.folhasAbertas).toBe(0);
  expect(distancia(visita.luz, visita.alvo)).toBeLessThan(8);
  await expect(camada(page)).toHaveCount(0);
  await expect(tela(page)).toHaveAttribute('data-entrada', 'pronta');
  await chegadaInteira(page);
});

test('movimento reduzido: nenhuma camada, a Chegada abre com o Zé pronto e o texto à mostra', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(chegada(page)).toBeVisible();
  await expect(camada(page)).toHaveCount(0);
  await expect(tela(page)).toHaveAttribute('data-entrada', 'pronta');
  await chegadaInteira(page);
});

test.describe('em tela pequena', () => {
  test('numa tela de 320 × 568 a luz acha o pé do Zé ou vai ao cabeçalho, e a Chegada aparece inteira', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();

    const visita = await acompanharAVisita(page);
    expect(visita.folhaVisivelAntes).toBe(0);
    if (visita.voo === 'ze') {
      expect(distancia(visita.pena, visita.pe)).toBeLessThan(6);
      expect(visita.semLuz).toBe(0);
      expect(visita.lacunas).toBe(0);
    } else {
      expect(distancia(visita.luz, visita.alvo)).toBeLessThan(8);
    }
    await expect(camada(page)).toHaveCount(0);
    await chegadaInteira(page);
    const lateral = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(lateral).toBe(0);
  });
});
