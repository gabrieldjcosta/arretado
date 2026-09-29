import type { Locator, Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

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
  expect(await recuoDe('art2')).toBe(0);
  expect(await recuoDe('art2.parUnico')).toBeGreaterThan(0);

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

  await page.getByRole('button', { name: /aumentar o texto/ }).click();
  await expect(page.getByLabel('Tamanho atual do texto')).toHaveText('20 px');
  await expect.poll(tamanho).toBe(20);
  expect((await artigo.boundingBox())?.height ?? 0).toBeGreaterThan(alturaAntes);

  await page.reload();
  await expect(artigo).toBeVisible();
  await expect.poll(tamanho).toBe(20);
  // O mesmo valor de Conta › Aparência.
  await page.goto('/#/conta/aparencia');
  await expect(page.getByText('Tamanho do texto de leitura: 20 px')).toBeVisible();
});

test('ler o ECA com todas as redações: revogado em uma linha, redação anterior oculta, com indicador (8.6)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'eca', 'ECA');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /ECA/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ECA' })).toBeVisible();

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

test('ler a LEP com todas as redações: 100% das redações anteriores ocultas, cada uma num indicador (8.6)', async ({
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
        fim: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      };
    });
    expect(vistos.abertos).toBe(0);
    for (const [endereco, n] of vistos.indicadores) indicadores.set(endereco, n);
    for (const endereco of vistos.revogados) revogados.add(endereco);
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

/** Da linha do dispositivo até o fim da barra fixa (`.topo`): 0 quando ele está no alto da tela. */
function distanciaDoAlto(alvo: Locator) {
  return alvo.first().evaluate((el) => {
    const linha = el.closest('.linha-leitor') ?? el;
    const barra = document.querySelector('.topo')?.getBoundingClientRect().bottom ?? 0;
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

test('sair e voltar na mesma posição, com "Continuar leitura" e "lido até": LEP compilada (9.7)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  const normas = page.getByRole('region', { name: 'Normas' });
  const continuar = page.getByRole('link', { name: 'Continuar leitura: LEP' });
  await expect(continuar).toHaveCount(0);
  await normas.getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();

  // Sai pela navegação das áreas (sempre à vista) com o art. 41 no alto da tela.
  const art41 = page.locator('[data-endereco="art41"]');
  await rolarAte(page, art41);
  await alinharNoAlto(page, art41);
  await page.getByRole('link', { name: 'Biblioteca', exact: true }).click();
  await expect(continuar).toBeVisible();
  await expect(normas.getByRole('link', { name: /LEP/ })).toContainText('Última leitura:');
  expect(await leituraGravada(page)).toEqual({ quantas: 1, posicao: 'art41', lidoAte: undefined });
  await semViolacoes(page);

  // "Continuar leitura" abre no art. 41, logo abaixo da barra fixa.
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
