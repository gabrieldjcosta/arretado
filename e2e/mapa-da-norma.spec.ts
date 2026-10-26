import type { Page } from '@playwright/test';
import type { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import { abrirTodasAsNormas, expect, semViolacoes, test } from './apoio';

// O Mapa da norma (AP-04): a norma do acervo ganha a chamada no Leitor e a tela com um quadrado por
// artigo, a legenda, o que a pessoa já cobriu e o próximo trecho. O acervo e os arquivos de
// incidência vêm de fixtures (`page.route`): o teste não depende do que o site publica.

const ID = 'lei-federal-7210-1984';

const no = (
  endereco: string,
  tipo: ItemDoAcervo['nos'][number]['tipo'],
  texto: string,
  rotulo?: string,
  pai?: string,
): ItemDoAcervo['nos'][number] => ({
  endereco,
  categoria: tipo === 'capitulo' || tipo === 'nome' ? 'estrutural' : 'normativo',
  tipo,
  ...(rotulo === undefined ? {} : { rotulo }),
  ...(pai === undefined ? {} : { pai }),
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});

const LEP: ItemDoAcervo = {
  id: ID,
  versao: 1,
  norma: { tituloCurto: 'LEP', tipo: 'Lei', esfera: 'federal' },
  nos: [
    no('cap1', 'capitulo', '', 'CAPÍTULO I'),
    no('cap1.nome', 'nome', 'DO OBJETO E DA APLICAÇÃO', undefined, 'cap1'),
    no(
      'art1',
      'artigo',
      'A execução penal tem por objetivo efetivar as disposições de sentença.',
      'Art. 1º',
      'cap1',
    ),
    no('art1.nome', 'nome', 'Objeto', undefined, 'art1'),
    no(
      'art2',
      'artigo',
      'A jurisdição penal será exercida pelos juízes ou tribunais.',
      'Art. 2º',
      'cap1',
    ),
    no(
      'art3',
      'artigo',
      'Ao condenado serão assegurados todos os direitos não atingidos.',
      'Art. 3º',
      'cap1',
    ),
    no('cap2', 'capitulo', '', 'CAPÍTULO II'),
    no('cap2.nome', 'nome', 'DO CONDENADO', undefined, 'cap2'),
    no('art4', 'artigo', 'O Estado deverá recorrer à cooperação da comunidade.', 'Art. 4º', 'cap2'),
    no(
      'art5',
      'artigo',
      'Os condenados serão classificados segundo os seus antecedentes.',
      'Art. 5º',
      'cap2',
    ),
    no('art6', 'artigo', 'A classificação será feita por Comissão Técnica.', 'Art. 6º', 'cap2'),
    // Mais 34 artigos sem questão: a norma passa da tela, para o "Lido até aqui" ter o que marcar.
    ...Array.from({ length: 34 }, (_, i) =>
      no(
        `art${String(i + 7)}`,
        'artigo',
        `Disposição de número ${String(i + 7)} da lei.`,
        `Art. ${String(i + 7)}`,
        'cap2',
      ),
    ),
  ],
};

const INDICE = {
  versao: 1,
  recortes: [
    {
      id: 'fcc-defensor-sp',
      titulo: 'FCC × Defensor Público (SP)',
      questoes: 829,
      periodo: '2006 a 2026',
      normas: [ID],
    },
  ],
};
const MAPA = {
  versao: 1,
  recorte: 'fcc-defensor-sp',
  norma: ID,
  artigos: [
    ['1', 1, 'alta'],
    ['2', 3, 'altissima'],
    ['3', 0.5, 'media'],
    ['4', 0.2, 'baixa'],
    ['5', 2, 'altissima'],
  ],
};

async function servir(page: Page) {
  const fonte = await FonteEmMemoria.criar([
    { item: LEP, vinculos: [{ disciplina: 'Execução Penal' }] },
  ]);
  const indice = await fonte.listar();
  await page.route('**/acervo/*.json', (rota) => {
    const nome = /\/acervo\/([^/]+)\.json$/.exec(rota.request().url())?.[1] ?? '';
    if (nome === 'indice') return rota.fulfill({ json: indice });
    return nome === ID
      ? rota.fulfill({ json: LEP })
      : rota.fulfill({ status: 404, body: 'não encontrado' });
  });
  await page.route('**/incidencia/**', (rota) => {
    const url = rota.request().url();
    if (url.endsWith('/incidencia/indice.json')) return rota.fulfill({ json: INDICE });
    if (url.endsWith(`/incidencia/fcc-defensor-sp/${ID}.json`)) return rota.fulfill({ json: MAPA });
    return rota.fulfill({ status: 404, body: 'não encontrado' });
  });
}

async function adicionarEAbrir(page: Page) {
  await servir(page);
  await page.goto('/#/biblioteca/acervo');
  await page.getByRole('button', { name: /^LEP/ }).click();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await expect(page.getByText(/1 adicionada\./)).toBeVisible();
  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  await abrirTodasAsNormas(page);
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
}

test('mapa: a chamada no Leitor, os quadrados por faixa, o próximo trecho e a volta ao texto', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await adicionarEAbrir(page);
  await page.getByRole('link', { name: 'Mapa da norma' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mapa da norma' })).toBeVisible();
  await expect(
    page.getByText('FCC × Defensor Público (SP) · 829 questões lidas · 2006 a 2026'),
  ).toBeVisible();
  await expect(page.locator('.mapa-resumo')).toHaveText(
    '3 dos 40 artigos concentram 90% do que caiu neste recorte.',
  );

  const grade = page.getByRole('group', { name: /Mapa dos 40 artigos/ });
  const quadrados = grade.getByRole('button');
  await expect(quadrados).toHaveCount(40);
  await expect(quadrados.nth(1)).toHaveAttribute('data-classe', 'altissima');
  await expect(quadrados.nth(1)).toHaveAttribute('data-proximo', '');
  await expect(quadrados.nth(2)).toHaveAttribute('data-classe', 'media');
  await expect(quadrados.nth(5)).toHaveAttribute('data-classe', 'sem');
  await expect(quadrados.nth(5)).toHaveAccessibleName('Art. 6º, sem questão');

  // Nenhum quadrado passa da tela, em nenhum aparelho (320 px inclusive, abaixo).
  const largura = await page.evaluate(() => document.documentElement.clientWidth);
  for (const caixa of await quadrados.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().right),
  )) {
    expect(caixa).toBeLessThanOrEqual(largura);
  }

  // O próximo trecho: o primeiro "cai muito" livre (art. 2º), só ele (o 3º é "cai às vezes").
  const agora = page.getByRole('region', { name: 'Agora' });
  await expect(agora.getByRole('heading', { name: 'Ler art. 2º' })).toBeVisible();
  await expect(agora).toContainText('Do objeto e da aplicação · cai muito');
  await expect(agora).toContainText('cerca de 1 min');
  await semViolacoes(page);

  // Tocar num quadrado lê o artigo em palavras, com a rubrica dele.
  await quadrados.nth(0).click();
  await expect(page.getByRole('status')).toHaveText(/Art\. 1º · Objeto · cai\s*Ler/);
  // As setas percorrem; Enter no quadrado escolhe.
  await page.keyboard.press('ArrowRight');
  await expect(quadrados.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Art. 2º · cai muito');

  // "Começar" leva ao Leitor, no artigo do trecho.
  await agora.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.locator('[data-endereco="art2"]')).toBeVisible();
});

test('mapa: no Hoje, abaixo de "Continuar a leitura", o trecho que mais cai leva ao Leitor', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await adicionarEAbrir(page);
  // Põe o art. 3º perto do alto e espera a posição ser guardada: o Hoje passa a ter leitura salva.
  await page.locator('[data-endereco="art3"]').evaluate((el) => {
    window.scrollBy(0, el.getBoundingClientRect().top - 140);
  });
  await page.waitForTimeout(1200);
  // No celular o Leitor não tem a barra com o "Hoje": vai-se pela rota.
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  const agora = page.getByRole('region', { name: 'Agora' });
  await expect(agora.getByRole('heading', { name: 'Continuar a leitura' })).toBeVisible();
  // Nada coberto ainda ("Lido até aqui" não foi tocado): o primeiro "cai muito" é o art. 2º.
  const linha = page.locator('.agora-no-mapa');
  await expect(linha).toContainText('Agora no mapa: cai muito, uns 1 min.');
  const caixa = await linha.getByRole('link', { name: 'Ler art. 2º' }).boundingBox();
  expect(caixa?.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText(/atrasad|pendente|dívida|faltam/i)).toHaveCount(0);
  await semViolacoes(page);
  await linha.getByRole('link', { name: 'Ler art. 2º' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.locator('[data-endereco="art2"]')).toBeInViewport();
});

test.describe('sem rede', () => {
  // Os pedidos abortados viram "Failed to load resource" no console: é o que se testa.
  test.use({ permitirFalhasConsole: true });

  test('mapa: a cobertura soma o "lido até" e a marca, e o mapa abre sem rede depois do primeiro download', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await adicionarEAbrir(page);
    // "Lido até aqui" marca o dispositivo no alto da tela: leva-se o art. 5º ao alto antes.
    await page.locator('[data-endereco="art5"]').evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
    });
    await page.getByRole('button', { name: 'Lido até aqui' }).click();
    await expect(page.locator('.lido-ate')).toContainText(/Lido até Art\. [4-6]º/);
    await page.getByRole('link', { name: 'Mapa da norma' }).click();
    const grade = page.getByRole('group', { name: /Mapa dos 40 artigos/ });
    await expect(grade.getByRole('button').nth(0)).toHaveAccessibleName(
      'Art. 1º, cai, você já cobriu',
    );
    await expect(grade.getByRole('button').nth(0)).toHaveAttribute('data-coberto', '');
    // Do art. 1º ao marcado, tudo coberto: pela massa, entre 4,5 e 6,7 de 6,7.
    await expect(grade.getByRole('button').nth(2)).toHaveAttribute('data-coberto', '');
    await expect(page.locator('.mapa-resumo')).toContainText(/Você cobriu (67|70|100)%/);

    // Sem rede: o que veio da rede ficou guardado no aparelho e o mapa continua inteiro.
    await page.unroute('**/incidencia/**');
    await page.route('**/incidencia/**', (rota) => rota.abort());
    await page.reload();
    await expect(
      page
        .getByRole('group', { name: /Mapa dos 40 artigos/ })
        .getByRole('button')
        .nth(1),
    ).toHaveAttribute('data-classe', 'altissima');
    await expect(page.getByText(/Sem rede para baixar/)).toHaveCount(0);
  });
});

test('mapa: a 320 px nada rola na horizontal e os alvos têm pelo menos 24 px', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', 'o tamanho da janela é do teste; basta um projeto');
  test.setTimeout(120_000);
  await adicionarEAbrir(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('link', { name: 'Mapa da norma' }).click();
  const grade = page.getByRole('group', { name: /Mapa dos 40 artigos/ });
  await expect(grade.getByRole('button')).toHaveCount(40);
  const medidas = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
    lados: [...document.querySelectorAll('.mapa-grade .mapa-quadrado')].map((el) => {
      const r = el.getBoundingClientRect();
      return Math.min(r.width, r.height);
    }),
  }));
  expect(medidas.largura).toBeLessThanOrEqual(medidas.tela);
  for (const lado of medidas.lados) expect(lado).toBeGreaterThanOrEqual(24);
});
