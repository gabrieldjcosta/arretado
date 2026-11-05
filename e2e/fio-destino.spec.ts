import type { Page } from '@playwright/test';
import {
  animacoesVistas,
  expect,
  importarEPublicar,
  registrarAnimacoes,
  semViolacoesNoFio,
  test,
  type AnimacaoVista,
} from './apoio';

// O Destino do Arretado novo (prévia do Fio): a tela `mapa` do mockup aprovado, com o Nordeste de verdade, a matéria do
// Ciclo em cada estado e o caminho da pessoa por cima. O jsdom não mede layout, cor nem tempo; aqui o navegador confere
// que o mapa cabe na tela (celular, tablet e monitor), que passa no axe e na medida de contraste dos pixels nos dois
// mundos, que a câmera responde (botão, teclado, roda e arrasto), que a ficha de um lugar abre, cabe e fecha com
// Escape, e que a entrada da primeira visita, o número que conta e o fio que voa entre as abas se mexem como o mockup.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';
const CHAVE_DA_VISITA = 'arretado:fio:destino-visto:v1';

/** Edital pelo CSV (cria a disciplina) e a prévia ligada. Com `comLei`, a LEP importada e ligada à matéria. */
async function prepararAPrevia(page: Page, comLei: boolean) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();

  if (comLei) {
    await importarEPublicar(page, 'lep-compilado', 'LEP');
    await page.getByRole('button', { name: 'Mudar disciplina de LEP' }).click();
    await page.getByRole('dialog').getByRole('checkbox', { name: 'Execução Penal' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Disciplina de LEP atualizada.')).toBeVisible();
  }

  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
}

const mapa = (page: Page) => page.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
const nav = (page: Page) => page.getByRole('navigation', { name: 'Lugares' });

/** A escala da câmera (pixels por unidade do desenho): sobe quando o mapa se aproxima. */
const escala = (page: Page) =>
  mapa(page).evaluate((el) => Number(el.style.getPropertyValue('--cam-k')));

/** O canto da câmera no desenho (o `viewBox` do desenho): muda quando a pessoa arrasta. */
const canto = (page: Page) =>
  mapa(page).evaluate((el) => [
    el.style.getPropertyValue('--cam-x'),
    el.style.getPropertyValue('--cam-y'),
  ]);

/** A câmera está longe (o Nordeste todo)? Então aparecem os nomes das matérias e somem os artigos (`m-alto`). */
const estaLonge = (page: Page) => mapa(page).evaluate((el) => el.classList.contains('m-alto'));

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test('o Destino cabe na tela, passa no axe e a câmera responde ao botão, ao teclado, à roda e ao arrasto', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Sem movimento, a câmera já nasce em torno da pessoa: os números não dependem de um voo.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);

  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Destino' })).toBeAttached();
  await expect(page).toHaveURL(/#\/destino$/);
  await expect(mapa(page)).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Destino' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.m-legenda-mapa')).toBeVisible();
  await expect(page.locator('.m-numero')).toBeVisible();

  // A caixa do mapa cabe na largura da tela e não é uma faixa sem altura.
  const caixa = await mapa(page).boundingBox();
  const largura = page.viewportSize()?.width ?? 0;
  expect(caixa).not.toBeNull();
  expect(caixa?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(largura);
  expect(caixa?.height ?? 0).toBeGreaterThan(300);
  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // O mockup não tem botões de aproximar e afastar: a roda, o beliscão e o teclado fazem isso.
  await expect(page.getByRole('button', { name: 'Aproximar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Afastar' })).toHaveCount(0);

  // "Ver o Nordeste" abre o mapa todo, com os nomes das matérias; "Voltar para você" fecha em torno da pessoa.
  const perto = await escala(page);
  expect(await estaLonge(page)).toBe(false);
  await page.getByRole('button', { name: 'Ver o Nordeste' }).click();
  await expect(page.getByRole('button', { name: 'Voltar para você' })).toBeVisible();
  await expect.poll(() => escala(page)).toBeLessThan(perto * 0.7);
  expect(await estaLonge(page)).toBe(true);
  await semViolacoesNoFio(page);
  await page.getByRole('button', { name: 'Voltar para você' }).click();
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);
  expect(await estaLonge(page)).toBe(false);

  // Com o foco na caixa, mais e menos aproximam e afastam, as setas passeiam e zero volta para a pessoa.
  await mapa(page).focus();
  await page.keyboard.press('+');
  await expect.poll(() => escala(page)).toBeGreaterThan(perto * 1.3);
  await expect(page.getByRole('button', { name: 'Voltar para você' })).toBeVisible();
  await page.keyboard.press('0');
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);
  const antes = await canto(page);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => canto(page)).not.toEqual(antes);
  await page.keyboard.press('0');
  await expect.poll(() => canto(page)).toEqual(antes);

  // A roda aproxima em torno do cursor, e arrastar passeia: os dois soltam a câmera da pessoa.
  const meio = {
    x: (caixa?.x ?? 0) + (caixa?.width ?? 0) / 2,
    y: (caixa?.y ?? 0) + (caixa?.height ?? 0) / 2,
  };
  await page.mouse.move(meio.x, meio.y);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => escala(page)).toBeGreaterThan(perto * 1.1);
  await page.keyboard.press('0');
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);
  const parado = await canto(page);
  await page.mouse.move((caixa?.x ?? 0) + 12, (caixa?.y ?? 0) + 12);
  await page.mouse.down();
  await page.mouse.move((caixa?.x ?? 0) + 70, (caixa?.y ?? 0) + 90, { steps: 6 });
  await expect(mapa(page)).toHaveClass(/m-arrastando/);
  await page.mouse.up();
  await expect(mapa(page)).not.toHaveClass(/m-arrastando/);
  expect(await canto(page)).not.toEqual(parado);
  await semRolagemLateral(page);
});

test('no celular e no monitor o Destino cabe, de noite e de dia, e o monitor ganha a grade larga', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);
  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();

  for (const [w, h] of [
    [360, 640],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect(mapa(page)).toBeVisible();
    const caixa = await mapa(page).boundingBox();
    expect((caixa?.x ?? -1) + (caixa?.width ?? 0)).toBeLessThanOrEqual(w);
    expect(caixa?.height ?? 0).toBeGreaterThan(300);
    await semRolagemLateral(page);
    // No monitor o quadro vira a grade larga do mockup (o número e o texto de um lado, o mapa do outro).
    expect(
      await page.evaluate(() =>
        document.querySelector('main.m-app')?.classList.contains('m-largo'),
      ),
    ).toBe(true);
    if (w < 500) {
      // Desvio 35: no celular a legenda vem entre o texto e o mapa, e não cai atrás da pílula dos três lugares.
      const legenda = await page.locator('.m-legenda-mapa').boundingBox();
      const pilula = await nav(page).boundingBox();
      expect(legenda).not.toBeNull();
      expect(pilula).not.toBeNull();
      expect((legenda?.y ?? 0) + (legenda?.height ?? 0)).toBeLessThanOrEqual(caixa?.y ?? 0);
      expect((legenda?.y ?? 0) + (legenda?.height ?? 0)).toBeLessThanOrEqual(pilula?.y ?? 0);
    }
    await semViolacoesNoFio(page);
  }
});

test('rolado, o Destino esmaece no alto, onde fica o "+", e não deixa o texto passar por baixo dele (desvio 36)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);
  await page.setViewportSize({ width: 360, height: 640 });
  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();
  const tela = page.locator('[data-tela="mapa"]');
  const mascara = () => tela.evaluate((el) => getComputedStyle(el).maskImage);

  // Em repouso o Destino é o do mockup: sem classe e sem máscara.
  await expect(tela).not.toHaveClass(/m-rolada/);
  expect(await mascara()).toBe('none');

  // Em 360 de largura a tela passa do quadro; rolada até o fim, o alto esmaece.
  expect(await tela.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await tela.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(tela).toHaveClass(/m-rolada/);
  expect(await tela.evaluate((el) => el.style.getPropertyValue('--m-rolado'))).toBe('1.00');
  expect(await mascara()).toContain('linear-gradient');
  // O "+" fica dentro da faixa do alto da tela que some por inteiro (até os 64 px).
  const mais = await page.locator('.m-mais').boundingBox();
  const caixaDaTela = await tela.boundingBox();
  expect(mais).not.toBeNull();
  expect(caixaDaTela).not.toBeNull();
  expect((mais?.y ?? 0) + (mais?.height ?? 0) - (caixaDaTela?.y ?? 0)).toBeLessThanOrEqual(64);

  // De volta ao topo, o repouso é o de antes.
  await tela.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(tela).not.toHaveClass(/m-rolada/);
  expect(await mascara()).toBe('none');
});

test('a ficha de um lugar abre dentro da tela, passa no axe e fecha com Escape devolvendo o foco', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);
  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();

  const lugar = page.getByRole('button', { name: /você está aqui: abrir a ficha/ });
  await lugar.click();
  const ficha = page.getByRole('region', { name: /^Ficha de / });
  await expect(ficha).toBeVisible();
  await expect(ficha).toBeFocused();
  await expect(ficha.getByText(/Rascunho da pesquisa/)).toBeVisible();

  // A ficha cabe inteira dentro da caixa do mapa.
  const dentro = await ficha.boundingBox();
  const fora = await mapa(page).boundingBox();
  expect(dentro).not.toBeNull();
  expect(fora).not.toBeNull();
  expect(dentro?.x ?? 0).toBeGreaterThanOrEqual((fora?.x ?? 0) - 1);
  expect((dentro?.x ?? 0) + (dentro?.width ?? 0)).toBeLessThanOrEqual(
    (fora?.x ?? 0) + (fora?.width ?? 0) + 1,
  );
  expect((dentro?.y ?? 0) + (dentro?.height ?? 0)).toBeLessThanOrEqual(
    (fora?.y ?? 0) + (fora?.height ?? 0) + 1,
  );
  await semViolacoesNoFio(page);

  await page.keyboard.press('Escape');
  await expect(ficha).toBeHidden();
  await expect(lugar).toBeFocused();

  // Tocar numa porteira fala em palavras (aviso com `role="status"`), sem abrir ficha.
  // O foco leva a câmera até a porteira (a caixa não rola); o Enter a toca.
  await page
    .getByRole('button', { name: /^Porteira de Execução Penal/ })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /porteira/i })).toBeVisible();
  await semViolacoesNoFio(page);
});

/** O que o mockup move no Destino, e com que duração, atraso e curva (`introDestino` e `tracarDestino`). */
interface MovimentoDoDestino {
  quem: string;
  tag: string;
  classes: string[];
  props: string;
  duracao: number;
  atraso?: number;
  easing: string;
}

const MOLA = 'cubic-bezier(.34,1.56,.64,1)';
const SAIR = 'cubic-bezier(.2,.7,.2,1)';
/** O tempo que a entrada segura o mapa (o `D0` do mockup). */
const D0 = 2350;

const MOVIMENTO_DO_DESTINO: MovimentoDoDestino[] = [
  {
    quem: 'a estrela da entrada aparece com a mola',
    tag: 'div',
    classes: ['fim-i'],
    props: 'offset,opacity,transform',
    duracao: 560,
    easing: MOLA,
  },
  {
    quem: 'o traço da estrela se desenha',
    tag: 'path',
    classes: [],
    props: 'strokeDashoffset',
    duracao: 700,
    atraso: 200,
    easing: 'cubic-bezier(.4,0,.2,1)',
  },
  {
    quem: '"Seu destino" se escreve letra por letra',
    tag: 'i',
    classes: [],
    props: 'opacity,transform',
    duracao: 360,
    atraso: 520,
    easing: SAIR,
  },
  {
    quem: 'a frase da entrada aparece',
    tag: 'span',
    classes: [],
    props: 'opacity',
    duracao: 500,
    atraso: 1100,
    easing: 'linear',
  },
  {
    quem: 'a estrela desce até o fim do caminho',
    tag: 'div',
    classes: ['destino-intro'],
    props: 'offset,opacity,transform',
    duracao: 760,
    atraso: D0 - 620,
    easing: 'cubic-bezier(.5,0,.75,0)',
  },
  {
    quem: 'o resto da tela sobe enquanto ela escreve',
    tag: 'span',
    classes: ['olho'],
    props: 'opacity,transform',
    duracao: 520,
    atraso: D0 - 150,
    easing: SAIR,
  },
  {
    quem: 'o mapa se revela de cima',
    tag: 'div',
    classes: ['destino', 'ne'],
    props: 'clipPath,offset,opacity',
    duracao: 2600,
    atraso: D0,
    easing: 'cubic-bezier(.3,.1,.3,1)',
  },
  {
    quem: 'o "você está aqui" pula',
    tag: 'div',
    classes: ['no-aqui'],
    props: 'opacity,transform',
    duracao: 600,
    atraso: 400 + D0,
    easing: MOLA,
  },
];

const mesmoMovimento = (visto: AnimacaoVista, m: MovimentoDoDestino) =>
  visto.tag === m.tag &&
  m.classes.every((c) => visto.classes.includes(c)) &&
  visto.props === m.props &&
  visto.duracao === m.duracao &&
  visto.atraso === (m.atraso ?? 0) &&
  visto.easing === m.easing;

test('com a LEP, a primeira visita tem a entrada do mockup, o número sobe, a câmera chega de longe e os artigos abrem o Leitor', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await registrarAnimacoes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await prepararAPrevia(page, true);

  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();

  // A entrada cobre o quadro (a estrela, "Seu destino" escrito e a frase), sem existir para o leitor de tela.
  const entrada = page.locator('#conteudo > .m-destino-intro');
  await expect(entrada).toBeAttached();
  await expect(entrada).toHaveAttribute('aria-hidden', 'true');
  await expect(entrada.locator('strong')).toHaveText('Seu destino');
  await expect(entrada.locator('span')).toHaveText('A aprovação na sua prova');
  // Enquanto ela segura o mapa, a câmera está no Nordeste todo; passada a entrada, ela se aproxima da pessoa.
  const longe = await escala(page);
  await expect(entrada).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(() => escala(page), { timeout: 15_000 }).toBeGreaterThan(longe * 1.4);
  await expect.poll(() => estaLonge(page)).toBe(false);

  // O número é o mesmo que o leitor de tela lê, e o texto diz de que matéria é.
  const final = (await page.locator('.m-numero .m-so-leitor').textContent())?.trim() ?? '';
  expect(final).toMatch(/^\d+(,\d)?%$/);
  await expect(page.locator('.m-numero [aria-hidden="true"]').first()).toHaveText(
    final.replace('%', ''),
  );
  await expect(page.getByText(/do que mais cai em Execução Penal já é seu/)).toBeVisible();

  // Cada movimento da entrada é o do mockup, com a mesma duração, o mesmo atraso e a mesma curva.
  const vistas = await animacoesVistas(page);
  const faltam = MOVIMENTO_DO_DESTINO.filter((m) => !vistas.some((v) => mesmoMovimento(v, m))).map(
    (m) =>
      `${m.quem}: ${m.tag}.${m.classes.join('.')} ${m.props} ${String(m.duracao)} ms +${String(m.atraso ?? 0)} ${m.easing}`,
  );
  expect(faltam).toEqual([]);

  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // O ponto é um link para o Leitor, no artigo.
  const ponto = page.getByRole('link', { name: /abrir no Leitor$/ }).first();
  await expect(ponto).toBeAttached();
  await ponto.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/biblioteca\/normas\/.+foco=artigo/);
});

test('a entrada só roda na primeira visita ao aparelho: a segunda abre o Destino direto', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await prepararAPrevia(page, false);
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_DA_VISITA)).toBeNull();

  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(page.locator('#conteudo > .m-destino-intro')).toBeAttached();
  await expect(page.locator('#conteudo > .m-destino-intro')).toHaveCount(0, { timeout: 10_000 });
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_DA_VISITA)).toBe('1');

  await nav(page).getByRole('button', { name: 'Agora' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();
  await expect(page.locator('.m-destino-intro')).toHaveCount(0);
});

test('depois da primeira visita o fio voa de uma aba à outra e não deixa fio nem fantasma no quadro', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript((chave) => {
    localStorage.setItem(chave, '1');
  }, CHAVE_DA_VISITA);
  await prepararAPrevia(page, false);
  await page.evaluate(() => {
    const w = window as unknown as { __voos: number };
    w.__voos = 0;
    new MutationObserver((registros) => {
      for (const r of registros) {
        for (const n of r.addedNodes) {
          if (n instanceof Element && n.classList.contains('m-voo-fio')) w.__voos += 1;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  const voos = () => page.evaluate(() => (window as unknown as { __voos: number }).__voos);

  await nav(page).getByRole('button', { name: 'Destino' }).click();
  await expect(mapa(page)).toBeVisible();
  // O fio pendurado do Agora vai até o tracejado do mapa: um voo, que acaba sozinho.
  await expect.poll(voos).toBe(1);
  await expect(page.locator('.m-voo-fio')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator('.m-saindo')).toHaveCount(0);
  await expect(page.locator('.m-tela')).toHaveCount(1);
  // O tracejado e o caminho andado do mapa voltam a aparecer depois que o fio pousa.
  await expect(page.locator('#m-destino .m-tracejado').first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('#m-destino .m-tracejado')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .not.toBe('0');

  // E de volta: o tracejado do mapa vai até o fio pendurado do Agora.
  await nav(page).getByRole('button', { name: 'Agora' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect.poll(voos).toBe(2);
  await expect(page.locator('.m-voo-fio')).toHaveCount(0, { timeout: 5_000 });
  // O fio pendurado é uma reta sem largura (a caixa dele é vazia para o Playwright): confere pelo que o navegador pinta.
  const pendurado = page.locator('.m-puxar-area .m-fio-pendurado');
  await expect(pendurado).toBeAttached();
  await expect.poll(() => pendurado.evaluate((el) => getComputedStyle(el).opacity)).not.toBe('0');
  await semViolacoesNoFio(page);
});

for (const [esquema, mundo] of [
  ['dark', 'de noite'],
  ['light', 'de dia'],
] as const) {
  test(`o fio que voa leva a faixa amarela do neon e não a ciana (desvio 20), ${mundo}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: esquema });
    await page.addInitScript((chave) => {
      localStorage.setItem(chave, '1');
    }, CHAVE_DA_VISITA);
    await prepararAPrevia(page, false);
    await page.evaluate(() => {
      const w = window as unknown as { __faixa?: { cor: string; largura: string } };
      new MutationObserver((registros) => {
        for (const r of registros) {
          for (const n of r.addedNodes) {
            if (!(n instanceof Element) || !n.classList.contains('m-voo-fio')) continue;
            const faixa = n.querySelector('.m-b');
            if (!faixa) continue;
            const estilo = getComputedStyle(faixa);
            w.__faixa = { cor: estilo.stroke, largura: estilo.strokeWidth };
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    await nav(page).getByRole('button', { name: 'Destino' }).click();
    // `--m-ponto` (#ffc53d) e a largura 10 do desvio 20; o ciano (#39caef) era o do mockup à noite.
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __faixa?: unknown }).__faixa ?? null))
      .toEqual({ cor: 'rgb(255, 197, 61)', largura: '10px' });
  });
}
