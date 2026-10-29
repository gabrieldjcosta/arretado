import type { Locator, Page } from '@playwright/test';
import { expect, pularAAbertura, semViolacoes, test } from './apoio';

// A Abertura (M2 do Zé, contrato §9): o nome em tela cheia, escrito pela caneta, e a luz que o leva ao
// cabeçalho. Os testes de unidade não têm layout, popover nem animação; aqui roda a camada de verdade, no
// Chromium. Este arquivo desliga a semeadura que dá a todos os outros testes um aparelho em que o nome já
// foi escrito hoje (ver `apoio.ts`): sem ela, a primeira vez no aparelho é a de verdade. Safari e Firefox
// não são exercitados.
test.use({ semearEscrita: false });

const CHAVE = 'arretado:escrita-do-nome:v1';
const DIA_ANTIGO = '2026-01-01';
const UM_DIA = /^\d{4}-\d{2}-\d{2}$/;

const camada = (page: Page) => page.locator('.abertura');
const pular = (page: Page) => page.getByRole('button', { name: 'Pular', exact: true });
const guardado = (page: Page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE);
const chegada = (page: Page) => page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });

interface Ponto {
  x: number;
  y: number;
}

/** O que a camada fez, visto quadro a quadro de dentro da página até ela sair da tela. */
interface Percurso {
  /** As fases por que passou, na ordem (`data-fase`). */
  fases: string[];
  /** Quadros em que o centro do nome estava sob outra coisa que não a camada. */
  cobertos: number;
  /** Quadros em que havia uma folha modal (<dialog>) à vista (opaca) com a camada ainda escrevendo ou voando. */
  folhasVisiveis: number;
  /** O disco atrás do ponto do nome (de onde a luz sai), as posições da luz que voa e o ponto do cabeçalho. */
  disco: Ponto | null;
  primeira: Ponto | null;
  ultima: Ponto | null;
  alvo: Ponto | null;
  /** O "Pular" no último quadro do voo (a camada da primeira vez): o botão já saiu de cena? */
  pularNoVoo: { opacidade: string; visibilidade: string } | null;
}

/** Espera a camada sair, olhando a cada quadro (a camada já tem de estar na tela). */
function acompanhar(page: Page): Promise<Percurso> {
  return page.evaluate(
    () =>
      new Promise<Percurso>((resolver) => {
        const centro = (el: Element): Ponto => {
          const caixa = el.getBoundingClientRect();
          return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
        };
        const visto: Percurso = {
          fases: [],
          cobertos: 0,
          folhasVisiveis: 0,
          disco: null,
          primeira: null,
          ultima: null,
          alvo: null,
          pularNoVoo: null,
        };
        const fim = performance.now() + 15_000;
        const quadro = () => {
          const abertura = document.querySelector('.abertura');
          if (!abertura || performance.now() > fim) {
            resolver(visto);
            return;
          }
          const fase = abertura.getAttribute('data-fase') ?? '';
          if (visto.fases[visto.fases.length - 1] !== fase) visto.fases.push(fase);
          const nome = abertura.querySelector('svg.eb');
          if (nome) {
            const { x, y } = centro(nome);
            const em = document.elementFromPoint(x, y);
            if (!em || !abertura.contains(em)) visto.cobertos += 1;
          }
          // A folha da Chegada pode estar aberta por baixo do nome, mas escondida (sem opacidade): só conta se se vê.
          const folha = document.querySelector('dialog[open]');
          if (folha && getComputedStyle(folha).opacity !== '0' && fase !== 'saindo') {
            visto.folhasVisiveis += 1;
          }
          const disco = abertura.querySelector('.eb-disco');
          if (fase === 'escrevendo' && disco) visto.disco = centro(disco);
          const botao = abertura.querySelector('.abertura-pular');
          if (fase === 'voando' && botao) {
            const { opacity, visibility } = getComputedStyle(botao);
            visto.pularNoVoo = { opacidade: opacity, visibilidade: visibility };
          }
          const luz = abertura.querySelector('.abertura-luz g');
          if (luz?.getAttribute('visibility') === 'visible') {
            const lugar = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(
              luz.getAttribute('transform') ?? '',
            );
            if (lugar) {
              const posicao = { x: Number(lugar[1]), y: Number(lugar[2]) };
              visto.primeira ??= posicao;
              visto.ultima = posicao;
            }
          }
          const ponto = document.querySelector('.marca .lockup-ponto');
          if (ponto) visto.alvo = centro(ponto);
          requestAnimationFrame(quadro);
        };
        requestAnimationFrame(quadro);
      }),
  );
}

const distancia = (a: Ponto | null, b: Ponto | null) =>
  a && b ? Math.hypot(a.x - b.x, a.y - b.y) : Number.POSITIVE_INFINITY;

/** Um aparelho que já escreveu o nome, mas em outro Dia: a primeira abertura de hoje é a do modo curto. */
async function escreveuEmOutroDia(page: Page) {
  await page.addInitScript(
    ([chave, valor]) => {
      try {
        // Só se falta: recarregar na mesma sessão de teste não desfaz o que o app guardou.
        if (window.localStorage.getItem(chave as string) === null) {
          window.localStorage.setItem(chave as string, valor as string);
        }
      } catch {
        /* sem armazenamento */
      }
    },
    [CHAVE, JSON.stringify({ dia: DIA_ANTIGO })],
  );
}

async function caixaDe(alvo: Locator) {
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error('sem caixa na tela');
  return caixa;
}

/** O nome cabe na largura e na altura da tela, "Pular" está à vista abaixo dele e nada rola de lado. */
async function cabeNaTela(page: Page) {
  const tela = page.viewportSize();
  if (!tela) throw new Error('sem tamanho de tela');
  const nome = await caixaDe(page.locator('.abertura svg.eb'));
  expect(nome.x).toBeGreaterThanOrEqual(0);
  expect(nome.x + nome.width).toBeLessThanOrEqual(tela.width);
  expect(nome.y).toBeGreaterThanOrEqual(0);
  expect(nome.y + nome.height).toBeLessThanOrEqual(tela.height);
  const botao = await caixaDe(pular(page));
  expect(botao.y).toBeGreaterThanOrEqual(nome.y + nome.height);
  expect(botao.y + botao.height).toBeLessThanOrEqual(tela.height);
  expect(botao.x).toBeGreaterThanOrEqual(0);
  expect(botao.x + botao.width).toBeLessThanOrEqual(tela.width);
  // O alvo de toque tem 44 px de lado, no mínimo (0,01 de folga para o arredondamento).
  expect(botao.width).toBeGreaterThanOrEqual(43.99);
  expect(botao.height).toBeGreaterThanOrEqual(43.99);
  const lateral = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(lateral).toBe(0);
}

test('primeira vez no aparelho: o nome em tela cheia, "Pular" à vista, a luz voa ao cabeçalho e a camada sai', async ({
  page,
}) => {
  await page.goto('/#/');
  const abertura = camada(page);
  await expect(abertura).toBeVisible();
  // Um popover aberto, na camada de topo do navegador, e não uma `div` solta.
  expect(await abertura.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await expect(pular(page)).toBeVisible();
  // O nome é desenhado dentro da camada; o cabeçalho espera, com o lockup parado (a escrita é de um lugar só).
  await expect(abertura.locator('svg.eb')).not.toHaveClass(/curta|calmo|pulou/);
  await expect(page.locator('.marca svg.eb')).toHaveCount(0);
  await expect(page.locator('.marca .lockup-ponto')).toHaveCount(1);

  const percurso = await acompanhar(page);
  // Escreve e depois a luz voa; o nome nunca fica sob outra coisa nem sob uma folha.
  expect(percurso.fases).toEqual(['escrevendo', 'voando']);
  expect(percurso.cobertos).toBe(0);
  expect(percurso.folhasVisiveis).toBe(0);
  // A luz sai do disco do nome, anda um bom trecho e pousa no ponto do lockup do cabeçalho.
  expect(distancia(percurso.primeira, percurso.disco)).toBeLessThan(2);
  expect(distancia(percurso.primeira, percurso.alvo)).toBeGreaterThan(100);
  expect(distancia(percurso.ultima, percurso.alvo)).toBeLessThan(8);
  // O "Pular" não fica sozinho sobre a barra de baixo quando o fundo já é transparente.
  expect(percurso.pularNoVoo).toEqual({ opacidade: '0', visibilidade: 'hidden' });

  await expect(abertura).toHaveCount(0);
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
  expect(JSON.parse((await guardado(page)) ?? 'null')).toMatchObject({
    dia: expect.stringMatching(UM_DIA),
  });
  // O Hoje estava ali por baixo, inteiro, e segue usável.
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});

test('"Pular" tira a camada na hora, e o cabeçalho segue com o nome parado', async ({ page }) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await pular(page).click();
  await expect(camada(page)).toHaveCount(0, { timeout: 1_500 });
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
  await expect(page.locator('.marca svg.eb')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$/);
});

test('a segunda abertura do mesmo Dia: nenhuma camada, o lockup parado na hora', async ({
  page,
}) => {
  await page.goto('/#/');
  await pularAAbertura(page);
  await page.reload();
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  // A decisão é de milissegundos: dado um respiro, nada abriu.
  await page.waitForTimeout(600);
  await expect(camada(page)).toHaveCount(0);
  await expect(page.locator('.marca svg.eb')).toHaveCount(0);
});

test('primeira abertura de outro Dia: o modo curto, sem "Pular", e o Dia fica guardado', async ({
  page,
}) => {
  await escreveuEmOutroDia(page);
  await page.goto('/#/');
  const abertura = camada(page);
  await expect(abertura).toBeVisible();
  await expect(abertura.locator('svg.eb')).toHaveClass(/curta/);
  await expect(pular(page)).toHaveCount(0);

  const percurso = await acompanhar(page);
  expect(percurso.fases).toEqual(['escrevendo', 'voando']);
  expect(percurso.cobertos).toBe(0);
  expect(distancia(percurso.ultima, percurso.alvo)).toBeLessThan(8);
  await expect(abertura).toHaveCount(0);

  const dia = (JSON.parse((await guardado(page)) ?? 'null') as { dia: string }).dia;
  expect(dia).toMatch(UM_DIA);
  expect(dia).not.toBe(DIA_ANTIGO);
  // A seguinte, no mesmo Dia, já é a parada.
  await page.reload();
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(camada(page)).toHaveCount(0);
});

test('um toque pula, e é só isso: o que está embaixo dele não é acionado', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  const biblioteca = page
    .getByRole('navigation', { name: 'Áreas' })
    .getByRole('link', { name: 'Biblioteca' });
  const caixa = await caixaDe(biblioteca);
  // No toque de verdade o clique nasce depois de a camada sair, e cairia no link; com o mouse, não.
  const [x, y] = [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2];
  if (hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(camada(page)).toHaveCount(0);
  // Nem o toque nem o clique que ele gera chegam ao link; o Hoje continua na tela.
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  // Passada a janela do gesto, o link responde como sempre.
  await page.waitForTimeout(800);
  await biblioteca.click();
  await expect(page).toHaveURL(/#\/biblioteca$/);
});

test('a primeira tecla também pula, e é só isso: o Tab não move o foco', async ({ page }) => {
  await page.goto('/#/');
  await expect(camada(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(camada(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  // A seguinte vale: vai ao primeiro lugar da tela.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
});

test('movimento reduzido: nenhuma camada, o lockup parado, e a primeira vez continua guardada', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(camada(page)).toHaveCount(0);
  expect(await guardado(page)).toBeNull();

  // Quando a pessoa deixa de reduzir, a primeira vez ainda está lá.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(camada(page)).toBeVisible();
  await pular(page).click();
  await expect(camada(page)).toHaveCount(0);
});

test('perfil Calmo, com o "só estudo" ligado (o preset): sem tela cheia, o cabeçalho escreve o nome', async ({
  page,
}) => {
  // O perfil Calmo liga o "só estudo" e o "só estudo" mantém a tela cheia fechada (contrato §13, item 20):
  // quem usa o preset continua vendo o nome escrito no cabeçalho, só esmaecendo.
  await page.goto('/#/conta/perfis');
  await pularAAbertura(page);
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();

  // Outro Dia: a primeira abertura dele.
  await page.evaluate(
    ([chave, valor]) => {
      window.localStorage.setItem(chave as string, valor as string);
    },
    [CHAVE, JSON.stringify({ dia: DIA_ANTIGO })],
  );
  await page.goto('/#/');
  await page.reload();
  const nome = page.locator('.marca svg.eb');
  await expect(nome).toHaveClass(/calmo/);
  await expect(nome).toHaveClass(/curta/);
  await page.waitForTimeout(600);
  await expect(camada(page)).toHaveCount(0);
  // O cabeçalho tomou a escrita do Dia.
  const dia = (JSON.parse((await guardado(page)) ?? 'null') as { dia: string }).dia;
  expect(dia).toMatch(UM_DIA);
  expect(dia).not.toBe(DIA_ANTIGO);
});

test('perfil Calmo, com o "só estudo" desligado: a camada só esmaece, sem caneta nem voo', async ({
  page,
}) => {
  // O perfil Calmo liga o "só estudo" (que mantém a tela cheia fechada); a pessoa o desliga numa Sessão.
  await page.goto('/#/conta/perfis');
  await pularAAbertura(page);
  await page.getByRole('radio', { name: /^Calmo/ }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
  ).toBeVisible();
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  const soEstudo = page.getByRole('checkbox', { name: 'Só estudo' });
  await expect(soEstudo).toBeChecked();
  await soEstudo.click();
  await expect(soEstudo).not.toBeChecked();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();

  // Outro Dia: a primeira abertura dele.
  await page.evaluate(
    ([chave, valor]) => {
      window.localStorage.setItem(chave as string, valor as string);
    },
    [CHAVE, JSON.stringify({ dia: DIA_ANTIGO })],
  );
  await page.goto('/#/');
  await page.reload();
  const abertura = camada(page);
  await expect(abertura).toBeVisible();
  await expect(abertura).toHaveAttribute('data-calmo', '');
  await expect(abertura.locator('svg.eb')).toHaveClass(/calmo/);
  const percurso = await acompanhar(page);
  expect(percurso.fases).toEqual(['escrevendo', 'saindo']);
  expect(percurso.primeira).toBeNull();
  expect(percurso.cobertos).toBe(0);
  await expect(abertura).toHaveCount(0);
  await expect(page.locator('.marca .lockup-ponto')).toBeVisible();
});

test.describe('o nome cabe em tela pequena e em zoom', () => {
  // O `install()` instala o relógio falso, mas ele segue andando em tempo real: não segura a camada (a da primeira vez
  // sai em 3,4 s, a do Calmo em 1,3 s). Estes testes medem rápido e correm contra esse tempo; o axe precisa dos
  // temporizadores da página, então o relógio não pode ficar parado (`pauseAt` o trava).
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  test('numa tela de 320 × 568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    await cabeNaTela(page);
  });

  test('com zoom de 200% (195 × 400 px de layout)', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 400 });
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    await cabeNaTela(page);
  });

  test('com o texto a 200% numa tela de celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    // CSSOM: a CSP barra <style> e style="".
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await cabeNaTela(page);
  });

  test('sem violações do axe, nos dois temas', async ({ page }) => {
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe('com a Chegada por abrir', () => {
  // Sem a semeadura da Chegada: a primeira vez no aparelho abre a folha das Boas-vindas com o nome. A folha
  // abre já, escondida por baixo dele, para a luz pousar no Zé dela (`abertura-ao-ze.spec.ts`).
  test.use({ semearAbertura: false });

  test('o nome escrito nunca fica sob a folha: ela espera escondida e só aparece quando a luz pousa nela', async ({
    page,
  }) => {
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    const percurso = await acompanhar(page);
    // A luz voa ao Zé da folha e a camada esmaece sobre ela; até lá a folha esteve sem opacidade.
    expect(percurso.fases).toEqual(['escrevendo', 'voando', 'saindo']);
    expect(percurso.folhasVisiveis).toBe(0);
    await expect(chegada(page)).toBeVisible();
    await expect(camada(page)).toHaveCount(0);
  });

  test('o toque que pula não chega à folha: ela abre inteira, e nenhum caminho foi escolhido', async ({
    page,
  }) => {
    await page.goto('/#/');
    await expect(camada(page)).toBeVisible();
    // No meio da tela, onde ficam os caminhos da Chegada quando ela abre.
    const tela = page.viewportSize();
    if (!tela) throw new Error('sem tamanho de tela');
    await page.mouse.click(tela.width / 2, tela.height / 2);
    await expect(camada(page)).toHaveCount(0);
    await expect(chegada(page)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(chegada(page)).toBeVisible();
    await expect(page).toHaveURL(/#\/$/);
  });

  test('perfil Calmo: a luz não visita o Zé, e a Chegada espera a camada sair e aparece pronta', async ({
    page,
  }) => {
    // O Calmo não tem voo: a Chegada abre depois da camada, com o Zé pronto e o texto só esmaecendo.
    await page.goto('/#/conta/perfis');
    await pularAAbertura(page);
    await page.getByRole('radio', { name: /^Calmo/ }).check();
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Perfil Calmo aplicado.' }),
    ).toBeVisible();
    // O preset liga o "só estudo", que mantém a Chegada fechada: a pessoa o desliga numa Sessão.
    await page.goto('/#/sessao/iniciar');
    await page.getByRole('button', { name: 'Começar', exact: true }).click();
    const soEstudo = page.getByRole('checkbox', { name: 'Só estudo' });
    await expect(soEstudo).toBeChecked();
    await soEstudo.click();
    await expect(soEstudo).not.toBeChecked();
    await page.getByRole('link', { name: 'Encerrar' }).click();
    await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();

    // Outro Dia, com a Chegada ainda por abrir, num carregamento novo: ir ao Hoje de dentro do aplicativo já
    // a decidiria ali, e ela abriria (e se guardaria como vista) antes de o teste olhar.
    await page.addInitScript(
      ([escrita, dia, ...vistas]) => {
        try {
          window.localStorage.setItem(escrita as string, dia as string);
          for (const chave of vistas) window.localStorage.removeItem(chave);
        } catch {
          /* sem armazenamento */
        }
      },
      [
        CHAVE,
        JSON.stringify({ dia: DIA_ANTIGO }),
        'arretado:chegada:v1',
        'arretado:entrada-do-dia:v1',
      ],
    );
    await page.goto('about:blank');
    await page.goto('/#/');
    const abertura = camada(page);
    await expect(abertura).toBeVisible();
    await expect(abertura).toHaveAttribute('data-calmo', '');
    const percurso = await acompanhar(page);
    expect(percurso.fases).toEqual(['escrevendo', 'saindo']);
    expect(percurso.folhasVisiveis).toBe(0);
    await expect(abertura).toHaveCount(0);

    await expect(chegada(page)).toBeVisible();
    await expect(page.locator('.chegada-tela')).toHaveAttribute('data-entrada', 'pronta');
    await expect(page.locator('.chegada-texto')).toHaveCSS('opacity', '1');
  });
});

test.describe('Ajuda › "Rever as boas-vindas"', () => {
  // O aparelho que já escreveu o nome hoje e já viu a folha (a semeadura dos outros testes).
  test.use({ semearEscrita: true });

  test('reabre a folha sem escrever o nome de novo nem chamar a camada', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    const antes = await guardado(page);
    expect(antes).toBe('{"dia":"9999-12-31"}');
    await page.getByRole('button', { name: 'Ajuda', exact: true }).click();
    await page.getByRole('button', { name: 'Rever as boas-vindas' }).click();
    await expect(chegada(page)).toBeVisible();
    await page.waitForTimeout(600);
    await expect(camada(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(chegada(page)).toBeHidden();
    expect(await guardado(page)).toBe(antes);
  });
});
