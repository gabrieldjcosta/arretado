import type { Locator, Page } from '@playwright/test';
import {
  abrirTodasAsNormas,
  expect,
  importarEPublicar,
  rolagemAssentada,
  semViolacoes,
  test,
} from './apoio';

/** Rola a janela, quase uma tela por vez, até o alvo aparecer (a lista é virtualizada: ele não existe antes). */
async function rolarAte(page: Page, alvo: Locator, tentativas = 200) {
  for (let i = 0; i < tentativas; i++) {
    if (await alvo.first().isVisible()) return;
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.9);
    });
    await page.waitForTimeout(60);
  }
  await expect(alvo.first()).toBeVisible();
}

/** Vai ao fim da lei; a altura total é estimada e se corrige ao medir, então repete até o alvo aparecer. */
async function irAoFim(page: Page, alvo: Locator, tentativas = 30) {
  for (let i = 0; i < tentativas; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(100);
    if (await alvo.first().isVisible()) return;
  }
  await expect(alvo.first()).toBeVisible();
}

const linhasNaTela = (page: Page) => page.locator('.dispositivo');

/** O ⋯ do modo foco: a única coisa à vista além do texto. */
const maisDoFoco = (page: Page) => page.getByRole('button', { name: 'Mais ações do foco' });

/** O "⋯" do grupo fixo, em toda largura (D-D24), onde moram Filtrar e Ações fora do modo foco. */
const maisDoLeitor = (page: Page) => page.getByRole('button', { name: /^Mais(\.|$)/ });

/** O "Aa" da barra do Leitor (no começo da norma, fora do modo foco), que abre a folha dos ajustes de leitura. */
const aaDosAjustes = (page: Page) => page.getByRole('button', { name: 'Aa, ajustes de leitura' });

/** A folha dos ajustes de leitura: tamanho do texto, destaques e foco na frase. */
const folhaDosAjustes = (page: Page) => page.getByRole('dialog', { name: 'Ajustes de leitura' });

/** A caixa dos destaques, na folha dos ajustes. */
const caixaDosDestaques = (page: Page) =>
  folhaDosAjustes(page).getByRole('checkbox', { name: /^Destacar prazos/ });

/** Abre a folha dos ajustes pelo "Aa" da barra (o Playwright rola até ele: só serve no começo da norma). */
async function abrirAjustesPeloAa(page: Page) {
  await aaDosAjustes(page).click();
  await expect(folhaDosAjustes(page)).toBeVisible();
  return folhaDosAjustes(page);
}

/** Abre a folha dos ajustes sem mexer na rolagem: pelo "⋯" do grupo fixo ou, no modo foco, pela bandeja. */
async function abrirAjustesPeloMais(page: Page, toque = false) {
  // Logo depois de recarregar, o "⋯" ainda não está na tela, e `naBandejaDoFoco` olha uma vez só, sem esperar.
  await expect
    .poll(
      async () => (await maisDoFoco(page).isVisible()) || (await maisDoLeitor(page).isVisible()),
    )
    .toBe(true);
  const item = await naBandejaDoFoco(page, /^Ajustes de leitura/);
  await (toque ? item.tap() : item.click());
  await expect(folhaDosAjustes(page)).toBeVisible();
  return folhaDosAjustes(page);
}

/** O cabeçalho da casca do Fio: grudado no alto fora do modo foco; no modo foco, some com o resto da moldura. */
const cabecalhoDaCasca = (page: Page) => page.locator('.fio-topo');

/** A pílula dos lugares: dentro de uma norma não aparece, em largura nenhuma (D-D25: o Leitor abre sem barra de abas). */
const pilulaDosLugares = (page: Page) => page.getByRole('navigation', { name: 'Lugares' });

/**
 * Sai da norma para a Biblioteca sem mexer na rolagem (sair grava a posição): o "voltar" do aparelho. O "Voltar"
 * do Leitor mora no começo da norma, e rolar até ele mudaria a posição que o teste confere.
 */
async function sairParaABiblioteca(page: Page) {
  await page.goBack();
}

/**
 * Um controle da bandeja do foco; abre a bandeja (o ⋯) se ele ainda não está à vista. Fora do modo foco,
 * Filtrar e Ações moram no "⋯" do grupo fixo, que abre no lugar da bandeja.
 */
async function naBandejaDoFoco(page: Page, nome: string | RegExp) {
  const botao = page.getByRole('button', { name: nome, exact: typeof nome === 'string' });
  if (!(await botao.isVisible())) {
    if (await maisDoFoco(page).isVisible()) await maisDoFoco(page).click();
    else if (await maisDoLeitor(page).isVisible()) await maisDoLeitor(page).click();
  }
  return botao;
}

async function sairDoFocoPelaBandeja(page: Page, toque = false) {
  const botao = await naBandejaDoFoco(page, 'Sair do foco');
  await (toque ? botao.tap() : botao.click());
}

/**
 * Entra no modo foco com a lente do texto corrido: a primeira entrada abre o cartão, e "Texto
 * corrido" na bandeja grava a lente para as seguintes.
 */
async function fixarLenteCorrida(page: Page, toque = false) {
  await entrarNoFocoCorrido(page, toque);
  await sairDoFocoPelaBandeja(page, toque);
  await expect(page.getByRole('button', { name: 'Modo foco' })).toBeVisible();
}

async function entrarNoFocoCorrido(page: Page, toque = false) {
  const entrar = page.getByRole('button', { name: 'Modo foco' });
  await (toque ? entrar.tap() : entrar.click());
  await expect(maisDoFoco(page)).toBeVisible();
  if (/[?&]foco=artigo/.test(page.url())) {
    const corrido = await naBandejaDoFoco(page, 'Texto corrido');
    await (toque ? corrido.tap() : corrido.click());
  }
  await expect(page).toHaveURL(/[?&]foco=texto/);
}

/** Mede da toque no link até o primeiro texto de dispositivo estar na página (não do polling do teste). */
async function abrirMedindo(page: Page, link: Locator) {
  await page.evaluate(() => {
    const w = window as unknown as { __abertura: Promise<number> };
    w.__abertura = new Promise<number>((resolver) => {
      document.addEventListener(
        'click',
        () => {
          const inicio = performance.now();
          const observador = new MutationObserver(() => {
            const texto = document.querySelector('.dispositivo .texto-dispositivo');
            if (texto && !texto.querySelector('.texto-carregando')) {
              observador.disconnect();
              resolver(performance.now() - inicio);
            }
          });
          observador.observe(document.body, { childList: true, subtree: true });
        },
        { capture: true, once: true },
      );
    });
  });
  await link.click();
  return page.evaluate(() => (window as unknown as { __abertura: Promise<number> }).__abertura);
}

test('ler a LEP compilada: abre em menos de 1 s, virtualizada, com cabeçalhos, recuo e notas (9.6)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');

  const abertura = await abrirMedindo(
    page,
    page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }),
  );
  test.info().annotations.push({ type: 'abertura', description: `${abertura.toFixed(0)} ms` });
  expect(abertura, 'abertura da primeira janela, em ms').toBeLessThan(1000);

  await expect(page).toHaveURL(/#\/biblioteca\/normas\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  // Cabeçalhos aninhados: título (2) > artigo (3); capítulo (3) > artigo (4).
  const titulo = page.getByRole('heading', { level: 2, name: /TÍTULO I\b/ });
  await expect(titulo).toContainText('Do Objeto e da Aplicação da Lei de Execução Penal');
  await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
  await expect(page.getByText('A execução penal tem por objetivo efetivar')).toBeVisible();
  await rolarAte(page, page.getByRole('heading', { level: 3, name: /CAPÍTULO I\b/ }).first());
  await expect(page.getByRole('heading', { level: 4, name: 'Art. 5º' })).toBeVisible();

  // Só o visível está no DOM, não os 871 dispositivos.
  expect(await linhasNaTela(page).count()).toBeLessThan(80);

  // Recuo por nível: o artigo à esquerda, o parágrafo e o inciso recuados.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const recuoDe = (endereco: string) =>
    page
      .locator(`[data-endereco="${endereco}"]`)
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingInlineStart));
  await expect(page.locator('[data-endereco="art2.parUnico"]')).toBeVisible();
  // O artigo fica só na folga da faixa do lido (12 px de cada lado, P4); o parágrafo recua além dela.
  const folga = await recuoDe('art2');
  expect(folga).toBeLessThanOrEqual(12);
  expect(await recuoDe('art2.parUnico')).toBeGreaterThan(folga);

  // Nota de vigência atenuada, fora do texto (Art. 6º: "Redação dada pela Lei nº 10.792").
  await rolarAte(page, page.locator('[data-endereco="art6"]'));
  const notas = page
    .locator('[data-endereco="art6"]')
    .getByRole('list', { name: 'Notas de vigência' });
  await expect(notas).toContainText('Redação dada pela Lei');
  const cores = await page.locator('[data-endereco="art6"]').evaluate((el) => ({
    texto: getComputedStyle(el.querySelector('.texto-dispositivo') ?? el).color,
    nota: getComputedStyle(el.querySelector('.notas-vigencia') ?? el).color,
  }));
  expect(cores.nota).not.toBe(cores.texto);
  await semViolacoes(page);

  // Até o fim da lei e de volta: os textos chegam, e a lista continua enxuta.
  await irAoFim(page, page.locator('[data-endereco="art204"]'));
  await expect(page.locator('[data-endereco="art204"]')).toContainText(
    'Esta Lei entra em vigor concomitantemente',
  );
  await expect(page.locator('.texto-carregando')).toHaveCount(0);
  expect(await linhasNaTela(page).count()).toBeLessThan(80);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
});

test('o ajuste de tamanho é global: muda o texto da norma e continua depois de recarregar (9.6)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();

  const artigo = page.locator('[data-endereco="art1"]');
  const tamanho = () => artigo.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  await expect(artigo).toBeVisible();
  expect(await tamanho()).toBe(18);
  const alturaAntes = (await artigo.boundingBox())?.height ?? 0;

  // O tamanho mora na folha dos ajustes de leitura, que o "Aa" da barra abre; vale na hora, com a lei atrás.
  const folha = await abrirAjustesPeloAa(page);
  await folha.getByRole('button', { name: /aumentar o texto/ }).click();
  await expect(folha.getByLabel('Tamanho atual do texto')).toHaveText('20 px');
  await expect.poll(tamanho).toBe(20);
  expect((await artigo.boundingBox())?.height ?? 0).toBeGreaterThan(alturaAntes);
  await folha.getByRole('button', { name: 'Fechar' }).click();
  await expect(folha).toBeHidden();

  await page.reload();
  await expect(artigo).toBeVisible();
  await expect.poll(tamanho).toBe(20);
  // O mesmo valor de Conta › Aparência.
  await page.goto('/#/conta/aparencia');
  await expect(page.getByText('Tamanho do texto de leitura: 20 px')).toBeVisible();
});

test('ler o ECA com todas as redações: revogado e vetado em uma linha, redação anterior oculta, com indicador (8.6, 8.10)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'eca', 'ECA');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /ECA/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ECA' })).toBeVisible();

  // VETADO (8.10): o parágrafo único do art. 89-A numa linha atenuada, sem o "(VETADO)" no texto;
  // a nota da inclusão ao expandir.
  const vetado = page.locator('[data-endereco="art89A.parUnico"]');
  await rolarAte(page, vetado);
  await expect(vetado).toHaveClass(/\bvetado\b/);
  const linhaVetada = vetado.getByRole('button', { name: /Parágrafo único — \(vetado\)/ });
  await expect(linhaVetada).toHaveAttribute('aria-expanded', 'false');
  await expect(vetado.getByText(/VETADO/)).toHaveCount(0);
  await semViolacoes(page);
  await linhaVetada.click();
  await expect(vetado.getByRole('list', { name: 'Notas de vigência' })).toContainText(
    'Incluído pela Lei nº 15.426',
  );
  await expect(vetado.getByText(/VETADO/)).toHaveCount(0);
  await semViolacoes(page);
  await linhaVetada.click();

  // Redação anterior por tachado (regra 8): o inciso IV do art. 90 ("I ~~V - abrigo;~~").
  const inciso = page.locator('[data-endereco="art90.incIV"]');
  await rolarAte(page, inciso);
  const indicador = inciso.getByRole('button', {
    name: 'Mostrar 1 redação anterior (texto anterior, oculto)',
  });
  await expect(indicador).toHaveAttribute('aria-expanded', 'false');
  await expect(inciso.getByText('abrigo;')).toHaveCount(0);
  await indicador.click();
  await expect(inciso.getByRole('list', { name: 'Texto anterior' })).toContainText('V - abrigo;');
  await semViolacoes(page);
  await inciso.getByRole('button', { name: 'Ocultar 1 redação anterior' }).click();

  // Revogação total (regra 9): o art. 233, todo tachado, numa linha só; o resto ao expandir.
  const artigo = page.locator('[data-endereco="art233"]');
  await rolarAte(page, artigo);
  const revogado = artigo.getByRole('button', { name: /Art\. 233 — \(revogado\)/ });
  await expect(revogado).toHaveAttribute('aria-expanded', 'false');
  await expect(artigo.getByText(/vigilância a tortura/)).toHaveCount(0);
  await semViolacoes(page);
  await revogado.click();
  await expect(artigo.getByRole('list', { name: 'Texto anterior' })).toContainText(
    'vigilância a tortura',
  );
  await expect(artigo.getByRole('list', { name: 'Notas de vigência' })).toContainText(
    'Revogado pela Lei nº 9.455',
  );
  await semViolacoes(page);
  await revogado.click();
  await expect(artigo.getByText(/vigilância a tortura/)).toHaveCount(0);

  // A duplicata do parágrafo único do art. 263 continua heurística, a confirmar.
  const paragrafo = page.locator('[data-endereco="art263.parUnico"]');
  await irAoFim(page, paragrafo);
  await paragrafo.getByRole('button', { name: /^Mostrar \d+ redaç/ }).click();
  await expect(paragrafo.getByRole('list', { name: 'Texto anterior' })).toContainText(
    '(a confirmar)',
  );
});

test('ler a LEP com todas as redações: 100% das redações anteriores ocultas, cada uma num indicador, e os vetados atenuados (8.6, 8.10)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await semViolacoes(page);

  // Do começo ao fim da lei: cada dispositivo com redação anterior mostra só o indicador, e nenhum
  // texto anterior aparece sem o toque.
  const indicadores = new Map<string, number>();
  const revogados = new Set<string>();
  const vetados = new Set<string>();
  let noFim = 0;
  for (let passo = 0; passo < 400 && noFim < 3; passo++) {
    const vistos = await page.evaluate(() => {
      const linhas = [...document.querySelectorAll<HTMLElement>('[data-endereco]')];
      return {
        abertos: document.querySelectorAll('[aria-label="Texto anterior"]').length,
        indicadores: linhas.flatMap((l) => {
          const rotulo = l
            .querySelector('button[aria-label^="Mostrar "]')
            ?.getAttribute('aria-label');
          const n = rotulo ? /^Mostrar (\d+) redaç/.exec(rotulo)?.[1] : undefined;
          return n ? [[l.dataset.endereco ?? '', Number(n)] as const] : [];
        }),
        revogados: linhas
          .filter((l) => l.classList.contains('revogado'))
          .map((l) => l.dataset.endereco ?? ''),
        vetados: linhas
          .filter((l) => l.classList.contains('vetado'))
          .map((l) => l.dataset.endereco ?? ''),
        fim: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      };
    });
    expect(vistos.abertos).toBe(0);
    for (const [endereco, n] of vistos.indicadores) indicadores.set(endereco, n);
    for (const endereco of vistos.revogados) revogados.add(endereco);
    for (const endereco of vistos.vetados) vetados.add(endereco);
    noFim = vistos.fim ? noFim + 1 : 0;
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.9);
    });
    await page.waitForTimeout(60);
  }
  // 86 redações anteriores: 71 em 60 dispositivos vigentes, 15 nos 15 revogados (cada um guarda a
  // sua na linha fechada; o art. 182, "Art. 182. ~~…~~ (Revogado…)", entre eles).
  expect(indicadores.size).toBe(60);
  expect([...indicadores.values()].reduce((a, b) => a + b, 0)).toBe(71);
  expect(revogados.size).toBe(15);
  expect(revogados.has('art182')).toBe(true);
  // Os 17 vetados do gabarito, cada um numa linha atenuada (8.10).
  expect(vetados.size).toBe(17);
});

test('ler o CP compilado: a rubrica fica acima do artigo (9.6)', async ({ page }) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'cp-compilado', 'CP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /CP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'CP' })).toBeVisible();

  const artigo = page.locator('[data-endereco="art121"]');
  await rolarAte(page, artigo);
  const rubrica = artigo.getByText('Homicídio simples', { exact: true });
  await expect(rubrica).toBeVisible();
  const caixaRubrica = await rubrica.boundingBox();
  const caixaRotulo = await artigo.getByRole('heading', { name: 'Art. 121' }).boundingBox();
  expect(caixaRubrica?.y ?? Infinity).toBeLessThan(caixaRotulo?.y ?? 0);
  await semViolacoes(page);
});

/** Da linha do dispositivo até o fim da barra fixa (`.fio-topo`): 0 quando ele está no alto da tela. */
function distanciaDoAlto(alvo: Locator) {
  return alvo.first().evaluate((el) => {
    const linha = el.closest('.linha-leitor') ?? el;
    const barra = document.querySelector('.fio-topo')?.getBoundingClientRect().bottom ?? 0;
    return linha.getBoundingClientRect().top - barra;
  });
}

/** Rola até o dispositivo ficar logo abaixo da barra fixa (repete: os textos chegam e remedem). */
async function alinharNoAlto(page: Page, alvo: Locator) {
  for (let i = 0; i < 20; i++) {
    const distancia = await distanciaDoAlto(alvo);
    if (Math.abs(distancia) < 1) return;
    await page.evaluate((dy) => {
      window.scrollBy(0, dy);
    }, distancia);
    await page.waitForTimeout(150);
  }
  expect(Math.abs(await distanciaDoAlto(alvo))).toBeLessThan(1);
}

/**
 * Toca no link e mede até a lista do leitor aparecer no lugar (sem a classe `voltando`). O leitor
 * desiste de voltar em 2 s: passar disso é não ter chegado à posição guardada.
 */
async function voltarMedindo(page: Page, link: Locator) {
  await page.evaluate(() => {
    const w = window as unknown as { __volta: Promise<number> };
    w.__volta = new Promise<number>((resolver) => {
      document.addEventListener(
        'click',
        () => {
          const inicio = performance.now();
          const conferir = () => {
            const lista = document.querySelector('.lista-leitor');
            if (lista && !lista.classList.contains('voltando')) {
              resolver(performance.now() - inicio);
              return;
            }
            requestAnimationFrame(conferir);
          };
          requestAnimationFrame(conferir);
        },
        { capture: true, once: true },
      );
    });
  });
  await link.click();
  return page.evaluate(() => (window as unknown as { __volta: Promise<number> }).__volta);
}

/** A leitura gravada no IndexedDB, com o endereço da posição e do "lido até". */
function leituraGravada(page: Page) {
  return page.evaluate(async () => {
    const pedir = <T>(pedido: IDBRequest<T>) =>
      new Promise<T>((resolver, rejeitar) => {
        pedido.onsuccess = () => {
          resolver(pedido.result);
        };
        pedido.onerror = () => {
          rejeitar(new Error(String(pedido.error)));
        };
      });
    const banco = await pedir(indexedDB.open('arretado'));
    try {
      const ler = async <T>(colecao: string, id?: string) =>
        (await pedir(
          id === undefined
            ? banco.transaction(colecao).objectStore(colecao).getAll()
            : banco.transaction(colecao).objectStore(colecao).get(id),
        )) as T;
      const leituras = await ler<{ posicaoId?: string; lidoAteId?: string }[]>('leituras');
      const endereco = async (id?: string) =>
        id === undefined
          ? undefined
          : (await ler<{ endereco: string }>('dispositivos', id)).endereco;
      return {
        quantas: leituras.length,
        posicao: await endereco(leituras[0]?.posicaoId),
        lidoAte: await endereco(leituras[0]?.lidoAteId),
      };
    } finally {
      banco.close();
    }
  });
}

test('sair e voltar na mesma posição, com "Retomar" e "lido até": LEP compilada (9.7)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  const normas = page.getByRole('region', { name: 'Normas' });
  const continuar = page.getByRole('link', { name: /^Retomar: LEP/ });
  await expect(continuar).toHaveCount(0);
  await normas.getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();

  // Sai pelo "voltar" do aparelho com o art. 41 no alto da tela.
  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  await sairParaABiblioteca(page);
  await expect(continuar).toBeVisible();
  await abrirTodasAsNormas(page);
  await expect(normas.getByRole('link', { name: /LEP/ })).toContainText('Última leitura:');
  expect(await leituraGravada(page)).toEqual({ quantas: 1, posicao: 'art41', lidoAte: undefined });
  await semViolacoes(page);

  // "Retomar" abre no art. 41, logo abaixo da barra fixa.
  const volta = await voltarMedindo(page, continuar);
  test.info().annotations.push({ type: 'volta', description: `${volta.toFixed(0)} ms` });
  expect(volta, 'do toque à lista no lugar, em ms').toBeLessThan(1500);
  await expect(art41).toContainText('Constituem direitos do preso');
  await expect.poll(() => distanciaDoAlto(art41)).toBeLessThan(2);
  expect(await distanciaDoAlto(art41)).toBeGreaterThan(-2);
  await expect(page.locator('.lista-leitor')).not.toHaveClass(/voltando/);
  await semViolacoes(page);

  // Voltar e avançar no histórico do navegador também volta ao art. 41.
  await page.goBack();
  await expect(continuar).toBeVisible();
  await page.goForward();
  await expect(art41).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art41))).toBeLessThan(2);

  // Parar de rolar grava a posição; recarregar a página volta a ela.
  const art105 = page.locator('[data-endereco="art105"]');
  await rolarAte(page, art105);
  await alinharNoAlto(page, art105);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art105');
  await page.reload();
  await expect(art105).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);

  // "Lido até aqui" marca o dispositivo no alto da tela; rolar não o move.
  await page.getByRole('button', { name: 'Lido até aqui' }).click();
  const linha105 = page.locator('.linha-leitor').filter({ has: art105 });
  await expect(linha105.locator('.marca-lido-ate')).toHaveText('Lido até aqui');
  await expect.poll(async () => (await leituraGravada(page)).lidoAte).toBe('art105');
  const art150 = page.locator('[data-endereco="art150"]');
  await rolarAte(page, art150);
  await alinharNoAlto(page, art150);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art150');
  expect(await leituraGravada(page)).toEqual({ quantas: 1, posicao: 'art150', lidoAte: 'art105' });

  // No começo da norma, "Ir ao lido até" leva de volta ao art. 105.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(page.locator('.lido-ate')).toContainText('Lido até Art. 105');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Ir ao lido até' }).click();
  await expect(art105).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  await expect(linha105.locator('.marca-lido-ate')).toBeVisible();
});

test('mudar o tamanho do texto fora da norma não perde a posição, e a procedência da versão fica à vista: LEP compilada (13.5)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  const normas = page.getByRole('region', { name: 'Normas' });
  await expect(normas.getByRole('link', { name: /LEP/ })).toContainText(
    /Coletada em \d{2}\/\d{2}\/\d{4}/,
  );
  await normas.getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.locator('.procedencia')).toContainText(/Coletada em \d{2}\/\d{2}\/\d{4}/);

  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  await sairParaABiblioteca(page);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art41');

  // O tamanho muda em Conta › Aparência (a barra do leitor não acompanha a rolagem).
  await page.goto('/#/conta/aparencia');
  await expect(page.getByText(/Tamanho do texto de leitura: 18 px/)).toBeVisible();
  await page.getByLabel(/Tamanho do texto de leitura/).fill('20');
  await expect(page.getByText(/Tamanho do texto de leitura: 20 px/)).toBeVisible();

  await page.goto('/#/biblioteca');
  await page.getByRole('link', { name: /^Retomar: LEP/ }).click();
  await expect(art41).toContainText('Constituem direitos do preso', { timeout: 20_000 });
  await expect
    .poll(async () => Math.abs(await distanciaDoAlto(art41)), { timeout: 15_000 })
    .toBeLessThan(2);
  expect(await art41.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))).toBe(20);
  await semViolacoes(page);

  // Recarregar a página volta ao mesmo dispositivo.
  await page.reload();
  await expect(art41).toContainText('Constituem direitos do preso', { timeout: 20_000 });
  await expect
    .poll(async () => Math.abs(await distanciaDoAlto(art41)), { timeout: 15_000 })
    .toBeLessThan(2);
});

test('destaque automático: abre ligado, com prazos, condições, termos absolutos e penas na LEP compilada; desligar vale depois de recarregar (9.8, D-D17)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();

  // Ligado por padrão (D-D17): a legenda e os trechos acesos já estão na tela, sem tocar em nada, e a caixa
  // dos destaques, na folha dos ajustes de leitura, abre marcada.
  await abrirAjustesPeloAa(page);
  await expect(caixaDosDestaques(page)).toBeChecked();
  await folhaDosAjustes(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(folhaDosAjustes(page)).toBeHidden();
  await expect(page.locator('[data-endereco="art3.parUnico"]')).toContainText('qualquer distinção');
  await expect(page.getByRole('list', { name: 'Legenda dos destaques' })).toBeVisible();

  /** O trecho aceso de cada categoria e o traço dele (o destaque não depende só da cor). */
  const aceso = (endereco: string, categoria: string) =>
    page.locator(`[data-endereco="${endereco}"] .destaque-${categoria}`).first();
  const traco = (alvo: ReturnType<typeof aceso>) =>
    alvo.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return { linha: estilo.textDecorationLine, estilo: estilo.textDecorationStyle };
    });
  const absoluto = aceso('art3.parUnico', 'absoluto');
  await expect(absoluto).toHaveText('qualquer');
  expect(await traco(absoluto)).toEqual({ linha: 'underline', estilo: 'wavy' });
  // Sem fundo: o fundo é dos grifos (11.4).
  expect(await absoluto.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  );
  await semViolacoes(page);

  const condicao = aceso('art14.par2', 'condicao');
  await rolarAte(page, condicao);
  await expect(condicao).toHaveText('mediante autorização');
  expect(await traco(condicao)).toEqual({ linha: 'underline', estilo: 'dashed' });

  const prazo = aceso('art25.incII', 'prazo');
  await rolarAte(page, prazo);
  await expect(prazo).toHaveText('prazo de dois meses');
  expect(await traco(prazo)).toEqual({ linha: 'underline', estilo: 'double' });

  const pena = aceso('art112.incIV', 'pena');
  await rolarAte(page, pena);
  await expect(pena).toHaveText('30% (trinta por cento)');
  expect(await traco(pena)).toEqual({ linha: 'underline', estilo: 'dotted' });
  await semViolacoes(page);

  // Desligar vale depois de recarregar (grava `false`, que vence o padrão) e aparece em Conta ›
  // Aparência; ligar de lá volta o destaque ao leitor.
  // No meio da norma a barra do alto ficou para trás: a folha abre pelo "⋯", sem tirar a pessoa do lugar.
  await abrirAjustesPeloMais(page);
  await caixaDosDestaques(page).uncheck();
  await expect(page.locator('.destaque')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Legenda dos destaques' })).toBeHidden();
  await page.reload();
  await abrirAjustesPeloMais(page);
  await expect(caixaDosDestaques(page)).not.toBeChecked();
  await expect(page.locator('.destaque')).toHaveCount(0);
  await page.goto('/#/conta/aparencia');
  const caixa = page.getByRole('checkbox', {
    name: 'Destacar prazos, condições, termos absolutos e penas',
  });
  await expect(caixa).not.toBeChecked();
  await semViolacoes(page);
  await caixa.check();
  await page.goBack();
  await expect(page.locator('.destaque').first()).toBeVisible();
  await abrirAjustesPeloMais(page);
  await expect(caixaDosDestaques(page)).toBeChecked();
});

test('régua de leitura: desligada não realça; ligada em Conta realça a linha sob o ponteiro sem mover o texto, com axe nos dois temas e a Biblioteca com o "Retomar": LEP compilada (fatia 4)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const art3 = page.locator('[data-endereco="art3.parUnico"]');
  await expect(art3).toContainText('qualquer distinção');
  await art3.hover();
  await expect(page.locator('[data-regua]')).toHaveCount(0);

  await page.goto('/#/conta/aparencia');
  await page.getByRole('checkbox', { name: 'Régua de leitura' }).check();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(art3).toContainText('qualquer distinção');
  await art3.scrollIntoViewIfNeeded();
  const antes = await art3.boundingBox();
  await art3.hover();
  const linha = page.locator('.linha-leitor[data-regua]');
  await expect(linha).toHaveCount(1);
  await expect(linha.locator('[data-endereco="art3.parUnico"]')).toHaveCount(1);
  // O realce não move o texto, nem muda a medida da linha.
  expect(await art3.boundingBox()).toEqual(antes);
  await semViolacoes(page);

  // Põe o art. 3º perto do alto, para a posição guardada ser de um artigo em qualquer aparelho.
  await art3.evaluate((el) => {
    window.scrollBy(0, el.getBoundingClientRect().top - 140);
  });
  await page.waitForTimeout(1200);
  // Sair grava a posição; a Biblioteca diz onde continuar e quanto falta, no mesmo botão de sempre.
  await sairParaABiblioteca(page);
  // R2: uma linha "Retomar", não a folha do Agora.
  const retomar = page.getByRole('link', { name: /^Retomar: LEP, / });
  await expect(retomar).toBeVisible();
  await expect(page.getByRole('region', { name: 'Agora' })).toHaveCount(0);
  await expect(retomar.locator('xpath=..')).toContainText(/cerca de \d+ min/);
  await semViolacoes(page);
});

/** O dispositivo da linha no alto da tela (logo abaixo da barra fixa) e quanto dela ficou acima. */
function linhaDoAlto(page: Page) {
  return page.evaluate(() => {
    const barra = document.querySelector('.fio-topo')?.getBoundingClientRect().bottom ?? 0;
    const linhas = [...document.querySelectorAll('.linha-leitor')];
    const linha = linhas.find((l) => {
      const { top, bottom } = l.getBoundingClientRect();
      return top <= barra + 8 && bottom > barra + 8;
    });
    if (!linha) return undefined;
    return {
      endereco: linha.querySelector('[data-endereco]')?.getAttribute('data-endereco'),
      acima: Math.round(barra - linha.getBoundingClientRect().top),
    };
  });
}

/** A mesma linha no alto, com a mesma parte dela acima da barra (1 px de tolerância). */
async function mesmaLinha(page: Page, antes: Awaited<ReturnType<typeof linhaDoAlto>>) {
  const agora = await linhaDoAlto(page);
  return (
    agora !== undefined &&
    antes !== undefined &&
    agora.endereco === antes.endereco &&
    Math.abs(agora.acima - antes.acima) <= 1
  );
}

/** O grupo fixo do canto: no modo foco, semitransparente (fundo com alfa abaixo de 1). */
function fundoDoBotao(botao: Locator) {
  return botao.evaluate((el) => {
    const fundo = getComputedStyle(el).backgroundColor;
    const alfa = /rgba?\([^)]*[,/]\s*([\d.]+)\)/.exec(fundo)?.[1];
    return {
      posicao: getComputedStyle(el.closest('.acoes-leitor') ?? el).position,
      alfa: Number(alfa ?? 1),
    };
  });
}

test('modo foco: só o texto, botão fixo semitransparente, atalho F/Esc, "voltar" sai, e o mesmo dispositivo no alto ao entrar e sair: LEP compilada (11.1)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const entrar = page.getByRole('button', { name: 'Modo foco' });
  const sair = maisDoFoco(page);
  const casca = cabecalhoDaCasca(page);
  const aa = aaDosAjustes(page);

  // A página nunca é mais larga que a tela: no tablet, a barra de cima transbordava com a fonte do
  // Linux, e a página larga desalinhava os botões fixos (o clique caía no texto).
  const sobra = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  expect(await sobra()).toBe(0);

  // No começo da norma, entrar e sair volta ao começo da página, com a barra do leitor à vista.
  await entrarNoFocoCorrido(page);
  await expect(sair).toBeVisible();
  await sairDoFocoPelaBandeja(page);
  await expect(entrar).toBeVisible();
  await expect(aa).toBeInViewport();
  expect(await rolagemAssentada(page)).toBe(0);

  // Entra com o art. 41 no alto: a moldura e a barra do leitor somem, o art. 41 continua no alto.
  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  await entrarNoFocoCorrido(page);
  await expect(sair).toBeVisible();
  await expect(sair).toBeFocused();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect(casca).toBeHidden();
  await expect(pilulaDosLugares(page)).toHaveCount(0);
  await expect(aa).toBeHidden();
  // O título continua como cabeçalho da página, só para o leitor de tela.
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toHaveClass(
    'visualmente-oculto',
  );
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art41))).toBeLessThan(2);
  expect(await sobra()).toBe(0);
  // Fixo e semitransparente, com o resto dos controles na bandeja; com o mouse fora dele (em
  // cima, ele fica opaco).
  await page.mouse.move(5, 300);
  expect(await fundoDoBotao(sair)).toEqual({ posicao: 'fixed', alfa: 0.9 });
  await expect(page.getByRole('button', { name: 'Lido até aqui' })).toBeHidden();
  // O botão acompanha a rolagem.
  const art60 = page.locator('[data-endereco="art60"]');
  await rolarAte(page, art60);
  await expect(sair).toBeInViewport();
  await semViolacoes(page);

  // Sai com o art. 60 no alto: a moldura volta e o art. 60 fica logo abaixo da barra fixa.
  await alinharNoAlto(page, art60);
  await sairDoFocoPelaBandeja(page);
  await expect(entrar).toBeFocused();
  await expect(casca).toBeVisible();
  await expect(page).not.toHaveURL(/foco=/);
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art60))).toBeLessThan(2);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art60');

  // O "voltar" do navegador (o gesto do celular) também sai, na mesma posição; "avançar" volta.
  await entrarNoFocoCorrido(page);
  await expect(casca).toBeHidden();
  await page.goBack();
  await expect(casca).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art60))).toBeLessThan(2);
  await page.goForward();
  await expect(sair).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art60))).toBeLessThan(2);

  // Recarregar no modo foco volta a ele, na posição; "Lido até aqui" marca o dispositivo do alto.
  const art105 = page.locator('[data-endereco="art105"]');
  await rolarAte(page, art105);
  await alinharNoAlto(page, art105);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art105');
  await page.reload();
  await expect(sair).toBeVisible();
  await expect(casca).toBeHidden();
  await expect(art105).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  await (await naBandejaDoFoco(page, 'Lido até aqui')).click();
  await expect(
    page.locator('.linha-leitor').filter({ has: art105 }).locator('.marca-lido-ate'),
  ).toHaveText('Lido até aqui');
  await expect.poll(async () => (await leituraGravada(page)).lidoAte).toBe('art105');
  // Recarregar não perde a entrada do histórico: sair volta a ela, na mesma posição.
  await sairDoFocoPelaBandeja(page);
  await expect(casca).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  await expect(page.locator('.lido-ate')).toContainText('Lido até Art. 105');

  // Atalho de teclado: F entra, Esc sai, F de novo entra e sai; o mesmo dispositivo no alto.
  // Fora de campo de texto: com o foco no corpo da página.
  // (Sem clicar no corpo: o clique do Playwright rolaria até ele.)
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press('f');
  await expect(sair).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  // A linha "Lido até Art. 105 · Ir ao lido até" fica fora do modo foco; a marca na linha, não.
  await expect(page.locator('.lido-ate')).toHaveCount(0);
  await expect(
    page.locator('.linha-leitor').filter({ has: art105 }).locator('.marca-lido-ate'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(entrar).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  await page.keyboard.press('Shift+F');
  await expect(sair).toBeVisible();
  await page.keyboard.press('f');
  await expect(entrar).toBeVisible();
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art105))).toBeLessThan(2);
  // Ctrl+F é do navegador (busca), não do modo foco.
  await page.keyboard.press('Control+f');
  await page.evaluate(() => new Promise((resolver) => requestAnimationFrame(resolver)));
  expect(page.url()).not.toMatch(/foco=/);
  await expect(casca).toBeVisible();

  // No fim da norma, a página encurta sem a moldura: o mesmo dispositivo continua no alto, no
  // mesmo ponto, ao entrar e ao sair.
  await irAoFim(page, page.locator('[data-endereco="art204"]'));
  // Até o fim de verdade: as linhas medidas no caminho corrigem a altura estimada da página.
  let fim = -1;
  while (fim !== (await page.evaluate(() => window.scrollY))) {
    fim = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(150);
  }
  const antes = await linhaDoAlto(page);
  await entrarNoFocoCorrido(page);
  await expect(sair).toBeVisible();
  await expect.poll(() => mesmaLinha(page, antes)).toBe(true);
  await sairDoFocoPelaBandeja(page);
  await expect(entrar).toBeVisible();
  await expect.poll(() => mesmaLinha(page, antes)).toBe(true);
  info.annotations.push({ type: 'aparelho', description: info.project.name });
});

test('busca dentro da norma: por texto, sem acento e sem caixa, e por endereço; "ir para" leva ao alto da tela, também no modo foco: LEP compilada (11.6)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);
  const buscar = page.getByRole('button', { name: 'Buscar', exact: true });
  const dialogo = page.getByRole('dialog', { name: 'Buscar na norma' });
  const campo = dialogo.getByRole('searchbox', { name: 'Texto ou endereço' });

  // Texto que está longe da tela (a lista é virtualizada: o Ctrl+F do navegador não o acharia).
  await expect(page.locator('[data-endereco="art146B"]')).toHaveCount(0);
  await buscar.click();
  await expect(campo).toBeFocused();
  await campo.fill('MONITORACAO ELETRONICA');
  await expect(dialogo.getByText(/^\d+ achados no texto\.$/)).toBeVisible();
  const achado = dialogo.getByRole('button', { name: /^Art\. 146-B\b/ });
  await expect(achado.locator('mark')).toHaveText('monitoração eletrônica');
  await semViolacoes(page);
  await achado.click();
  await expect(dialogo).toBeHidden();
  const art146B = page.locator('[data-endereco="art146B"]');
  await expect(art146B.locator('xpath=ancestor::*[contains(@class,"linha-leitor")]')).toHaveClass(
    /achado-da-busca/,
  );
  await expect.poll(async () => Math.abs(await distanciaDoAlto(art146B))).toBeLessThan(2);
  await semViolacoes(page);

  // Por endereço, pelo atalho "/"; o que a norma não tem leva ao mais próximo.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press('/');
  await expect(campo).toBeFocused();
  await expect(campo).toHaveValue('MONITORACAO ELETRONICA');
  await campo.fill('§ 2º do 112');
  await dialogo.getByRole('button', { name: 'Ir para Art. 112, § 2º' }).click();
  const par2 = page.locator('[data-endereco="art112.par2"]');
  await expect.poll(async () => Math.abs(await distanciaDoAlto(par2))).toBeLessThan(2);
  // Ir para um achado não mexe no "lido até" (só a posição segue a rolagem).
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art112.par2');
  expect((await leituraGravada(page)).lidoAte).toBeUndefined();

  // No modo foco, a busca fica no grupo fixo e não sai dele; Enter vai ao endereço.
  await entrarNoFocoCorrido(page);
  await (await naBandejaDoFoco(page, 'Buscar')).click();
  await campo.fill('art. 9-A');
  await campo.press('Enter');
  await expect(dialogo).toBeHidden();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  const art9A = page.locator('[data-endereco="art9A"]');
  // No modo foco a barra fixa some: o alto da tela é o alto da janela.
  await expect
    .poll(async () =>
      Math.abs(
        await art9A.evaluate(
          (el) => (el.closest('.linha-leitor') ?? el).getBoundingClientRect().top,
        ),
      ),
    )
    .toBeLessThan(2);
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobra).toBe(0);
});

/**
 * Seleciona a palavra dentro do alvo como o usuário: no desktop, o clique duplo; no celular e no
 * tablet, o toque longo sobre ela. O Chromium headless do Linux não seleciona no toque longo (no
 * Android, sim): depois do gesto, o teste seleciona a palavra sob o dedo, como o Android faria.
 */
async function selecionarPalavra(page: Page, alvo: Locator, palavra: string, toque: boolean) {
  const ponto = await alvo.first().evaluate((el, procurada) => {
    const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) {
      const i = no.textContent?.indexOf(procurada) ?? -1;
      if (i < 0) continue;
      const faixa = document.createRange();
      faixa.setStart(no, i);
      faixa.setEnd(no, i + procurada.length);
      const caixa = faixa.getClientRects()[0];
      if (caixa) return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
    }
    throw new Error(`sem "${procurada}"`);
  }, palavra);
  if (!toque) {
    await page.mouse.dblclick(ponto.x, ponto.y);
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: ponto.x, y: ponto.y }],
  });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.evaluate(({ x, y }) => {
    const selecao = document.getSelection();
    if (!selecao || !selecao.isCollapsed) return;
    const caret = document.caretPositionFromPoint(x, y);
    if (!caret) return;
    selecao.collapse(caret.offsetNode, caret.offset);
    selecao.modify('move', 'backward', 'word');
    selecao.modify('extend', 'forward', 'word');
  }, ponto);
}

/** Toca (celular e tablet) ou clica (desktop). */
const apertar = (alvo: Locator, toque: boolean) => (toque ? alvo.tap() : alvo.click());

/** As marcações gravadas no IndexedDB (as não excluídas). */
function frasesGravadas(page: Page) {
  return page.evaluate(async () => {
    const banco = await new Promise<IDBDatabase>((resolver, rejeitar) => {
      const pedido = indexedDB.open('arretado');
      pedido.onsuccess = () => {
        resolver(pedido.result);
      };
      pedido.onerror = () => {
        rejeitar(new Error(String(pedido.error)));
      };
    });
    try {
      const todas = await new Promise<
        { texto: string; origemTipo: string; excluidoEm: string | null }[]
      >((resolver, rejeitar) => {
        const pedido = banco.transaction('frases').objectStore('frases').getAll();
        pedido.onsuccess = () => {
          resolver(pedido.result as never);
        };
        pedido.onerror = () => {
          rejeitar(new Error(String(pedido.error)));
        };
      });
      return todas.filter((f) => f.excluidoEm === null);
    } finally {
      banco.close();
    }
  });
}

function marcacoesGravadas(page: Page) {
  return page.evaluate(async () => {
    const banco = await new Promise<IDBDatabase>((resolver, rejeitar) => {
      const pedido = indexedDB.open('arretado');
      pedido.onsuccess = () => {
        resolver(pedido.result);
      };
      pedido.onerror = () => {
        rejeitar(new Error(String(pedido.error)));
      };
    });
    try {
      const todas = await new Promise<
        {
          tipo: string;
          cor?: number;
          nota?: string;
          status: string;
          excluidoEm: string | null;
          ancora: { texto: string };
        }[]
      >((resolver, rejeitar) => {
        const pedido = banco.transaction('marcacoes').objectStore('marcacoes').getAll();
        pedido.onsuccess = () => {
          resolver(pedido.result as never);
        };
        pedido.onerror = () => {
          rejeitar(new Error(String(pedido.error)));
        };
      });
      return todas.filter((m) => m.excluidoEm === null);
    } finally {
      banco.close();
    }
  });
}

test('grifos e notas: selecionar por toque ou mouse, 3 cores com o destaque, nota sem tirar a posição, também no modo foco: LEP compilada (11.4)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);
  // Os destaques abrem ligados (D-D17): a legenda e o termo aceso já estão na tela, sem tocar em nada.
  await expect(page.getByRole('list', { name: 'Legenda dos destaques' })).toBeVisible();

  // Um termo aceso pelo destaque automático: o grifo convive com ele, por fora.
  const destaque = page.locator('.texto-vigente .destaque');
  await rolarAte(page, destaque);
  const endereco = await destaque
    .first()
    .evaluate((el) => el.closest('[data-endereco]')?.getAttribute('data-endereco') ?? '');
  const texto = page.locator(`[data-endereco="${endereco}"] .texto-vigente`);
  const termo = (await destaque.first().innerText()).split(/\s+/).find((p) => p.length >= 3) ?? '';
  expect(termo).not.toBe('');
  await alinharNoAlto(page, texto);

  await selecionarPalavra(page, destaque, termo, toque);
  const acoes = page.getByRole('group', { name: 'Marcar o trecho selecionado' });
  await expect(acoes).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeHidden();
  if (toque) {
    // A aba de pesquisa do Google cobre a base da tela: no toque as ações saem de lá e ficam acima da
    // faixa de baixo (30%), junto da seleção ou no alto.
    const caixa = await acoes.locator('xpath=..').boundingBox();
    const janela = page.viewportSize()?.height ?? 0;
    expect(caixa).not.toBeNull();
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(janela * 0.7 + 1);
  }
  await semViolacoes(page);
  await apertar(acoes.getByRole('button', { name: 'Grifar com a cor 1' }), toque);
  const grifo = texto.locator('mark.grifo');
  await expect(grifo).toHaveText(termo);
  await expect(grifo).toHaveClass(/grifo-1/);
  // Uma partição só: o destaque (o traço) fica dentro do grifo (o fundo), sem duplicar o texto.
  await expect(grifo.locator('.destaque')).toHaveText(termo);
  expect(await grifo.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeVisible();
  await expect
    .poll(() => marcacoesGravadas(page))
    .toEqual([
      expect.objectContaining({
        tipo: 'grifo',
        cor: 1,
        status: 'valida',
        ancora: expect.objectContaining({ texto: termo }),
      }),
    ]);

  // Tocar no grifo o escolhe: trocar a cor.
  await apertar(grifo, toque);
  const doGrifo = page.getByRole('group', { name: 'Grifo escolhido' });
  await expect(doGrifo).toBeVisible();
  await apertar(doGrifo.getByRole('button', { name: 'Cor 3' }), toque);
  await expect(grifo).toHaveClass(/grifo-3/);
  await semViolacoes(page);
  await apertar(doGrifo.getByRole('button', { name: 'Fechar as ações do grifo' }), toque);
  await expect(doGrifo).toBeHidden();

  // Nota em outra palavra do mesmo dispositivo: o diálogo abre e fecha sem mexer na rolagem.
  const palavras = (await texto.innerText()).match(/\p{L}{5,}/gu) ?? [];
  const outra = palavras.find((p) => !p.includes(termo) && !termo.includes(p)) ?? '';
  expect(outra).not.toBe('');
  const rolagem = await rolagemAssentada(page);
  await selecionarPalavra(page, texto, outra, toque);
  await apertar(acoes.getByRole('button', { name: 'Nota' }), toque);
  const dialogo = page.getByRole('dialog', { name: 'Nota' });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('textbox', { name: 'Texto da nota' }).fill('Cai na prova.');
  await apertar(dialogo.getByRole('button', { name: 'Guardar' }), toque);
  await expect(dialogo).toBeHidden();
  const marcador = texto.getByRole('button', { name: `Nota: ${outra}` });
  await expect(marcador).toBeVisible();
  // O lápis é um ícone na altura da letra: o marcador não é mais alto que a linha de texto (a lista é
  // virtualizada e a linha não pode crescer com ele).
  const medidas = await marcador.evaluate((el) => ({
    alto: el.getBoundingClientRect().height,
    linha: parseFloat(getComputedStyle(el.parentElement ?? el).lineHeight),
  }));
  expect(medidas.alto).toBeLessThan(medidas.linha);
  await apertar(marcador, toque);
  await expect(dialogo.getByText('Cai na prova.')).toBeVisible();
  await semViolacoes(page);
  expect(Math.abs((await rolagemAssentada(page)) - rolagem)).toBeLessThan(2);
  await apertar(dialogo.getByRole('button', { name: 'Fechar' }), toque);
  await expect(dialogo).toBeHidden();
  expect(Math.abs((await rolagemAssentada(page)) - rolagem)).toBeLessThan(2);

  // Enviar às frases (Frases 3): o trecho abre o campo, a Frase guarda o link de volta.
  await selecionarPalavra(page, texto, outra, toque);
  await apertar(acoes.getByRole('button', { name: 'Enviar às frases' }), toque);
  const envio = page.getByRole('dialog', { name: 'Enviar às frases' });
  await expect(envio).toBeVisible();
  await expect(envio.getByRole('textbox', { name: 'Frase' })).toHaveValue(outra);
  await semViolacoes(page);
  await apertar(envio.getByRole('button', { name: 'Enviar' }), toque);
  await expect(envio).toBeHidden();
  await expect
    .poll(() => frasesGravadas(page))
    .toEqual([expect.objectContaining({ texto: outra, origemTipo: 'trecho' })]);
  expect(Math.abs((await rolagemAssentada(page)) - rolagem)).toBeLessThan(2);

  // No modo foco, as ações tomam o lugar do grupo fixo, sem alargar a página.
  await entrarNoFocoCorrido(page, toque);
  await selecionarPalavra(page, texto, outra, toque);
  await expect(acoes).toBeVisible();
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobra).toBe(0);
  await semViolacoes(page);
  if (toque) await apertar(acoes.getByRole('button', { name: 'Cancelar a marcação' }), toque);
  else await page.keyboard.press('Escape');
  await expect(acoes).toBeHidden();
  await expect(page).toHaveURL(/[?&]foco=texto/);

  // Recarregar: o grifo e a nota continuam; tirar o grifo.
  await page.reload();
  await expect(grifo).toHaveClass(/grifo-3/);
  await expect(marcador).toBeVisible();
  await apertar(grifo, toque);
  await apertar(doGrifo.getByRole('button', { name: 'Tirar o grifo' }), toque);
  await expect(grifo).toHaveCount(0);
  await expect
    .poll(async () => (await marcacoesGravadas(page)).map((m) => m.tipo))
    .toEqual(['nota']);
});

/** A estrela só aparece na linha ativa (peça 1): passa o ponteiro no dispositivo e devolve o botão. */
async function estrelaDe(page: Page, endereco: string, nome: string) {
  await page.locator(`[data-endereco="${endereco}"]`).hover();
  const botao = page.getByRole('button', { name: nome, exact: true });
  await expect(botao).toBeVisible();
  return botao;
}

/**
 * A caixa da estrela (D-D7, P6): 44 de altura e, de largura, ao menos 40 (44 onde há folga à esquerda:
 * o celular e o cartão do modo foco têm 16 px), e inteira à vista: o toque na ponta esquerda dela
 * chega ao botão, sem o corte da borda da tela nem do cartão.
 */
async function caixaInteiraDaEstrela(botao: Locator) {
  const caixa = await botao.evaluate((el) => {
    const c = el.getBoundingClientRect();
    const sob = document.elementFromPoint(c.left + 2, c.top + c.height / 2);
    return { largura: c.width, altura: c.height, acerta: sob?.closest('button.estrela') === el };
  });
  expect(caixa.altura).toBeCloseTo(44, 0);
  expect(caixa.largura).toBeGreaterThanOrEqual(40);
  expect(caixa.acerta).toBe(true);
}

/** As origens das estrelas gravadas no IndexedDB (as não excluídas), em ordem. */
function estrelasGravadas(page: Page) {
  return page.evaluate(async () => {
    const banco = await new Promise<IDBDatabase>((resolver, rejeitar) => {
      const pedido = indexedDB.open('arretado');
      pedido.onsuccess = () => {
        resolver(pedido.result);
      };
      pedido.onerror = () => {
        rejeitar(new Error(String(pedido.error)));
      };
    });
    try {
      const todas = await new Promise<{ origemTipo: string; excluidoEm: string | null }[]>(
        (resolver, rejeitar) => {
          const pedido = banco.transaction('estrelas').objectStore('estrelas').getAll();
          pedido.onsuccess = () => {
            resolver(pedido.result as never);
          };
          pedido.onerror = () => {
            rejeitar(new Error(String(pedido.error)));
          };
        },
      );
      return todas
        .filter((e) => e.excluidoEm === null)
        .map((e) => e.origemTipo)
        .sort();
    } finally {
      banco.close();
    }
  });
}

/**
 * Rola meia tela por vez, esperando as linhas da tela terem texto, até o alvo existir na lista; depois
 * o põe à vista. Sob carga, a rolagem de 0,9 tela com pausa fixa (`rolarAte`) passa por cima de um nó
 * que a lista virtualizada não desenhou a tempo (no tablet, de tela alta, chegou ao fim da LEP).
 */
async function rolarAteExistir(page: Page, alvo: Locator, tentativas = 120) {
  for (let i = 0; i < tentativas; i++) {
    if ((await alvo.count()) > 0) break;
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.5);
    });
    await page.waitForFunction(() => !document.querySelector('.texto-carregando'));
  }
  await alvo.first().scrollIntoViewIfNeeded();
  await expect(alvo.first()).toBeVisible();
}

test('estrela: estrelar a Seção I propaga; desmarcar um artigo vira exceção; estrelar de novo desfaz, sem mexer na linha nem na posição, também no modo foco: LEP compilada (11.2)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);

  // Título II › Capítulo II (Da Assistência) › Seção I (Disposições Gerais): arts. 10 e 11.
  const secao = page.locator('[data-endereco="tit2.cap2.sec1"]');
  await rolarAteExistir(page, secao);
  await expect(secao.getByRole('heading')).toContainText('Seção I');
  await alinharNoAlto(page, secao);
  const estrela = (nome: string) => page.getByRole('button', { name: nome, exact: true });
  const art10 = page.locator('[data-endereco="art10"]');
  await expect(art10).toBeVisible();

  // Em repouso, só a linha ativa (a última tocada) tem botão: a estrela é marca, não botão (peça 1).
  expect(await page.locator('button.estrela').count()).toBeLessThanOrEqual(1);
  // O ponteiro rola o que ainda não está à vista; a medida parte daqui, com a Seção I já ativa.
  const botaoDaSecao = await estrelaDe(page, 'tit2.cap2.sec1', 'Estrela: Seção I');
  await expect(art10).toBeVisible();
  const alturaAntes = await art10.evaluate((el) => el.getBoundingClientRect().height);
  const alto = await distanciaDoAlto(secao);
  await apertar(botaoDaSecao, toque);
  await expect(estrela('Estrela: Seção I (direta)')).toHaveAttribute('aria-pressed', 'true');
  // A linha não mudou de altura, nem a leitura de lugar.
  expect(await art10.evaluate((el) => el.getBoundingClientRect().height)).toBe(alturaAntes);
  expect(Math.abs((await distanciaDoAlto(secao)) - alto)).toBeLessThan(1);
  // A herdada é só a barra tracejada; o botão aparece na linha ativa.
  const estrelaDoArt10 = await estrelaDe(page, 'art10', 'Estrela: Art. 10 (herdada de Seção I)');
  await expect(estrelaDoArt10).toHaveAttribute('aria-pressed', 'true');
  await caixaInteiraDaEstrela(estrelaDoArt10);
  const barra = page.locator('.linha-leitor[data-estrela-origem="herdada"]').first();
  expect(await barra.evaluate((el) => getComputedStyle(el, '::before').backgroundImage)).toContain(
    'repeating-linear-gradient',
  );
  await expect(
    await estrelaDe(page, 'art11', 'Estrela: Art. 11 (herdada de Seção I)'),
  ).toHaveAttribute('aria-pressed', 'true');
  // Só a direta e a linha ativa têm botão.
  await expect(page.locator('button.estrela')).toHaveCount(2);
  // O Capítulo (acima) e a Seção II (ao lado) não acendem.
  await expect(await estrelaDe(page, 'tit2.cap2', 'Estrela: CAPÍTULO II')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('.aviso-da-estrela')).toHaveText('Seção I: estrela direta.');
  expect(await estrelasGravadas(page)).toEqual(['direta']);
  await semViolacoes(page);

  // Desmarcar o art. 11 vira exceção (só a direta e a exceção são gravadas).
  await apertar(await estrelaDe(page, 'art11', 'Estrela: Art. 11 (herdada de Seção I)'), toque);
  const excecao = estrela('Estrela: Art. 11 (exceção: fora da estrela de Seção I)');
  await expect(excecao).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.aviso-da-estrela')).toHaveText(
    'Art. 11: exceção: fora da estrela de Seção I.',
  );
  expect(await estrelasGravadas(page)).toEqual(['direta', 'excecao']);

  // No modo foco, o mesmo controle; estrelar de novo o art. 11 desfaz a exceção.
  await entrarNoFocoCorrido(page, toque);
  // A linha ativa pode ter mudado com a moldura que saiu: o ponteiro a reativa.
  await caixaInteiraDaEstrela(
    await estrelaDe(page, 'art11', 'Estrela: Art. 11 (exceção: fora da estrela de Seção I)'),
  );
  await semViolacoes(page);
  await apertar(excecao, toque);
  await expect(estrela('Estrela: Art. 11 (herdada de Seção I)')).toBeVisible();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect.poll(() => estrelasGravadas(page)).toEqual(['direta']);
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobra).toBe(0);

  // Recarregar: a herança é recalculada da direta gravada.
  await page.reload();
  await expect(estrela('Estrela: Seção I (direta)')).toHaveAttribute('aria-pressed', 'true');
  await estrelaDe(page, 'art10', 'Estrela: Art. 10 (herdada de Seção I)');
});

test('filtros: só os estrelados, só um trecho e "mostrar tudo", com o contexto, a posição mantida e o grupo fixo sem alargar a página, também no modo foco: LEP compilada (11.3)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);

  const naoTemLargura = async () => {
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBe(0);
  };
  const filtrar = async (escolha: string) => {
    await apertar(await naBandejaDoFoco(page, /^(Filtrar|Filtrado)/), toque);
    const dialogo = page.getByRole('dialog', { name: 'Filtrar a norma' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('radio', { name: escolha }).check();
    return dialogo;
  };

  // Estrela a Seção I (Título II › Capítulo II): os arts. 10 e 11 herdam.
  const secao = page.locator('[data-endereco="tit2.cap2.sec1"]');
  await rolarAteExistir(page, secao);
  await alinharNoAlto(page, secao);
  await apertar(await estrelaDe(page, 'tit2.cap2.sec1', 'Estrela: Seção I'), toque);
  await estrelaDe(page, 'art11', 'Estrela: Art. 11 (herdada de Seção I)');

  // O grupo fixo é Buscar, Modo foco e o ⋯, em qualquer largura: cabe na tela.
  const grupo = page.locator('.acoes-leitor');
  await expect(maisDoLeitor(page)).toBeVisible();
  const caixa = await grupo.boundingBox();
  const largura = page.viewportSize()?.width ?? 0;
  expect(caixa).not.toBeNull();
  expect((caixa?.x ?? -1) >= 0 && (caixa?.x ?? 0) + (caixa?.width ?? 0) <= largura).toBe(true);
  await naoTemLargura();

  // Só os estrelados: a Seção I, os artigos dela e o contexto (Título II e Capítulo II) atenuado.
  const antes = await distanciaDoAlto(secao);
  const dialogo = await filtrar('Só os estrelados');
  await semViolacoes(page);
  await apertar(dialogo.getByRole('button', { name: 'Mostrar', exact: true }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.filtro-ativo')).toContainText(
    /Mostrando só: estrelados \(\d+ dispositivos\)/,
  );
  await expect(page.locator('[data-endereco="art10"]')).toBeVisible();
  await expect(page.locator('[data-endereco="art11"]')).toBeVisible();
  await expect(page.locator('[data-endereco="art1"]')).toHaveCount(0);
  await expect(page.locator('[data-endereco="tit2.cap2.sec2"]')).toHaveCount(0);
  await expect(
    page.locator('.linha-leitor[data-contexto] [data-endereco="tit2.cap2"]'),
  ).toBeVisible();
  await expect(page.locator('.linha-leitor[data-contexto] [data-endereco="tit2"]')).toBeVisible();
  // A leitura continua na Seção I, no mesmo ponto da tela. Numa tela alta, a lista filtrada é curta
  // e não há rolagem para pôr a Seção I no alto: vale a rolagem no fim da página.
  await expect(secao).toBeVisible();
  await expect
    .poll(async () => {
      const noFim = await page.evaluate(
        () => window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1,
      );
      return noFim || Math.abs((await distanciaDoAlto(secao)) - antes) < 2;
    })
    .toBe(true);
  // O filtro ligado se mostra no anel do ⋯ (o item "Filtrado" está dentro dele).
  await expect(page.getByRole('button', { name: 'Mais. Filtrado: estrelados' })).toBeVisible();
  await semViolacoes(page);
  await naoTemLargura();

  // Um trecho: do art. 1 ao art. 3 (e o que está dentro do último).
  const outro = await filtrar('Só um trecho');
  await outro.getByLabel('De', { exact: true }).fill('1');
  await outro.getByLabel('até', { exact: true }).fill('3');
  await apertar(outro.getByRole('button', { name: 'Mostrar', exact: true }), toque);
  await expect(page.locator('.filtro-ativo')).toContainText('Mostrando só: Art. 1º a Art. 3º');
  await expect(page.locator('[data-endereco="art1"]')).toBeVisible();
  await expect(page.locator('[data-endereco="art3"]')).toBeVisible();
  await expect(page.locator('[data-endereco="art10"]')).toHaveCount(0);

  // No modo foco, o botão fica no grupo; o filtro vale lá, e a página não alarga.
  await entrarNoFocoCorrido(page, toque);
  await expect(page.locator('.filtro-ativo p')).toHaveCount(0);
  await expect(page.locator('[data-endereco="art1"]')).toBeVisible();
  await semViolacoes(page);
  await naoTemLargura();
  const emFoco = await filtrar('Tudo');
  await apertar(emFoco.getByRole('button', { name: 'Mostrar tudo' }), toque);
  await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect(maisDoFoco(page)).toBeVisible();
  await expect(page.locator('[data-endereco="art1"]')).toBeVisible();
  await naoTemLargura();

  // Sem filtro, a linha de estado some e o resto da norma volta.
  await sairDoFocoPelaBandeja(page, toque);
  await expect(page.locator('.filtro-ativo')).toHaveCount(0);
});

test('ações por dispositivo: registrar erro já vinculado, cartão deste trecho, copiar a referência e o filtro "com erro", também no modo foco: LEP compilada (11.5)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);

  const naoTemLargura = async () => {
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBe(0);
  };

  // O art. 9º-A no alto da tela: o que o "+" cria nasce ligado a ele, e as ações do "⋯" agem nele.
  const artigo = page.locator('[data-endereco="art9A"]');
  await rolarAteExistir(page, artigo);
  await alinharNoAlto(page, artigo);
  const alturaAntes = await distanciaDoAlto(artigo);
  const mais = page.getByRole('button', { name: 'Novo registro' });
  const painelDoMais = page.locator('.mais-itens');
  await apertar(await naBandejaDoFoco(page, /^Ações/), toque);
  const dialogo = page.getByRole('dialog', { name: 'Ações de Art. 9º-A' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByText('art. 9º-A, LEP', { exact: true })).toBeVisible();
  await expect(dialogo.getByText('Nenhum erro vinculado a este dispositivo.')).toBeVisible();
  // Criar não mora nas Ações: erro e cartão são do "+".
  await expect(dialogo.getByRole('button', { name: 'Registrar erro' })).toHaveCount(0);
  await expect(dialogo.getByRole('button', { name: 'Criar cartão deste trecho' })).toHaveCount(0);
  await semViolacoes(page);
  await apertar(dialogo.getByRole('button', { name: 'Fechar' }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();

  // Registrar erro, pelo "+": só o formulário (a frase correta, D25), com "o que foi" já com a referência,
  // opcional. Salvar fecha o diálogo e a leitura fica onde estava.
  await apertar(mais, toque);
  await expect(
    painelDoMais.getByRole('button', { name: /^Registrar erro Ligado ao Art\. 9º-A/ }),
  ).toBeVisible();
  await semViolacoes(page);
  await apertar(painelDoMais.getByRole('button', { name: /^Registrar erro/ }), toque);
  const registro = page.getByRole('dialog', { name: 'Registrar erro em Art. 9º-A' });
  await expect(registro).toBeVisible();
  await expect(registro.getByText('art. 9º-A, LEP', { exact: true })).toBeVisible();
  await expect(registro.getByRole('button', { name: 'Copiar referência' })).toHaveCount(0);
  const campo = registro.getByLabel('O que foi (opcional)');
  await expect(campo).toHaveValue('art. 9º-A, LEP: ');
  await registro
    .getByLabel('Frase correta')
    .fill('A identificação do perfil genético é obrigatória.');
  await apertar(registro.getByRole('button', { name: 'Errei' }), toque);
  await campo.pressSequentially('confundi o prazo da identificação');
  await semViolacoes(page);
  await apertar(registro.getByRole('button', { name: 'Salvar' }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.aviso-da-estrela')).toContainText(
    'Erro registrado, ligado ao art. 9º-A, LEP.',
  );
  // O foco volta ao "+", de onde a pessoa partiu.
  await expect(mais).toBeFocused();

  // Cartão deste trecho, pelo "+" (uma vez só): sai sem diálogo, com um aviso rápido, e o item passa a
  // dizer que já foi criado.
  await apertar(mais, toque);
  await apertar(painelDoMais.getByRole('button', { name: /^Cartão deste trecho/ }), toque);
  await expect(page.locator('.aviso-da-estrela')).toContainText(
    'Cartão criado: art. 9º-A, LEP. Primeira revisão amanhã.',
  );
  await expect(page.getByRole('dialog')).toBeHidden();
  await apertar(mais, toque);
  const feito = painelDoMais.getByRole('button', { name: /^Cartão deste trecho/ });
  await expect(feito).toHaveAttribute('aria-disabled', 'true');
  await expect(feito).toContainText('Já criado');
  await semViolacoes(page);
  await apertar(mais, toque);
  await expect(painelDoMais).toHaveCount(0);

  // O "⋯" mostra o erro novo na lista dos vinculados; copiar a referência.
  await apertar(await naBandejaDoFoco(page, /^Ações/), toque);
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('link', { name: /perfil genético é obrigatória/ })).toBeVisible();
  await apertar(dialogo.getByRole('button', { name: 'Copiar referência' }), toque);
  await expect(dialogo.getByText('Copiado: art. 9º-A, LEP.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('art. 9º-A, LEP');
  await semViolacoes(page);
  await apertar(dialogo.getByRole('button', { name: 'Fechar' }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();

  // A posição não mexeu, e o grupo com 3 botões cabe na tela.
  expect(Math.abs((await distanciaDoAlto(artigo)) - alturaAntes)).toBeLessThan(2);
  const caixa = await page.locator('.acoes-leitor').boundingBox();
  const largura = page.viewportSize()?.width ?? 0;
  expect((caixa?.x ?? -1) >= 0 && (caixa?.x ?? 0) + (caixa?.width ?? 0) <= largura).toBe(true);
  await naoTemLargura();

  // O filtro "com erro vinculado" acha o artigo.
  await apertar(await naBandejaDoFoco(page, /^(Filtrar|Filtrado)/), toque);
  const filtro = page.getByRole('dialog', { name: 'Filtrar a norma' });
  await filtro.getByRole('radio', { name: 'Só com erro vinculado' }).check();
  await apertar(filtro.getByRole('button', { name: 'Mostrar', exact: true }), toque);
  await expect(page.locator('.filtro-ativo')).toContainText('com erro vinculado (1 dispositivo)');
  await expect(artigo).toBeVisible();

  // No modo foco, o botão está no grupo e abre as mesmas ações, sem alargar a página.
  await entrarNoFocoCorrido(page, toque);
  await apertar(await naBandejaDoFoco(page, /^Ações/), toque);
  const emFoco = page.getByRole('dialog', { name: 'Ações de Art. 9º-A' });
  await expect(emFoco).toBeVisible();
  await expect(emFoco.getByRole('link', { name: /perfil genético é obrigatória/ })).toBeVisible();
  await semViolacoes(page);
  await apertar(emFoco.getByRole('button', { name: 'Fechar' }), toque);
  await expect(page).toHaveURL(/[?&]foco=texto/);
  // O "+" fica no mesmo canto no modo foco e também nasce ligado ao artigo à vista.
  await apertar(mais, toque);
  await expect(
    painelDoMais.getByRole('button', { name: /^Registrar erro Ligado ao Art\. 9º-A/ }),
  ).toBeVisible();
  await apertar(mais, toque);
  await expect(painelDoMais).toHaveCount(0);
  await naoTemLargura();
});

test('palco do foco: F abre o cartão na penumbra, só o ⋯ e o fio de progresso, setas no cartão, bandeja, Esc em duas etapas e a lente que fica; "lido até" que só avança e a mesma posição ao sair: LEP compilada (11.8, palco)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const entrar = page.getByRole('button', { name: 'Modo foco' });
  const casca = cabecalhoDaCasca(page);
  const cartao = (artigo: string) =>
    page.getByRole('region', { name: new RegExp(`^Art\\. ${artigo}, \\d+ de \\d+$`) });
  const proximo = page.getByRole('button', { name: 'Próximo artigo' });
  const anterior = page.getByRole('button', { name: 'Artigo anterior' });
  const sobra = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

  // Entra com o art. 41 no alto: o cartão é o art. 41 inteiro, sem a moldura e sem a barra.
  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  const fundoDaPagina = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  const fundoAntes = await fundoDaPagina();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await entrar.click();
  await expect(page).toHaveURL(/[?&]foco=artigo/);
  await expect(cartao('41')).toBeVisible();
  await expect(casca).toBeHidden();
  await expect(aaDosAjustes(page)).toBeHidden();
  expect(await sobra()).toBe(0);
  // O cartão fica no centro da tela, na horizontal, e na vertical no centro do que sobra da tela (rola
  // por dentro só se exceder). Até 52 rem o "+" (D-D23) toma uma faixa no alto, e o cartão começa
  // abaixo dela; acima disso o canto está livre e a conta é a da tela inteira.
  const caixaDoCartao = await page.locator('.area-artigo').boundingBox();
  const caixaDoMais = await page.getByRole('button', { name: 'Novo registro' }).boundingBox();
  const tela = page.viewportSize();
  if (!caixaDoCartao || !caixaDoMais || !tela) throw new Error('sem medidas do cartão ou da tela');
  expect(Math.abs(caixaDoCartao.x + caixaDoCartao.width / 2 - tela.width / 2)).toBeLessThanOrEqual(
    8,
  );
  const topoLivre = tela.width <= 832 ? caixaDoMais.y + caixaDoMais.height : 0;
  expect(
    Math.abs(caixaDoCartao.y + caixaDoCartao.height / 2 - (topoLivre + tela.height) / 2),
  ).toBeLessThanOrEqual(12);
  // O palco: a página na penumbra (mais escura que o fundo de antes) e o cartão aceso. A entrada
  // leva 200 ms, e prefers-reduced-motion a desliga.
  await expect.poll(fundoDaPagina).not.toBe(fundoAntes);
  const duracaoDoCartao = () =>
    cartao('41').evaluate((el) => getComputedStyle(el).animationDuration);
  expect(await duracaoDoCartao()).toBe('0.2s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duracaoDoCartao()).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Só o ⋯ e o fio de progresso na tela: nenhum controle da bandeja à vista.
  await expect(maisDoFoco(page)).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Por artigo' })).toHaveCount(0);
  // Os incisos do art. 41 estão no mesmo cartão; o texto dos vizinhos fica fora dele.
  await expect(cartao('41').locator('[data-endereco="art41.incI"]')).toBeVisible();
  await expect(cartao('41').locator('[data-endereco="art42"]')).toHaveCount(0);

  // Os vizinhos: o de antes e o de depois, sem interação e, por padrão, sem texto (só a borda).
  const vizinhos = page.locator('.vizinho');
  await expect(vizinhos).toHaveCount(2);
  for (const vizinho of await vizinhos.all()) {
    await expect(vizinho).toHaveAttribute('inert', '');
    expect(await vizinho.innerText()).toBe('');
  }

  // O cartão cabe na tela (o artigo longo rola dentro dele), e os botões têm o tamanho do dedo.
  const caixa = await cartao('41').boundingBox();
  const janela = page.viewportSize();
  expect((caixa?.y ?? 0) + (caixa?.height ?? 0)).toBeLessThanOrEqual(janela?.height ?? 0);
  for (const botao of [anterior, proximo]) {
    const medidas = await botao.boundingBox();
    expect(medidas?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(medidas?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  // O ⋯ e as setas dentro da tela; a bandeja abre e fecha (o ⋯ e o Esc).
  await expect(maisDoFoco(page)).toBeInViewport();
  await expect(proximo).toBeInViewport();
  await maisDoFoco(page).click();
  await expect(page.getByRole('button', { name: 'Lido até aqui' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Sair do foco' })).toBeInViewport();
  await semViolacoes(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Sair do foco' })).toBeHidden();
  await expect(page).toHaveURL(/[?&]foco=artigo/);

  // Próximo e anterior por botão e por seta; o "lido até" avança ao passar e nunca recua sozinho.
  const enderecoDoCartao = () =>
    page.locator('.cartao-artigo .dispositivo').first().getAttribute('data-endereco');
  await expect.poll(async () => (await leituraGravada(page)).lidoAte).toBeUndefined();
  await proximo.click();
  await expect(cartao('41-A')).toBeVisible();
  const segundo = (await enderecoDoCartao()) ?? '';
  expect(segundo).toBe('art41A');
  await expect.poll(async () => (await leituraGravada(page)).lidoAte).toBe('art41');
  await page.keyboard.press('ArrowRight');
  await expect.poll(enderecoDoCartao).not.toBe(segundo);
  await expect.poll(async () => (await leituraGravada(page)).lidoAte).toBe(segundo);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(enderecoDoCartao).toBe(segundo);
  await anterior.click();
  await expect(cartao('41')).toBeVisible();
  expect((await leituraGravada(page)).lidoAte).toBe(segundo);
  await expect(
    page.getByRole('status').filter({ hasText: /^Art\. 41, \d+ de \d+\.$/ }),
  ).toBeAttached();
  expect(await sobra()).toBe(0);

  // A posição guardada é o artigo do cartão; recarregar volta a ele.
  await proximo.click();
  await expect.poll(enderecoDoCartao).toBe(segundo);
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe(segundo);
  await page.reload();
  await expect.poll(enderecoDoCartao).toBe(segundo);
  await expect(casca).toBeHidden();

  // Sair do foco: o texto corrido volta com o artigo do cartão no alto, e a moldura volta.
  const noTexto = page.locator(`[data-endereco="${segundo}"]`);
  // Esc em duas etapas: o primeiro fecha a bandeja, o segundo sai do foco.
  await maisDoFoco(page).click();
  await expect(page.getByRole('button', { name: 'Sair do foco' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Sair do foco' })).toBeHidden();
  await expect(casca).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(casca).toBeVisible();
  await expect(page).not.toHaveURL(/foco=/);
  await expect.poll(async () => Math.abs(await distanciaDoAlto(noTexto))).toBeLessThan(2);

  // "Texto corrido" dentro do modo foco troca no lugar e leva o texto ao artigo do cartão; a
  // lente escolhida fica: depois de recarregar, o F entra no texto corrido.
  await entrar.click();
  await expect.poll(enderecoDoCartao).toBe(segundo);
  await (await naBandejaDoFoco(page, 'Texto corrido')).click();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect(page.getByRole('region', { name: /^Art\./ })).toHaveCount(0);
  await expect.poll(async () => Math.abs(await distanciaDoAlto(noTexto))).toBeLessThan(2);
  await sairDoFocoPelaBandeja(page);
  await page.reload();
  await entrar.click();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  // De volta ao cartão pela bandeja; a lente passa a ser o cartão de novo.
  await (await naBandejaDoFoco(page, 'Um artigo por vez')).click();
  await expect(page).toHaveURL(/[?&]foco=artigo/);
  await expect(page.locator('.cartao-artigo')).toBeVisible();
  info.annotations.push({ type: 'aparelho', description: info.project.name });
});

test('prévia de remissões: tocar em "art. 84, XIX" na CF abre o dispositivo, "ir para" e "voltar" mantêm a posição, com axe (11.9)', async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  await importarEPublicar(page, 'cf', 'CF');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /CF/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'CF' })).toBeVisible();

  // Vai ao art. 5º, XLVII, a, pela busca por endereço (a lista é virtualizada).
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Texto ou endereço' }).fill('art. 5º, XLVII, a');
  await expect(page.getByRole('button', { name: /^Ir para/ })).toBeVisible();
  await page.keyboard.press('Enter');
  const origem = page.locator('[data-endereco="art5.incXLVII.alA"]');
  await expect(origem).toBeVisible();
  const citacao = origem.locator('[data-remissao]').first();
  await expect(citacao).toHaveText(/art\. 84, XIX/);
  await expect(citacao).toHaveAttribute('role', 'button');

  // A prévia: o dispositivo citado, com a posição de leitura intacta.
  const antes = await rolagemAssentada(page);
  await citacao.click();
  const previa = page.getByRole('dialog', { name: 'Art. 84, XIX' });
  await expect(previa).toBeVisible();
  await expect(previa).toContainText(/declarar guerra/i);
  expect(await rolagemAssentada(page)).toBe(antes);
  await semViolacoes(page);

  // Esc fecha e devolve o foco à citação.
  await page.keyboard.press('Escape');
  await expect(previa).toBeHidden();
  await expect(citacao).toBeFocused();

  // "Ir para" leva o artigo ao alto e oferece o "voltar", que traz a origem de volta.
  await citacao.click();
  await previa.getByRole('button', { name: 'Ir para Art. 84, XIX' }).click();
  const alvo = page.locator('[data-endereco="art84.incXIX"]');
  await expect(alvo).toBeInViewport();
  const voltar = page.getByRole('button', { name: /^Voltar a Art\. 5º, XLVII/ });
  await expect(voltar).toBeVisible();
  await semViolacoes(page);
  await voltar.click();
  await expect(origem).toBeInViewport();
  await expect(voltar).toBeHidden();
  info.annotations.push({ type: 'aparelho', description: info.project.name });
});

test('corrigir o texto publicado: versão nova, o grifo sobrevive, a estrela segue, o grifo sem trecho vai para "Para reler" e desfazer traz de volta: LEP compilada (11.7)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await fixarLenteCorrida(page);

  const artigo = page.locator('[data-endereco="art9A"]');
  await rolarAteExistir(page, artigo);
  await alinharNoAlto(page, artigo);
  const texto = artigo.locator('.texto-vigente').first();
  // Uma palavra longa que aparece uma vez só no artigo: o grifo.
  const palavras = (await texto.innerText()).split(/[^\p{L}]+/u);
  const termo = palavras.find((p) => p.length >= 9 && palavras.filter((q) => q === p).length === 1);
  if (!termo) throw new Error('sem palavra para grifar');
  await selecionarPalavra(page, texto, termo, toque);
  await apertar(
    page
      .getByRole('group', { name: 'Marcar o trecho selecionado' })
      .getByRole('button', { name: 'Grifar com a cor 1' }),
    toque,
  );
  await expect(artigo.locator('mark.grifo')).toHaveText(termo);
  await alinharNoAlto(page, artigo);

  // Estrelar e corrigir pelas ações do dispositivo.
  const abrirAcoes = async () => {
    await apertar(await naBandejaDoFoco(page, /^Ações/), toque);
    const dialogo = page.getByRole('dialog', { name: 'Ações de Art. 9º-A' });
    await expect(dialogo).toBeVisible();
    return dialogo;
  };
  let dialogo = await abrirAcoes();
  await apertar(dialogo.getByRole('button', { name: 'Estrelar' }), toque);
  await apertar(dialogo.getByRole('button', { name: 'Corrigir o texto' }), toque);
  const campo = dialogo.getByLabel('Texto do dispositivo');
  const original = await campo.inputValue();
  expect(original).toContain(termo);
  await campo.fill(`(Corrigido.) ${original}`);
  await semViolacoes(page);
  await apertar(dialogo.getByRole('button', { name: 'Salvar correção' }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();

  const aviso = page.getByRole('region', { name: 'Correção do texto' });
  await expect(aviso).toContainText('Texto corrigido.');
  await expect(aviso).toContainText('1 grifo ou nota mudou de lugar');
  await expect(artigo.locator('.texto-vigente').first()).toContainText('(Corrigido.)');
  await expect(artigo.locator('mark.grifo')).toHaveText(termo);
  await semViolacoes(page);

  // A estrela seguiu; o texto de antes fica consultável. Corrigir de novo, tirando o trecho grifado.
  await alinharNoAlto(page, artigo);
  dialogo = await abrirAcoes();
  await expect(dialogo.getByRole('button', { name: 'Tirar a estrela' })).toBeVisible();
  await expect(dialogo.getByRole('heading', { name: 'Texto de antes' })).toBeVisible();
  await expect(dialogo.getByText(original, { exact: true })).toBeVisible();
  await semViolacoes(page);
  await apertar(dialogo.getByRole('button', { name: 'Corrigir o texto' }), toque);
  await dialogo
    .getByLabel('Texto do dispositivo')
    .fill(`(Corrigido.) ${original}`.replace(termo, 'trecho trocado'));
  await apertar(dialogo.getByRole('button', { name: 'Salvar correção' }), toque);
  await expect(page.getByRole('dialog')).toBeHidden();

  await expect(aviso).toContainText('1 grifo ou nota ficou em “Para reler”');
  const reler = page.getByRole('region', { name: 'Para reler' });
  await expect(reler).toContainText(`“${termo}”`);
  await expect(artigo.locator('mark.grifo')).toHaveCount(0);
  await semViolacoes(page);

  // Desfazer: o texto e o grifo voltam; "Para reler" some.
  await apertar(aviso.getByRole('button', { name: 'Desfazer a correção' }), toque);
  await expect(aviso).toContainText('Correção desfeita.');
  await expect(aviso).toContainText('1 grifo ou nota voltou ao texto');
  await expect(reler).toBeHidden();
  await rolarAteExistir(page, artigo);
  await expect(artigo.locator('mark.grifo')).toHaveText(termo);
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobra).toBe(0);
});

test('Ponto de luz no Leitor: o lido sobre a faixa da folha com o ponto de luz no fim, a Estrela de quatro pontas, o dock sólido e a estrutura da norma de 700 px para cima, com axe nos dois temas: LEP compilada (P4)', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  const largo = (page.viewportSize()?.width ?? 0) >= 700;
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();

  // A estrutura: ao lado do texto só de 700 px para cima, fora do modo foco; no celular e no modo foco ela abre
  // numa folha, o sumário (teste próprio, adiante).
  const estrutura = page.getByRole('navigation', { name: 'Estrutura da norma' });
  if (largo) await expect(estrutura).toBeVisible();
  else await expect(estrutura).toHaveCount(0);

  // "Lido até aqui" no art. 3º (Título I): o art. 3º vai sobre a faixa da folha; o que falta, no chão.
  const art3 = page.locator('[data-endereco="art3"]');
  await rolarAte(page, art3);
  await alinharNoAlto(page, art3);
  await page.getByRole('button', { name: 'Lido até aqui' }).click();
  const marca = page.locator('.marca-lido-ate');
  await expect(marca).toHaveCount(1);
  await expect(marca).toHaveText('Lido até aqui');
  // A caneta saiu (D-D12): o ponto de luz de "onde parei" é do CSS, e não há desenho de caneta na tela.
  await expect(page.locator('svg.caneta')).toHaveCount(0);
  const aposOLido = page.locator('[data-endereco="art3.parUnico"]');
  await expect(aposOLido).toBeVisible();
  const faixa = (alvo: Locator) =>
    alvo.evaluate((el) => {
      const s = getComputedStyle(el);
      const amostra = document.createElement('i');
      amostra.style.background = 'var(--superficie)';
      document.body.append(amostra);
      const folha = getComputedStyle(amostra).backgroundColor;
      amostra.remove();
      return {
        fundo: s.backgroundColor,
        folha,
        borda: s.borderTopWidth,
        raio: s.borderTopLeftRadius,
        sombra: s.boxShadow,
      };
    });
  const lido = await faixa(art3);
  const falta = await faixa(aposOLido);
  expect(lido.fundo, 'o lido vai sobre a folha').toBe(lido.folha);
  expect(falta.fundo, 'o que falta fica no chão').toBe('rgba(0, 0, 0, 0)');
  // Folha e chão quase não se separam pela cor (1,06:1 de dia, 1,10:1 à noite): sem outro sinal a faixa
  // do lido some. D-D9, Q3: ela leva a linha de 1 px do mundo (`--sombra-folha`, por dentro); o que falta, nenhuma.
  expect(lido.sombra, 'o lido leva a linha da folha').toMatch(/ 1px inset$/);
  expect(falta.sombra, 'o que falta não leva linha').toBe('none');
  // Mesma geometria lido ou não: a linha não muda de altura quando o "lido até" anda.
  expect([lido.borda, lido.raio]).toEqual(['3px', '8px']);
  expect([falta.borda, falta.raio]).toEqual(['3px', '8px']);
  await semViolacoes(page);

  // A estrutura mostra a seção de agora na folha, com o estado em palavras, e tocar leva o bloco ao alto.
  if (largo) {
    const agora = estrutura.locator('[aria-current="location"]');
    await expect(agora).toHaveCount(1);
    await expect(agora).toContainText('TÍTULO I');
    await expect(agora).toContainText('em leitura');
    const titulo2 = estrutura.getByRole('button', { name: /^TÍTULO II\b/ });
    await expect(titulo2).toContainText('ainda não lida');
    // O ponto é um `span` que o CSS desenha por máscara (D-D9, Q3), não mais um SVG: o estado vai no atributo.
    await expect(titulo2.locator('.ponto-de-luz')).toHaveAttribute('data-estado', 'falta');
    await apertar(titulo2, toque);
    const cabecalho = page.getByRole('heading', { level: 2, name: /TÍTULO II\b/ });
    await expect(cabecalho).toBeVisible();
    await rolagemAssentada(page);
    await expect.poll(async () => Math.abs(await distanciaDoAlto(cabecalho))).toBeLessThan(2);
    // No título, ele é o de agora e os capítulos dele ficam logo abaixo (subir um nível é tocar no caminho).
    await expect(estrutura.locator('[aria-current="location"]')).toContainText('TÍTULO II');
    const dentro = estrutura.getByRole('list', { name: 'Dentro de TÍTULO II' });
    await expect(dentro.getByRole('listitem').first()).toContainText('CAPÍTULO I');
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBe(0);
    await semViolacoes(page);
    // A estrutura segue a linha de leitura, um quarto da tela abaixo do alto, não o alto: o cabeçalho
    // do capítulo que sobe até um sexto da tela já é o de agora; a meio da tela, ainda não.
    const cap2 = page.locator('[data-endereco="tit2.cap2"]');
    await rolarAte(page, cap2);
    await alinharNoAlto(page, cap2);
    const visivel = await page.evaluate(
      () =>
        window.innerHeight -
        (document.querySelector('.fio-topo')?.getBoundingClientRect().bottom ?? 0),
    );
    await page.evaluate((dy) => {
      window.scrollBy(0, dy);
    }, -visivel * 0.55);
    await expect(estrutura.locator('[aria-current="location"]')).not.toContainText('CAPÍTULO II');
    await page.evaluate((dy) => {
      window.scrollBy(0, dy);
    }, visivel * 0.4);
    await expect(estrutura.locator('[aria-current="location"]')).toContainText('CAPÍTULO II');
    // De volta ao art. 3º, para as partes de baixo.
    await page.getByRole('button', { name: 'Ir ao lido até' }).click();
    await expect(art3).toBeVisible();
  }

  // O dock: Buscar, Modo foco e o ⋯ numa só barra sólida (o contrato proíbe vidro desfocado atrás de
  // texto), em toda largura; "Lido até aqui" fica fora. Filtrar e Ações moram no ⋯ (D-D24).
  const dock = page.getByRole('group', { name: 'Ferramentas da leitura' });
  expect(
    await dock
      .getByRole('button')
      .evaluateAll((botoes) => botoes.map((b) => b.getAttribute('aria-label') ?? b.textContent)),
  ).toEqual(['Buscar', 'Modo foco', 'Mais']);
  await expect(dock.getByRole('button', { name: 'Lido até aqui' })).toHaveCount(0);
  const barra = await dock.evaluate((el) => {
    const s = getComputedStyle(el);
    return { desfoque: s.backdropFilter, fundo: s.backgroundColor, sombra: s.boxShadow };
  });
  expect(barra.desfoque, 'sem vidro desfocado atrás do texto').toBe('none');
  // Opaco: o navegador escreve `rgb(…)` sem o quarto número (a cor com transparência é `rgba(…)`).
  expect(barra.fundo, 'a superfície inteira, sem transparência').toMatch(/^rgb\(/);
  // Sem sombra: a camada se separa pela linha da folha (D-D9, Q7), não por profundidade.
  expect(barra.sombra, 'o dock não leva sombra').toBe('none');

  // A Estrela de luz: quatro pontas e o aro que a separa da faixa.
  const botao = await estrelaDe(page, 'art3', 'Estrela: Art. 3º');
  await apertar(botao, toque);
  const direta = page.locator('button.estrela[data-origem="direta"]');
  await expect(direta).toHaveCount(1);
  await expect(direta.locator('svg path.ponta')).toHaveCount(1);
  await expect(direta.locator('svg path.aro')).toHaveCount(1);
  expect(
    await direta
      .locator('svg path.ponta')
      .evaluate((p) => p.getAttribute('d')?.split(/[\s,]+/).length),
  ).toBeGreaterThan(8);
  await semViolacoes(page);

  // A barra do Leitor (o "Aa" dos ajustes de leitura) e a legenda dos destaques, numa linha só.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const legenda = page.getByRole('list', { name: 'Legenda dos destaques' });
  await expect(legenda.getByRole('listitem')).toHaveText([
    'Prazos',
    'Exceções',
    'Absolutos',
    'Penas',
  ]);
  const linhas = await legenda
    .getByRole('listitem')
    .evaluateAll(
      (itens) => new Set(itens.map((i) => Math.round(i.getBoundingClientRect().top))).size,
    );
  expect(linhas, 'a legenda cabe numa linha').toBe(1);
  await expect(aaDosAjustes(page)).toBeVisible();
  const sobraNaBarra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sobraNaBarra).toBe(0);
  await semViolacoes(page);

  // Em 320 px (o menor celular): a barra do dock e a legenda dos destaques cabem numa linha, a faixa
  // do lido não encosta na borda da tela e nada rola na horizontal. A largura é fixada aqui, então só
  // o projeto do celular.
  if (info.project.name === 'celular') {
    await page.setViewportSize({ width: 320, height: 640 });
    await rolarAte(page, art3);
    const estreito = await page.evaluate(() => {
      const raiz = document.documentElement;
      const barra = document.querySelector('.dock-do-leitor')?.getBoundingClientRect();
      const faixaDoLido = document.querySelector('[data-endereco="art3"]')?.getBoundingClientRect();
      const botoes = [...document.querySelectorAll('.dock-do-leitor button')];
      return {
        sobra: raiz.scrollWidth - raiz.clientWidth,
        linhasDoDock: new Set(botoes.map((b) => Math.round(b.getBoundingClientRect().top))).size,
        linhasDaLegenda: new Set(
          [...document.querySelectorAll('.legenda-destaques li')].map((i) =>
            Math.round(i.getBoundingClientRect().top),
          ),
        ).size,
        barraDentro: barra !== undefined && barra.left >= 0 && barra.right <= raiz.clientWidth,
        folgaDoLido: raiz.clientWidth - (faixaDoLido?.right ?? raiz.clientWidth),
      };
    });
    expect(estreito.sobra).toBeLessThanOrEqual(0);
    expect(estreito.linhasDoDock, 'o dock cabe numa linha em 320 px').toBe(1);
    expect(estreito.linhasDaLegenda, 'a legenda cabe numa linha em 320 px').toBe(1);
    expect(estreito.barraDentro, 'a barra do dock fica dentro da tela').toBe(true);
    expect(estreito.folgaDoLido, 'a faixa do lido não encosta na borda').toBeGreaterThanOrEqual(
      7.5,
    );
    await semViolacoes(page);
  }
});

test('ajustes de leitura: o "Aa" abre a folha embaixo, com a lei à vista; tamanho, destaques e foco na frase valem na hora e ficam gravados; Esc, "Fechar" e o toque fora fecham: LEP compilada', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const art1 = page.locator('[data-endereco="art1"]');
  await expect(art1).toBeVisible();
  const tamanhoDoArt1 = () =>
    art1.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));

  // A barra do alto ficou em "Voltar", o título e o "Aa": os ajustes não ficam mais soltos nela.
  const barra = page.locator('.barra-leitor');
  await expect(barra.getByRole('button')).toHaveCount(1);
  await expect(barra.locator('select, input, output')).toHaveCount(0);
  const aa = aaDosAjustes(page);
  await expect(aa).toHaveAttribute('aria-haspopup', 'dialog');
  const alvo = await aa.boundingBox();
  expect(alvo?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(alvo?.height ?? 0).toBeGreaterThanOrEqual(44);

  await apertar(aa, toque);
  const folha = folhaDosAjustes(page);
  await expect(folha).toBeVisible();
  // A folha é baixa e fica embaixo: a lei continua à vista em cima dela (no computador, também ao lado).
  const medida = await page.evaluate(() => {
    const dialogo = document.querySelector('dialog.dialogo-ajustes');
    if (!dialogo) return undefined;
    const caixa = dialogo.getBoundingClientRect();
    const raiz = document.documentElement;
    const topo = document.querySelector('.fio-topo')?.getBoundingClientRect().bottom ?? 0;
    const linhasAVista = [...document.querySelectorAll('.linha-leitor')].filter((linha) => {
      const c = linha.getBoundingClientRect();
      const naTela = c.top >= topo && c.bottom <= window.innerHeight;
      return naTela && (c.bottom <= caixa.top || c.right <= caixa.left);
    }).length;
    return {
      folgaEmbaixo: window.innerHeight - caixa.bottom,
      dentroDaTela: caixa.top >= topo && caixa.left >= 0 && caixa.right <= raiz.clientWidth,
      altura: caixa.height,
      alturaDaTela: window.innerHeight,
      linhasAVista,
      sobraDeLado: raiz.scrollWidth - raiz.clientWidth,
      rolaPorDentro: dialogo.scrollHeight - dialogo.clientHeight,
    };
  });
  if (!medida) throw new Error('sem a folha dos ajustes');
  expect(medida.dentroDaTela, 'a folha cabe na tela, abaixo do cabeçalho').toBe(true);
  expect(medida.folgaEmbaixo, 'a folha fica embaixo').toBeLessThanOrEqual(32);
  expect(medida.altura, 'a folha ocupa menos da metade da tela').toBeLessThan(
    medida.alturaDaTela / 2,
  );
  expect(medida.linhasAVista, 'a lei continua à vista').toBeGreaterThanOrEqual(1);
  expect(medida.sobraDeLado).toBeLessThanOrEqual(0);
  expect(medida.rolaPorDentro, 'nada fica escondido dentro da folha').toBeLessThanOrEqual(0);
  await semViolacoes(page);

  // O tamanho vale na hora, no texto de trás.
  await apertar(folha.getByRole('button', { name: /aumentar o texto/ }), toque);
  await expect(folha.getByLabel('Tamanho atual do texto')).toHaveText('20 px');
  await expect.poll(tamanhoDoArt1).toBe(20);

  // Os destaques também.
  await expect(page.locator('.destaque').first()).toBeAttached();
  await caixaDosDestaques(page).uncheck();
  await expect(page.locator('.destaque')).toHaveCount(0);
  await caixaDosDestaques(page).check();
  await expect(page.locator('.destaque').first()).toBeAttached();

  // O foco na frase: "só as palavras de destaque" acende os destaques por conta própria, e a caixa deles
  // fica marcada e parada, dizendo por quê.
  const foco = folha.getByRole('combobox', { name: 'Foco na frase' });
  await expect(foco.getByRole('option')).toHaveText([
    'Desligado',
    'Só a frase em leitura',
    'Só as palavras de destaque',
  ]);
  await foco.selectOption('palavras');
  await expect(page.locator('.leitor')).toHaveAttribute('data-regua-foco', 'palavras');
  await expect(caixaDosDestaques(page)).toBeChecked();
  await expect(caixaDosDestaques(page)).toBeDisabled();
  await expect(folha.getByText('Fica ligado com o foco nas palavras de destaque.')).toBeVisible();
  await semViolacoes(page);
  await foco.selectOption('frase');
  await expect(page.locator('.leitor')).toHaveAttribute('data-regua-foco', 'frase');
  await expect(caixaDosDestaques(page)).toBeEnabled();
  await foco.selectOption('desligada');
  await expect(page.locator('.leitor')).not.toHaveAttribute('data-regua-foco');

  // Esc fecha, e o foco volta ao "Aa".
  await page.keyboard.press('Escape');
  await expect(folha).toBeHidden();
  await expect(aa).toBeFocused();

  // Um toque fora da folha também fecha, e não cai no que está atrás dela.
  await apertar(aa, toque);
  await expect(folha).toBeVisible();
  const caixa = await folha.boundingBox();
  if (!caixa) throw new Error('sem a caixa da folha');
  const enderecoAntes = page.url();
  const fora = { x: caixa.x + 24, y: caixa.y - 48 };
  if (toque) await page.touchscreen.tap(fora.x, fora.y);
  else await page.mouse.click(fora.x, fora.y);
  await expect(folha).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(page.url()).toBe(enderecoAntes);

  // O que foi ajustado continua depois de recarregar, e é o mesmo de Conta › Aparência, aonde a folha leva.
  await page.reload();
  await expect(art1).toBeVisible();
  await expect.poll(tamanhoDoArt1).toBe(20);
  await apertar(aa, toque);
  await expect(folha.getByLabel('Tamanho atual do texto')).toHaveText('20 px');
  await folha.getByRole('link', { name: 'Conta › Aparência' }).click();
  await expect(page).toHaveURL(/#\/conta\/aparencia$/);
  await expect(page.getByText('Tamanho do texto de leitura: 20 px')).toBeVisible();
});

test('ajustes de leitura no meio da norma: a folha abre pelo "⋯" e pela bandeja do foco, e mudar o tamanho mantém no alto o dispositivo que estava lá: LEP compilada', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();

  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  const tamanhoDoTexto = () =>
    art41.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  const noAlto = () =>
    expect
      .poll(async () => Math.abs(await distanciaDoAlto(art41)), { timeout: 15_000 })
      .toBeLessThan(2);

  // Pelo "⋯", sem sair do lugar: a barra do alto ficou lá no começo da norma.
  const folha = await abrirAjustesPeloMais(page, toque);
  expect(Math.abs(await distanciaDoAlto(art41))).toBeLessThan(2);
  const aumentar = folha.getByRole('button', { name: /aumentar o texto/ });
  const diminuir = folha.getByRole('button', { name: /diminuir o texto/ });
  // Três toques seguidos, sem esperar a lista assentar entre eles: a altura de todas as linhas de cima muda, e
  // o art. 41 continua no alto.
  for (let i = 0; i < 3; i++) await apertar(aumentar, toque);
  await expect(folha.getByLabel('Tamanho atual do texto')).toHaveText('24 px');
  await expect.poll(tamanhoDoTexto).toBe(24);
  await noAlto();
  for (let i = 0; i < 5; i++) await apertar(diminuir, toque);
  await expect(folha.getByLabel('Tamanho atual do texto')).toHaveText('14 px');
  await expect.poll(tamanhoDoTexto).toBe(14);
  await noAlto();

  // "Fechar" devolve o foco ao "⋯", e a posição gravada é a do art. 41.
  await apertar(folha.getByRole('button', { name: 'Fechar' }), toque);
  await expect(folha).toBeHidden();
  await expect(maisDoLeitor(page)).toBeFocused();
  await expect.poll(async () => (await leituraGravada(page)).posicao).toBe('art41');

  // No modo foco a barra do alto não existe: a folha abre pela bandeja, e o tamanho muda sem sair do foco.
  await entrarNoFocoCorrido(page, toque);
  await noAlto();
  await expect(aaDosAjustes(page)).toBeHidden();
  await abrirAjustesPeloMais(page, toque);
  for (let i = 0; i < 2; i++) await apertar(aumentar, toque);
  await expect.poll(tamanhoDoTexto).toBe(18);
  await noAlto();
  // Esc fecha a folha e deixa a pessoa no modo foco, com o foco de volta no "⋯" da bandeja.
  await page.keyboard.press('Escape');
  await expect(folha).toBeHidden();
  await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect(maisDoFoco(page)).toBeFocused();
  await semViolacoes(page);
});

test('ajustes de leitura com a letra do aparelho a 300%: a folha cabe na tela, rola por dentro e nada passa da largura', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', 'a letra ampliada aperta é no celular');
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '300%';
  });

  await abrirAjustesPeloAa(page);
  const medida = await page.evaluate(() => {
    const dialogo = document.querySelector('dialog.dialogo-ajustes');
    if (!dialogo) return undefined;
    const caixa = dialogo.getBoundingClientRect();
    const raiz = document.documentElement;
    const passam = [...dialogo.querySelectorAll('button, select, input, a, label, output, h2')]
      .filter((el) => {
        const c = el.getBoundingClientRect();
        return c.left < caixa.left - 1 || c.right > caixa.right + 1;
      })
      .map((el) => (el.textContent || el.tagName).trim().slice(0, 30));
    return {
      naTela: caixa.top >= 0 && caixa.bottom <= window.innerHeight && caixa.left >= 0,
      naLargura: caixa.right <= raiz.clientWidth,
      sobraDeLado: raiz.scrollWidth - raiz.clientWidth,
      sobraDeLadoPorDentro: dialogo.scrollWidth - dialogo.clientWidth,
      passam,
    };
  });
  if (!medida) throw new Error('sem a folha dos ajustes');
  expect(medida.naTela, 'a folha cabe na altura da tela').toBe(true);
  expect(medida.naLargura, 'a folha cabe na largura da tela').toBe(true);
  expect(medida.sobraDeLado, 'a página não rola de lado').toBeLessThanOrEqual(0);
  expect(medida.sobraDeLadoPorDentro, 'a folha não rola de lado').toBeLessThanOrEqual(0);
  expect(medida.passam, 'nenhum controle passa da folha').toEqual([]);
  // O último controle se alcança rolando por dentro da folha.
  const foco = folhaDosAjustes(page).getByRole('combobox', { name: 'Foco na frase' });
  await foco.scrollIntoViewIfNeeded();
  await expect(foco).toBeInViewport();
  await folhaDosAjustes(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(folhaDosAjustes(page)).toBeHidden();
});

/** A folha do sumário da norma: a estrutura inteira onde o painel não está ao lado do texto (celular e modo foco). */
const folhaDoSumario = (page: Page) => page.getByRole('dialog', { name: 'Sumário' });

test('sumário da norma: no celular o "⋯" abre a folha com todos os blocos, o de agora marcado e com o foco, e tocar num bloco fecha a folha e leva a ele; de 700 px para cima o painel já está ao lado e só o modo foco o oferece, na bandeja: LEP compilada', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const toque = info.project.name !== 'desktop';
  const largo = (page.viewportSize()?.width ?? 0) >= 700;
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  const folha = folhaDoSumario(page);
  const menu = page.getByRole('group', { name: 'Mais ferramentas da leitura' });

  // No meio da norma: o art. 41 (os direitos do preso, uma lista longa) no alto da tela. A linha de leitura cai
  // dentro dele, na Seção II (Dos Direitos) do Capítulo IV do Título II.
  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);

  if (largo) {
    // O painel da estrutura está ao lado do texto: o "⋯" não repete o sumário.
    await apertar(maisDoLeitor(page), toque);
    await expect(menu.getByRole('button')).toHaveText([
      /^Filtrar/,
      /^Ações/,
      /^Ajustes de leitura/,
    ]);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    // No modo foco o painel sai da tela, e a bandeja oferece o sumário.
    await entrarNoFocoCorrido(page, toque);
  }
  const reticencias = largo ? maisDoFoco(page) : maisDoLeitor(page);
  await apertar(await naBandejaDoFoco(page, /^Sumário/), toque);
  await expect(folha).toBeVisible();
  if (!largo) await expect(menu).toBeHidden();

  // A lista inteira, na ordem da lei, com o nome de cada bloco e o estado em palavras.
  const blocos = folha.getByRole('listitem');
  await expect(blocos.first()).toContainText('TÍTULO I');
  await expect(blocos.first()).toContainText('Do Objeto e da Aplicação da Lei de Execução Penal');
  await expect(blocos.last()).toContainText('Das Disposições Finais e Transitórias');
  expect(await blocos.count(), 'títulos, capítulos e seções da lei inteira').toBeGreaterThan(60);
  // O de agora: marcado em palavras e no atributo, à vista sem rolar a lista e com o foco, para o teclado
  // e o leitor de tela partirem dele.
  const agora = folha.locator('[aria-current="location"]');
  await expect(agora).toHaveCount(1);
  await expect(agora).toContainText('Seção II');
  await expect(agora).toContainText('Dos Direitos');
  await expect(agora).toBeInViewport({ ratio: 1 });
  await expect(agora).toBeFocused();
  const medida = await folha.evaluate((el) => {
    const caixa = el.getBoundingClientRect();
    const raiz = document.documentElement;
    const lista = el.querySelector('.sumario-da-norma');
    const itens = [...el.querySelectorAll('.estrutura-item')];
    return {
      naTela:
        caixa.top >= 0 &&
        caixa.left >= 0 &&
        caixa.bottom <= window.innerHeight &&
        caixa.right <= raiz.clientWidth,
      sobraDeLado: raiz.scrollWidth - raiz.clientWidth,
      sobraDaLista: (lista?.scrollWidth ?? 0) - (lista?.clientWidth ?? 0),
      menorAlvo: Math.min(...itens.map((i) => i.getBoundingClientRect().height)),
      semNome: itens.filter((i) => !i.querySelector('.estrutura-titulo')).length,
    };
  });
  expect(medida.naTela, 'a folha cabe na tela').toBe(true);
  expect(medida.sobraDeLado, 'a página não rola de lado').toBeLessThanOrEqual(0);
  expect(medida.sobraDaLista, 'a lista não rola de lado').toBeLessThanOrEqual(0);
  expect(medida.menorAlvo, 'cada bloco é um alvo de toque').toBeGreaterThanOrEqual(44);
  expect(medida.semNome, 'todo bloco da LEP tem nome').toBe(0);
  await semViolacoes(page);

  // Esc fecha sem sair do lugar (nem do modo foco) e devolve o foco ao "⋯".
  await page.keyboard.press('Escape');
  await expect(folha).toBeHidden();
  await expect(reticencias).toBeFocused();
  if (largo) await expect(page).toHaveURL(/[?&]foco=texto/);
  await expect(art41).toBeVisible();

  // Tocar num bloco fecha a folha e põe o cabeçalho dele no alto da tela.
  await apertar(await naBandejaDoFoco(page, /^Sumário/), toque);
  await expect(folha).toBeVisible();
  const cap3 = folha.getByRole('button', { name: /^CAPÍTULO III Do Trabalho/ });
  await cap3.scrollIntoViewIfNeeded();
  await apertar(cap3, toque);
  await expect(folha).toBeHidden();
  const cabecalho = page.locator('[data-endereco="tit2.cap3"]');
  await expect(cabecalho).toBeVisible();
  await expect(cabecalho).toContainText('CAPÍTULO III');
  await rolagemAssentada(page);
  await expect.poll(async () => Math.abs(await distanciaDoAlto(cabecalho))).toBeLessThan(2);
  await expect(reticencias).toBeFocused();
  if (largo) await expect(page).toHaveURL(/[?&]foco=texto/);
  await semViolacoes(page);
});
