import type { Page } from '@playwright/test';
import {
  animacoesVistas,
  expect,
  importarEPublicar,
  irAoRegistroPeloMais,
  registrarAnimacoes,
  semViolacoesNoFio,
  test,
} from './apoio';

// O Varal, o folheto e o Caderno de Frases do Arretado novo (prévia do Fio): as telas `varal` e `folheto` do mockup aprovado
// e a folha `folha-caderno`, com as folhas que sobem (Organizar, o que fazer com a linha, o Caderno). O jsdom não mede
// layout, cor nem tempo; aqui o navegador confere que as telas cabem (360 e 1280), passam no axe e na medida de contraste
// dos pixels nos dois mundos, que as folhas sobem, prendem o foco e fecham de todo jeito (Escape, alça, véu, arrasto), que
// segurar a linha abre a folha sem abrir a norma, que "Escolher vários" tira em lote com "Desfazer", que a busca acha
// norma, artigo e Frase, e que o Varal se mexe como o mockup (folhetos, linhas, folhas, fio, Frases).

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/**
 * Duas Frases pelos caminhos do app de antes: uma tirada da lei (o Leitor, "Enviar às frases") e, depois, uma de um erro (o
 * "+", "Registrar erro"). O trecho da lei é selecionado pelo DOM, como o toque longo do Android o faria. A do erro é a mais
 * nova; a da lei tem o "Ler na lei". Começa na lista da Biblioteca com a LEP guardada.
 */
const FRASE_DA_LEI = 'A pena só avança no prazo que a lei marca.';
const FRASE_DO_ERRO = 'Livramento exige os requisitos do art. 83 do CP.';
async function guardarAsFrases(page: Page) {
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  // O primeiro termo que o app acende na lei (um prazo, uma condição) e o dispositivo onde ele está.
  const termo = page.locator('.texto-vigente .destaque').first();
  await expect(termo).toBeVisible();
  await termo.evaluate((el) => {
    const no = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
    if (!no) throw new Error('o termo aceso não tem texto');
    const faixa = document.createRange();
    faixa.selectNodeContents(no);
    const selecao = document.getSelection();
    selecao?.removeAllRanges();
    selecao?.addRange(faixa);
  });
  const acoes = page.getByRole('group', { name: 'Marcar o trecho selecionado' });
  await acoes.getByRole('button', { name: 'Enviar às frases' }).click();
  const envio = page.getByRole('dialog', { name: 'Enviar às frases' });
  await expect(envio).toBeVisible();
  await envio.getByRole('textbox', { name: 'Frase' }).fill(FRASE_DA_LEI);
  await envio.getByRole('button', { name: 'Enviar' }).click();
  await expect(envio).toBeHidden();

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await irAoRegistroPeloMais(page);
  await page.getByLabel('Frase correta').fill(FRASE_DO_ERRO);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
}

/**
 * A LEP e a ECA importadas e guardadas, e a prévia ligada. Com `comEdital`, a prova pelo CSV (o Agora ganha o fio); com
 * `comFrases`, as duas Frases de `guardarAsFrases`.
 */
async function prepararOVaral(
  page: Page,
  opcoes: { comEdital?: boolean; soLep?: boolean; comFrases?: boolean } = {},
) {
  if (opcoes.comEdital) {
    await page.goto('/#/plano');
    await page.getByRole('button', { name: 'Trazer meu edital' }).click();
    await page.getByLabel('Arquivo CSV').setInputFiles({
      name: 'ciclo.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV, 'utf8'),
    });
    await page.getByRole('button', { name: 'Importar pontos' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  }
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  if (!opcoes.soLep) await importarEPublicar(page, 'eca-compilado', 'ECA');
  if (opcoes.comFrases) await guardarAsFrases(page);
  await page.goto('/#/fio/ligar');
  await expect(nav(page)).toBeVisible();
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Lugares' });
/** O folheto do Varal com esse nome (o nome acessível vem do texto visível: o número, o nome e a linha de estado; desvio 38). */
const folheto = (page: Page, nome: string) =>
  page
    .locator('.m-folheto')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${nome}$`) }) });
const linhas = (page: Page) => page.locator('.m-linha-item');
const nomes = (page: Page) => page.locator('.m-linha-item .m-nome').allTextContents();
const subtitulo = (page: Page) => page.locator('.m-titulo-folheto p');

async function irAoVaral(page: Page) {
  await nav(page).getByRole('button', { name: 'Varal' }).click();
  await expect(page).toHaveURL(/#\/varal$/);
  await expect(page.getByRole('heading', { level: 2, name: /pendurado no fio/ })).toBeVisible();
}

async function irAoFolhetoDasNormas(page: Page, quantas = 2) {
  await irAoVaral(page);
  await folheto(page, 'Normas').click();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await expect(linhas(page)).toHaveCount(quantas);
}

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

/** Cada caixa achada pelo seletor está dentro da largura da tela. */
async function dentroDaLargura(page: Page, seletor: string, largura: number) {
  const caixas = await page.locator(seletor).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, direita: r.right, largura: r.width };
    }),
  );
  expect(caixas.length, seletor).toBeGreaterThan(0);
  for (const c of caixas) {
    expect(c.x, seletor).toBeGreaterThanOrEqual(0);
    expect(c.direita, seletor).toBeLessThanOrEqual(largura);
  }
}

interface Caixa {
  x: number;
  direita: number;
  y: number;
  baixo: number;
}

/** As caixas do primeiro elemento de cada seletor, medidas juntas: medir uma a uma, com a tela ainda assentando, mistura momentos. */
async function caixas(page: Page, seletores: readonly string[]): Promise<Caixa[]> {
  const medidas = await page.evaluate(
    (lista) =>
      lista.map((seletor) => {
        const el = document.querySelector(seletor);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, direita: r.right, y: r.top, baixo: r.bottom };
      }),
    seletores,
  );
  return medidas.map((c, i) => {
    if (!c) throw new Error(`Não achei ${seletores[i] ?? ''}`);
    return c;
  });
}

/** O foco está dentro da folha aberta? */
const focoNaFolha = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null);

test('o Varal e o folheto das Normas cabem em 360 e em 1280, passam no axe e na medida de contraste dos pixels, nos dois mundos', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page);
  await irAoVaral(page);
  await expect(page.locator('.m-folheto')).toHaveCount(6);
  await expect(page.getByRole('searchbox', { name: 'Buscar no Varal' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Varal' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  for (const [w, h] of [
    [360, 740],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect(page.locator('.m-folheto').first()).toBeVisible();
    await dentroDaLargura(page, '.m-folheto, .m-busca-varal', w);
    await semRolagemLateral(page);
    await semViolacoesNoFio(page);
  }

  // O número miúdo e a linha de estado vêm do que a pessoa guardou: duas normas.
  await expect(folheto(page, 'Normas').locator('.m-conta-f')).toHaveText('2');

  await folheto(page, 'Normas').click();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await expect(linhas(page)).toHaveCount(2);
  await expect(page.getByRole('heading', { level: 2, name: 'Normas' })).toBeVisible();
  await expect(subtitulo(page)).toHaveText('2 · o que mais cai');
  await expect(nav(page).getByRole('button', { name: 'Varal' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  for (const [w, h] of [
    [360, 740],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect(linhas(page).first()).toBeVisible();
    await dentroDaLargura(
      page,
      '.m-linha-item .m-abre, .m-linha-item .m-mais, .m-organizar, .m-pe-folheto button',
      w,
    );
    await semRolagemLateral(page);
    // O título e o "Organizar" não se cobrem; o texto da linha termina antes do "⋯", que a linha reserva (desvio 39).
    const [titulo, organizar, sec, mais] = await caixas(page, [
      '.m-titulo-folheto h2',
      '.m-organizar',
      '.m-linha-item .m-sec',
      '.m-linha-item .m-mais',
    ]);
    expect(titulo?.direita).toBeLessThanOrEqual(organizar?.x ?? 0);
    expect(sec?.direita).toBeLessThanOrEqual(mais?.x ?? 0);
    await semViolacoesNoFio(page);
  }
});

test('o folheto vazio das Súmulas e teses diz uma frase, oferece um botão e passa no axe e no contraste', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page, { soLep: true });
  await irAoVaral(page);
  await folheto(page, 'Súmulas e teses').click();
  await expect(page).toHaveURL(/#\/varal\/sumulas$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Súmulas e teses' })).toBeVisible();
  await expect(
    page.getByText(
      'Nenhuma súmula ou tese no Varal por enquanto. Puxe do acervo para pendurar aqui.',
    ),
  ).toBeVisible();
  for (const [w, h] of [
    [360, 740],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await dentroDaLargura(page, '.m-vazio-folheto .m-acao', w);
    await semRolagemLateral(page);
    await semViolacoesNoFio(page);
  }
  await page.getByRole('button', { name: 'Adicionar do acervo' }).click();
  await expect(page).toHaveURL(/#\/biblioteca\/acervo\?tipo=sumulas$/);
});

test('as folhas sobem, prendem o foco, trancam o fundo, passam no axe e fecham com Escape, com a alça, com o véu e arrastando', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await irAoFolhetoDasNormas(page);
  expect(await nomes(page)).toEqual(['ECA', 'LEP']);

  // Organizar: sobe, o foco entra nela, o fundo fica trancado e o Tab não sai dela.
  const organizar = page.getByRole('button', { name: /^Organizar/ });
  await organizar.click();
  const folha = page.getByRole('dialog', { name: 'Do seu jeito' });
  await expect(folha).toBeVisible();
  await expect.poll(() => focoNaFolha(page)).toBe(true);
  await expect(page.locator('.m-nav')).toHaveAttribute('inert', '');
  await expect(page.locator('[data-tela="folheto"]')).toHaveAttribute('inert', '');
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    expect(await focoNaFolha(page), `Tab ${String(i + 1)}`).toBe(true);
  }
  // A folha cabe na tela: embaixo e sem passar das bordas.
  const corpo = await folha.locator('.m-corpo').boundingBox();
  expect(corpo).not.toBeNull();
  expect((corpo?.x ?? -1) + (corpo?.width ?? 0)).toBeLessThanOrEqual(360);
  expect((corpo?.y ?? -1) + (corpo?.height ?? 0)).toBeLessThanOrEqual(740 + 1);
  await semViolacoesNoFio(page);

  // Os chips mexem na lista e acendem a bolinha do "Organizar".
  await expect(page.locator('.m-marca-org')).toHaveCount(0);
  await folha.getByRole('group', { name: 'Ordem' }).getByRole('button', { name: 'Nome' }).click();
  await expect(
    folha.getByRole('group', { name: 'Ordem' }).getByRole('button', { name: 'Nome' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(subtitulo(page)).toHaveText('2 · nome');
  await expect(page.locator('.m-marca-org')).toHaveCount(1);
  await folha.getByRole('switch', { name: /Agrupar por disciplina/ }).click();
  await expect(page.locator('.m-grupo-folheto')).toHaveCount(1);
  await expect(page.locator('.m-grupo-folheto')).toHaveText('Outros');
  await folha.getByRole('switch', { name: /Agrupar por disciplina/ }).click();
  await expect(page.locator('.m-grupo-folheto')).toHaveCount(0);

  // Escape fecha, o fundo destranca e o foco volta ao "Organizar".
  await page.keyboard.press('Escape');
  await expect(folha).toBeHidden();
  await expect(page.locator('.m-nav')).not.toHaveAttribute('inert', '');
  await expect(organizar).toBeFocused();

  // A folha de uma linha: "Fixar no alto" sobe a linha e a marca.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  const acoes = page.getByRole('dialog', { name: 'LEP' });
  await expect(acoes).toBeVisible();
  await expect.poll(() => focoNaFolha(page)).toBe(true);
  // A última ação é a que tira do varal, pintada de vermelho como no mockup.
  await expect(acoes.locator('button').last()).toHaveText('Tirar do varal');
  await semViolacoesNoFio(page);
  await acoes.getByRole('button', { name: 'Fixar no alto' }).click();
  await expect(acoes).toBeHidden();
  await expect.poll(() => nomes(page)).toEqual(['LEP', 'ECA']);
  await expect(linhas(page).first().locator('.m-fixo')).toBeVisible();

  // A alça fecha.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  await expect(acoes).toBeVisible();
  await acoes.getByRole('button', { name: 'Fechar' }).click();
  await expect(acoes).toBeHidden();

  // O véu (o toque fora da folha) fecha.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  await expect(acoes).toBeVisible();
  await page.locator('.m-folha').click({ position: { x: 180, y: 40 } });
  await expect(acoes).toBeHidden();

  // Arrastar a folha para baixo (mais de 90 px) fecha; um arrasto curto volta para o lugar.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  await expect(acoes).toBeVisible();
  // A folha sobe em 400 ms: só depois de assentar o título está onde se vai apertar (antes, o toque cairia num botão).
  const assentada = () =>
    expect
      .poll(() => acoes.locator('.m-corpo').evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await assentada();
  const titulo = await acoes.getByRole('heading', { name: 'LEP' }).boundingBox();
  expect(titulo).not.toBeNull();
  const x = (titulo?.x ?? 0) + 20;
  const y = (titulo?.y ?? 0) + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 50, { steps: 5 });
  await page.mouse.up();
  await expect(acoes).toBeVisible();
  await assentada();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 220, { steps: 8 });
  await page.mouse.up();
  await expect(acoes).toBeHidden();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
});

test('segurar a linha abre o que fazer com ela sem abrir a norma; tocar abre o Leitor', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page);
  await irAoFolhetoDasNormas(page);

  const abre = linhas(page).first().locator('.m-abre');
  const caixa = await abre.boundingBox();
  expect(caixa).not.toBeNull();
  const cx = (caixa?.x ?? 0) + (caixa?.width ?? 0) / 2;
  const cy = (caixa?.y ?? 0) + (caixa?.height ?? 0) / 2;

  // Um toque curto não é segurar: nenhuma folha, e a norma abre.
  // Segurar por 700 ms (o mockup abre aos 520): a folha sobe e a norma não abre.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'ECA' })).toBeVisible();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Tocar (sem segurar) abre a norma no Leitor, e voltar traz o folheto de volta.
  await abre.click();
  await expect(page).toHaveURL(/#\/biblioteca\/normas\//);
  await page.goBack();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await expect(linhas(page)).toHaveCount(2);

  // O botão direito faz o mesmo que segurar (quem usa o mouse não tem o dedo parado).
  await abre.click({ button: 'right' });
  await expect(page.getByRole('dialog', { name: 'ECA' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('"Escolher vários" marca as linhas, o pé cabe em 360 e "Tirar do varal" tem "Desfazer"', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await irAoFolhetoDasNormas(page);

  await page.getByRole('button', { name: /^Organizar/ }).click();
  await page
    .getByRole('dialog', { name: 'Do seu jeito' })
    .getByRole('button', { name: 'Escolher vários' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(subtitulo(page)).toHaveText('0 escolhidos');
  await expect(page.locator('.m-linha-item.m-escolhendo')).toHaveCount(2);
  await expect(page.locator('.m-linha-item .m-mais')).toHaveCount(0);

  // Marcar e desmarcar: a caixa acende e o subtítulo conta.
  const lep = linhas(page).filter({ hasText: 'LEP' }).locator('.m-abre');
  await lep.click();
  await expect(lep).toHaveAttribute('aria-pressed', 'true');
  await expect(linhas(page).filter({ hasText: 'LEP' })).toHaveClass(/m-escolhido/);
  await expect(subtitulo(page)).toHaveText('1 escolhido');

  // Os três botões do pé cabem lado a lado em 360, sem se cobrir.
  const rotulos = ['Mudar disciplina', 'Tirar do varal', 'Pronto'];
  const caixas = [];
  for (const rotulo of rotulos) {
    const caixa = await page
      .locator('.m-pe-folheto')
      .getByRole('button', { name: rotulo })
      .boundingBox();
    expect(caixa, rotulo).not.toBeNull();
    caixas.push(caixa);
  }
  for (const [i, c] of caixas.entries()) {
    expect((c?.x ?? -1) + (c?.width ?? 0), rotulos[i]).toBeLessThanOrEqual(360);
    if (i > 0) {
      const antes = caixas[i - 1];
      const mesmaLinha = Math.abs((antes?.y ?? 0) - (c?.y ?? 0)) < 4;
      if (mesmaLinha)
        expect((antes?.x ?? 0) + (antes?.width ?? 0), rotulos[i]).toBeLessThanOrEqual(c?.x ?? 0);
    }
  }
  await semViolacoesNoFio(page);

  // Tirar do varal: a linha some, o aviso traz "Desfazer", e o Desfazer a devolve.
  await page.locator('.m-pe-folheto').getByRole('button', { name: 'Tirar do varal' }).click();
  await expect(page.locator('.m-toast.m-on')).toContainText('LEP saiu do varal.');
  await expect.poll(() => nomes(page)).toEqual(['ECA']);
  await expect(page.locator('.m-linha-item.m-escolhendo')).toHaveCount(0);
  await page.locator('.m-toast').getByRole('button', { name: 'Desfazer' }).click();
  await expect.poll(() => nomes(page)).toEqual(['ECA', 'LEP']);

  // "Mostrar as que tirei": tira de novo pela folha da linha e traz a linha de volta, marcada.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  await page
    .getByRole('dialog', { name: 'LEP' })
    .getByRole('button', { name: 'Tirar do varal' })
    .click();
  await expect.poll(() => nomes(page)).toEqual(['ECA']);
  await page.getByRole('button', { name: /^Organizar/ }).click();
  await page
    .getByRole('dialog', { name: 'Do seu jeito' })
    .getByRole('switch', { name: /Mostrar as que tirei/ })
    .click();
  await expect.poll(() => nomes(page)).toEqual(['ECA', 'LEP']);
  await expect(linhas(page).filter({ hasText: 'LEP' }).locator('.m-sec')).toContainText(
    'tirada do varal',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await semViolacoesNoFio(page);
});

test('a busca única do alto do Varal acha a norma pelo nome e o artigo por "art. 112 LEP"', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page, { soLep: true });
  await irAoVaral(page);
  const busca = page.getByRole('searchbox', { name: 'Buscar no Varal' });

  await busca.fill('lep');
  const achados = page.getByRole('region', { name: 'O que o Varal achou' });
  await expect(achados.getByRole('button', { name: /^LEP/ })).toBeVisible();
  await expect(page.locator('.m-varal')).toBeHidden();
  await semViolacoesNoFio(page);

  await busca.fill('112 lep');
  const artigo = achados.getByRole('button', { name: /^LEP, art\. 112/ });
  await expect(artigo).toBeVisible();
  await expect(artigo).toContainText('abre no Leitor');
  await artigo.click();
  await expect(page).toHaveURL(/#\/biblioteca\/normas\/[^?]+\?ir=/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/varal$/);

  // Apagar a busca traz os dois fios de volta.
  await page.getByRole('searchbox', { name: 'Buscar no Varal' }).fill('zzzz');
  await expect(page.getByText(/Nada achado para “zzzz”/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar no Varal' }).fill('');
  await expect(page.locator('.m-varal')).toBeVisible();
});

test('o fio voa do Agora ao Varal e de volta, sem deixar fio nem fantasma no quadro, e o Varal aceso volta do folheto ao Varal', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await prepararOVaral(page, { comEdital: true, soLep: true });
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

  await nav(page).getByRole('button', { name: 'Varal' }).click();
  await expect(page).toHaveURL(/#\/varal$/);
  await expect(page.locator('.m-folheto')).toHaveCount(6);
  // O fio pendurado do Agora vai até o primeiro fio do Varal: um voo, que acaba sozinho.
  await expect.poll(voos).toBe(1);
  await expect(page.locator('.m-voo-fio')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator('.m-saindo')).toHaveCount(0);
  await expect(page.locator('.m-tela')).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator('.m-varal-linha')
        .first()
        .locator('.m-varal-fio path')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .not.toBe('0');

  // E de volta ao Agora: o fio do Varal vai até o pendurado.
  await nav(page).getByRole('button', { name: 'Agora' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect.poll(voos).toBe(2);
  await expect(page.locator('.m-voo-fio')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator('.m-tela')).toHaveCount(1);

  // Do folheto, o Varal aceso leva de volta ao Varal (não há fio para voar: só troca de tela).
  await irAoFolhetoDasNormas(page, 1);
  await nav(page).getByRole('button', { name: 'Varal' }).click();
  await expect(page).toHaveURL(/#\/varal$/);
  await expect(page.getByRole('heading', { level: 2, name: /pendurado no fio/ })).toBeVisible();
  await expect(page.locator('.m-tela')).toHaveCount(1, { timeout: 5_000 });
});

test('o Varal se mexe como o mockup: os folhetos descem do fio com a mola, as linhas descem uma a uma e a folha sobe em 460 ms', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await registrarAnimacoes(page);
  await prepararOVaral(page);
  await irAoVaral(page);
  await expect(page.locator('.m-folheto')).toHaveCount(6);

  const doVaral = (await animacoesVistas(page)).filter(
    (a) => a.classes.includes('folheto') && a.duracao === 600,
  );
  // Seis folhetos, 600 ms, 70 ms entre um e outro, com a mola (o `animar` da `varal` do mockup).
  expect(doVaral.map((a) => a.atraso)).toEqual([0, 70, 140, 210, 280, 350]);
  expect(new Set(doVaral.map((a) => a.easing))).toEqual(new Set(['cubic-bezier(.34,1.56,.64,1)']));

  await folheto(page, 'Normas').click();
  await expect(linhas(page)).toHaveCount(2);
  const dasLinhas = (await animacoesVistas(page)).filter(
    (a) => a.classes.includes('linha-item') && a.duracao === 380,
  );
  // As linhas descem 10 px, 380 ms, 80 ms de espera e 40 a mais por linha (o `listarFolheto(true)` do mockup).
  expect(dasLinhas.map((a) => a.atraso)).toEqual([80, 120]);
  expect(new Set(dasLinhas.map((a) => a.easing))).toEqual(new Set(['cubic-bezier(.2,.7,.2,1)']));

  // A folha sobe com a mola em 460 ms (o véu em 300 ms) e desce em 300 ms.
  await page.getByRole('button', { name: 'Mais ações de LEP' }).click();
  await expect(page.getByRole('dialog', { name: 'LEP' })).toBeVisible();
  const vistas = await animacoesVistas(page);
  const corpo = vistas.filter((a) => a.classes.includes('corpo') && a.duracao === 460);
  expect(corpo).toHaveLength(1);
  expect(corpo[0]?.easing).toBe('cubic-bezier(.2,.7,.2,1)');
  expect(corpo[0]?.props).toBe('offset,transform');
  const veu = vistas.filter((a) => a.classes.includes('folha') && a.duracao === 300);
  expect(veu.length).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const depois = await animacoesVistas(page);
  const desce = depois.filter(
    (a) =>
      a.classes.includes('corpo') && a.duracao === 300 && a.easing === 'cubic-bezier(.4,0,1,1)',
  );
  expect(desce).toHaveLength(1);
});

interface Subida {
  toque?: number;
  folha?: number;
}

/** O Caderno de Frases aberto pelo folheto "Frases" (o Varal, com as duas Frases guardadas). */
async function abrirOCaderno(page: Page) {
  await irAoVaral(page);
  await expect(folheto(page, 'Frases').locator('.m-conta-f')).toHaveText('2');
  // Anota quando o toque chega e quando a folha entra no quadro (`msAteAFolhaSubir`).
  await page.evaluate(() => {
    const w = window as unknown as { __subida: Subida };
    w.__subida = {};
    document.addEventListener(
      'click',
      () => {
        w.__subida.toque = performance.now();
      },
      { capture: true, once: true },
    );
    new MutationObserver((registros) => {
      for (const r of registros) {
        for (const n of r.addedNodes) {
          if (n instanceof Element && n.matches('[role="dialog"]'))
            w.__subida.folha ??= performance.now();
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await folheto(page, 'Frases').click();
  const caderno = page.getByRole('dialog', { name: 'Suas Frases certas' });
  await expect(caderno).toBeVisible();
  await expect(caderno.getByRole('listitem')).toHaveCount(2);
  return caderno;
}

/**
 * Quantos ms passam do toque até a folha entrar no quadro. Com um `lazy` e um `Suspense` no caminho, o React segura a
 * revelação por 300 ms (o jsdom não vê isso: lá tudo resolve no mesmo tique); sem eles, é na hora.
 */
async function msAteAFolhaSubir(page: Page): Promise<number> {
  const { toque, folha } = await page.evaluate(
    () => (window as unknown as { __subida: Subida }).__subida,
  );
  if (toque === undefined || folha === undefined) throw new Error('a folha não entrou no quadro');
  return folha - toque;
}

test('o Caderno de Frases sobe como folha, cabe em 360 e em 1280, passa no axe e no contraste dos pixels nos dois mundos, e "Ler na lei" abre o artigo', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page, { soLep: true, comFrases: true });
  await page.setViewportSize({ width: 360, height: 740 });
  const caderno = await abrirOCaderno(page);
  // Sem sair do Varal; o foco entra na folha; o resto do quadro fica trancado.
  await expect(page).toHaveURL(/#\/varal$/);
  await expect.poll(() => focoNaFolha(page)).toBe(true);
  await expect(page.locator('.m-nav')).toHaveAttribute('inert', '');

  // A mais nova primeiro: a do erro (sem artigo, sem "Ler na lei"), depois a da lei.
  const itens = caderno.locator('.m-frase-item');
  await expect(itens.nth(0).locator('.m-texto')).toHaveText(FRASE_DO_ERRO);
  // Só a mais nova acende a borda (a que acabou de entrar), mesmo que a outra também seja de hoje.
  await expect(itens.nth(0)).toHaveClass(/m-nova/);
  await expect(itens.nth(1)).not.toHaveClass(/m-nova/);
  await expect(itens.nth(0).locator('.m-meta')).toHaveText(/^De um erro · volta amanhã$/);
  await expect(itens.nth(0).getByRole('button')).toHaveCount(0);
  await expect(itens.nth(1).locator('.m-texto')).toHaveText(FRASE_DA_LEI);
  await expect(itens.nth(1).locator('.m-meta')).toHaveText(/^Da lei · LEP, .+ · volta amanhã$/);

  for (const [w, h] of [
    [360, 740],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect(itens.first()).toBeVisible();
    await dentroDaLargura(
      page,
      '.m-folha .m-corpo, .m-frase-item, .m-fim-folha .m-lista-completa',
      w,
    );
    await semRolagemLateral(page);
    // O corpo da folha cabe na tela, embaixo.
    const corpo = await caderno.locator('.m-corpo').boundingBox();
    expect((corpo?.y ?? -1) + (corpo?.height ?? 0)).toBeLessThanOrEqual(h + 1);
    await semViolacoesNoFio(page);
  }

  // "Ler na lei": abre o artigo com os trechos que o app grifa, e ele também passa no axe e no contraste.
  const ler = itens.nth(1).getByRole('button', { name: 'Ler na lei' });
  await expect(ler).toHaveAttribute('aria-expanded', 'false');
  await expect(caderno.locator('.m-lei')).toBeHidden();
  await ler.click();
  await expect(ler).toHaveAttribute('aria-expanded', 'true');
  const lei = itens.nth(1).locator('.m-lei');
  await expect(lei).toBeVisible();
  // A folha tem altura fixa: o artigo que abre embaixo da Frase rola até a vista, inteiro.
  await expect(lei).toBeInViewport({ ratio: 1 });
  await expect(lei.locator('.m-art')).toContainText('LEP, ');
  expect(await lei.locator('.m-grifo').count()).toBeGreaterThan(0);
  for (const [w, h] of [
    [360, 740],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect(lei).toBeVisible();
    await dentroDaLargura(page, '.m-frase-item .m-lei, .m-frase-item .m-lei p', w);
    await semRolagemLateral(page);
    await semViolacoesNoFio(page);
  }
  await ler.click();
  await expect(lei).toBeHidden();

  // Escape fecha a folha, o fundo destranca e o foco volta ao folheto de onde ela subiu.
  await page.keyboard.press('Escape');
  await expect(caderno).toBeHidden();
  await expect(page.locator('.m-nav')).not.toHaveAttribute('inert', '');
  await expect(folheto(page, 'Frases')).toBeFocused();
  await expect(page).toHaveURL(/#\/varal$/);

  // A lista de antes está a um toque: "Abrir a lista completa" desce a folha e leva a ela.
  await folheto(page, 'Frases').click();
  await expect(caderno).toBeVisible();
  await caderno.getByRole('button', { name: 'Abrir a lista completa' }).click();
  await expect(page).toHaveURL(/#\/recall\/frases$/);
  await expect(page.getByRole('link', { name: FRASE_DO_ERRO, exact: true })).toBeVisible();
});

/** Onde termina o título do Varal, medido do alto do quadro (100 px), mais a folga que o teto da folha deixa (`ajustes.css`, desvio 41). */
const FOLGA_ATE_O_TITULO = 112;

test('a folha do Caderno cresce como a do mockup, mas nunca passa do título do Varal; no teto o conteúdo rola dentro dela', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page, { soLep: true, comFrases: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const caderno = await abrirOCaderno(page);
  const corpo = caderno.locator('.m-corpo');
  const titulo = page.locator('.m-app h2', { hasText: /pendurado no fio/ });
  const ler = caderno.locator('.m-frase-item').nth(1).getByRole('button', { name: 'Ler na lei' });
  const lei = caderno.locator('.m-lei');

  // Com espaço (390×844, 1280×800) o artigo aberto faz a folha crescer, como no mockup (de 456 para 587 px em 390 px de largura).
  // Sem espaço (360×520) ela fica no teto e o conteúdo rola dentro dela, com o artigo aberto rolado até a vista.
  for (const [w, h, comEspaco] of [
    [390, 844, true],
    [1280, 800, true],
    [360, 520, false],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const onde = `${String(w)}×${String(h)}`;
    const primeiro = await caderno.boundingBox();
    if (!primeiro) throw new Error(`${onde}: faltou a caixa do quadro`);
    const teto = Math.min(primeiro.height * 0.9, primeiro.height - FOLGA_ATE_O_TITULO);
    // A folha fica encostada no fundo do quadro; mede-se o corpo só depois que ele chega lá (a subida de 400 ms do Calmo acaba antes).
    // O quadro e o título são medidos junto: em janela mais baixa que o quadro a página rola e tudo sobe de uma vez.
    const medir = async (estado: string) => {
      type Caixa = { y: number; height: number };
      const achada: { folha: Caixa | null; quadro: Caixa | null; titulo: Caixa | null } = {
        folha: null,
        quadro: null,
        titulo: null,
      };
      await expect
        .poll(
          async () => {
            achada.folha = await corpo.boundingBox();
            achada.quadro = await caderno.boundingBox();
            achada.titulo = await titulo.boundingBox();
            return achada.folha && achada.quadro
              ? Math.abs(
                  achada.folha.y + achada.folha.height - (achada.quadro.y + achada.quadro.height),
                )
              : Number.POSITIVE_INFINITY;
          },
          { message: `${onde}, ${estado}: a folha chega ao fundo do quadro` },
        )
        .toBeLessThan(1.5);
      if (!achada.folha || !achada.titulo) throw new Error(`${onde}, ${estado}: faltou uma caixa`);
      return { folha: achada.folha, titulo: achada.titulo };
    };
    const parada = await medir('parada');

    await ler.click();
    await expect(lei).toBeVisible();
    await expect(lei).toBeInViewport({ ratio: 1 });
    const aberta = await medir('aberta');

    // Parada ou com o artigo aberto, a folha não passa do teto: o topo dela fica abaixo do título do Varal.
    for (const [estado, medida] of [
      ['parada', parada],
      ['aberta', aberta],
    ] as const) {
      expect(medida.folha.height, `${onde}, ${estado}: a altura da folha`).toBeLessThanOrEqual(
        teto + 1,
      );
      expect(
        medida.titulo.y + medida.titulo.height,
        `${onde}, ${estado}: o título do Varal`,
      ).toBeLessThanOrEqual(medida.folha.y + 0.5);
    }
    if (comEspaco) {
      expect(aberta.folha.height, `${onde}: a folha cresce com o artigo`).toBeGreaterThan(
        parada.folha.height + 60,
      );
    } else {
      expect(Math.abs(aberta.folha.height - teto), `${onde}: no teto`).toBeLessThan(1.5);
      expect(
        await corpo.evaluate((el) => el.scrollHeight > el.clientHeight + 1),
        `${onde}: o conteúdo rola dentro da folha`,
      ).toBe(true);
    }
    await ler.click();
    await expect(lei).toBeHidden();
  }

  // O pé: "Abrir a lista completa" é um link com seta, pequeno e à esquerda, não um botão largo (o "Mostrar mais" só entra com mais de 50).
  await page.setViewportSize({ width: 390, height: 844 });
  const lista = caderno.getByRole('button', { name: 'Abrir a lista completa' });
  await lista.scrollIntoViewIfNeeded();
  await expect(lista).toBeInViewport({ ratio: 1 });
  const caixaDoLink = await lista.boundingBox();
  const frase = await caderno.locator('.m-frase-item').first().boundingBox();
  if (!caixaDoLink || !frase) throw new Error('faltou uma caixa para medir');
  expect(caixaDoLink.height).toBeLessThanOrEqual(48);
  expect(caixaDoLink.width).toBeLessThan(frase.width * 0.7);
  expect(caixaDoLink.x - frase.x).toBeLessThan(24);
  await semViolacoesNoFio(page);
});

test('a busca do Varal acha uma Frase e abre o Caderno nela: a folha sobe, a Frase fica no meio, focada', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararOVaral(page, { soLep: true, comFrases: true });
  await irAoVaral(page);
  const busca = page.getByRole('searchbox', { name: 'Buscar no Varal' });

  // Uma palavra da Frase do erro: o achado diz "Frase"; as normas e os artigos não entram.
  await busca.fill('livramento');
  const achados = page.getByRole('region', { name: 'O que o Varal achou' });
  const achado = achados.getByRole('button', { name: new RegExp(FRASE_DO_ERRO.slice(0, 20)) });
  await expect(achado).toBeVisible();
  await expect(achado).toContainText('Frase');
  await expect(achados.getByRole('button')).toHaveCount(1);
  await semViolacoesNoFio(page);

  await achado.click();
  const caderno = page.getByRole('dialog', { name: 'Suas Frases certas' });
  await expect(caderno).toBeVisible();
  await expect(page).toHaveURL(/#\/varal$/);
  // A Frase achada é a focada (depois de o foco inicial da folha passar) e está à vista.
  const achada = caderno.locator('.m-frase-item', { hasText: FRASE_DO_ERRO });
  await expect(achada).toBeFocused();
  await expect(achada).toBeInViewport();

  // Fechar volta ao Varal com a busca onde estava.
  await page.keyboard.press('Escape');
  await expect(caderno).toBeHidden();
  await expect(busca).toHaveValue('livramento');

  // O Enter com a Frase como primeiro achado abre o Caderno do mesmo jeito.
  await busca.focus();
  await page.keyboard.press('Enter');
  await expect(caderno).toBeVisible();
  await expect(caderno.locator('.m-frase-item', { hasText: FRASE_DO_ERRO })).toBeFocused();
});

test('o brilho da Frase achada pela busca passa inteiro (1400 ms), sem ser cortado quando a descida dela acaba', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await prepararOVaral(page, { soLep: true, comFrases: true });
  await irAoVaral(page);
  // Anota até onde o brilho (a animação de 1400 ms da Frase) chega: a descida da Frase (420 ms, com espera) acaba no meio dele,
  // e quem soltasse `todas` as animações do elemento ao fim da descida cortaria o brilho antes do pico.
  await page.evaluate(() => {
    const w = window as unknown as { __brilho: number };
    w.__brilho = 0;
    const olhar = () => {
      for (const a of document.getAnimations()) {
        const alvo = a.effect instanceof KeyframeEffect ? a.effect.target : null;
        if (
          alvo instanceof Element &&
          alvo.classList.contains('m-frase-item') &&
          a.effect?.getTiming().duration === 1400
        ) {
          w.__brilho = Math.max(w.__brilho, Number(a.currentTime ?? 0));
        }
      }
      requestAnimationFrame(olhar);
    };
    requestAnimationFrame(olhar);
  });
  await page.getByRole('searchbox', { name: 'Buscar no Varal' }).fill('livramento');
  const achado = page
    .getByRole('region', { name: 'O que o Varal achou' })
    .getByRole('button', { name: new RegExp(FRASE_DO_ERRO.slice(0, 20)) });
  await achado.click();
  await expect(page.getByRole('dialog', { name: 'Suas Frases certas' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __brilho: number }).__brilho), {
      timeout: 6000,
    })
    .toBeGreaterThan(1300);
});

test('o Caderno de Frases se mexe como o mockup: a folha sobe em 460 ms, as Frases descem uma a uma em 420 ms e "Ler na lei" abre em 320 ms', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await registrarAnimacoes(page);
  await prepararOVaral(page, { soLep: true, comFrases: true });
  const caderno = await abrirOCaderno(page);

  // A folha sobe logo ao toque, sem esperar nada (o mockup também não espera).
  expect(await msAteAFolhaSubir(page)).toBeLessThan(150);

  const vistas = await animacoesVistas(page);
  // A folha sobe com o repique em 460 ms (o véu em 300 ms), como as outras folhas.
  const corpo = vistas.filter((a) => a.classes.includes('corpo') && a.duracao === 460);
  expect(corpo).toHaveLength(1);
  expect(corpo[0]?.easing).toBe('cubic-bezier(.2,.7,.2,1)');
  // As Frases descem 12 px, 420 ms, 120 ms de espera e 60 a mais por Frase (o `abrirCaderno` do mockup).
  const dasFrases = vistas.filter((a) => a.classes.includes('frase-item') && a.duracao === 420);
  expect(dasFrases.map((a) => a.atraso)).toEqual([120, 180]);
  expect(new Set(dasFrases.map((a) => a.easing))).toEqual(new Set(['cubic-bezier(.2,.7,.2,1)']));
  expect(dasFrases[0]?.props).toBe('opacity,transform');

  // "Ler na lei" abre em 320 ms (o `lerJunto` do mockup); fechar não anima.
  expect(vistas.filter((a) => a.classes.includes('lei') && a.duracao === 320)).toHaveLength(0);
  await caderno.getByRole('button', { name: 'Ler na lei' }).click();
  await expect(caderno.locator('.m-lei')).toBeVisible();
  const abrindo = (await animacoesVistas(page)).filter(
    (a) => a.classes.includes('lei') && a.duracao === 320,
  );
  expect(abrindo).toHaveLength(1);
  expect(abrindo[0]?.easing).toBe('cubic-bezier(.2,.7,.2,1)');

  // A folha desce em 300 ms ao fechar.
  await page.keyboard.press('Escape');
  await expect(caderno).toBeHidden();
  const desce = (await animacoesVistas(page)).filter(
    (a) =>
      a.classes.includes('corpo') && a.duracao === 300 && a.easing === 'cubic-bezier(.4,0,1,1)',
  );
  expect(desce).toHaveLength(1);
});
