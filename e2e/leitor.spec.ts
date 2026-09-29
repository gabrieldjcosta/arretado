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

test('ler o ECA compilado: redação anterior oculta, com indicador e expansão (9.6)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'eca-compilado', 'ECA');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /ECA/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ECA' })).toBeVisible();

  // O parágrafo único do art. 263 tem uma redação anterior (detectada por heurística): fica no fim.
  const paragrafo = page.locator('[data-endereco="art263.parUnico"]');
  await irAoFim(page, paragrafo);
  const indicador = paragrafo.getByRole('button', {
    name: 'Mostrar 1 redação anterior (texto anterior, oculto)',
  });
  await expect(indicador).toHaveAttribute('aria-expanded', 'false');
  await expect(paragrafo.getByText('Se o ofendido é menor de catorze anos')).toBeVisible();
  await expect(paragrafo.getByText('Se a ofendida é menor de catorze anos')).toHaveCount(0);
  await semViolacoes(page);

  await indicador.click();
  const anterior = paragrafo.getByRole('list', { name: 'Texto anterior' });
  await expect(anterior).toContainText('Se a ofendida é menor de catorze anos');
  await expect(anterior).toContainText('(a confirmar)');
  await expect(
    paragrafo.getByRole('button', { name: 'Ocultar 1 redação anterior' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await semViolacoes(page);

  await paragrafo.getByRole('button', { name: 'Ocultar 1 redação anterior' }).click();
  await expect(anterior).toHaveCount(0);
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
