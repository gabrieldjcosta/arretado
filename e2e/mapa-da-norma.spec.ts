import type { Locator, Page } from '@playwright/test';
import { abrirTodasAsNormas, expect, semViolacoes, test } from './apoio';
import { servir } from './lep-com-mapa';

// O Mapa da norma (AP-04): a norma do acervo ganha a chamada no Leitor e a tela com um quadrado por
// artigo, a legenda, o que a pessoa já cobriu e o próximo trecho. O acervo e os arquivos de
// incidência vêm de fixtures (`page.route`, em `lep-com-mapa.ts`): o teste não depende do que o site publica.

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

test('mapa: "ler seguindo o mapa" diz para onde o Próximo vai no fim do trecho, e "Parar" devolve o foco ao cartão', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await adicionarEAbrir(page);
  await page.getByRole('link', { name: 'Mapa da norma' }).click();
  await page.getByRole('region', { name: 'Agora' }).getByRole('link', { name: 'Começar' }).click();
  const linha = page.locator('.seguindo-mapa');
  // Cada trecho do roteiro tem um artigo (o 2º e o 5º "caem muito", e não são vizinhos).
  await expect(linha).toContainText('Seguindo o mapa: art. 2º, trecho 1 de 5.');
  await expect(linha).toContainText('Fim do trecho. Próximo: art. 5º.');
  await page.getByRole('button', { name: 'Próximo artigo' }).click();
  await expect(linha).toContainText('Seguindo o mapa: art. 5º, trecho 2 de 5.');
  const parar = linha.getByRole('button', { name: 'Parar' });
  expect((await parar.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await parar.click();
  await expect(linha).toHaveCount(0);
  await expect(page.getByRole('region', { name: /^Art\. 5º,/ })).toBeFocused();
});

/** As linhas como o navegador as quebrou: o texto de cada uma, medido caractere a caractere. */
const linhasDe = (el: Locator) =>
  el.evaluate((e) => {
    const texto = e.firstChild as Text;
    const faixa = document.createRange();
    const linhas: string[] = [];
    let atual = '';
    let topo = Number.NaN;
    for (let i = 0; i < texto.length; i++) {
      faixa.setStart(texto, i);
      faixa.setEnd(texto, i + 1);
      const caixa = faixa.getClientRects()[0];
      if (caixa && Math.round(caixa.top) !== topo) {
        topo = Math.round(caixa.top);
        linhas.push(atual);
        atual = '';
      }
      atual += texto.data.charAt(i);
    }
    return [...linhas, atual].map((l) => l.trim()).filter(Boolean);
  });

test('mapa: no Hoje, o Agora é o trecho que mais cai e leva ao Leitor; "de onde parou" fica abaixo', async ({
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
  // Nada coberto ainda ("Lido até aqui" não foi tocado): o primeiro "cai muito" é o art. 2º, e ele
  // é o Agora (decisão F2, 27/10/2026); "de onde parou" é a alternativa, uma linha abaixo.
  await expect(agora.getByRole('heading', { name: 'Ler art. 2º' })).toBeVisible();
  await expect(agora).toContainText('Pelo mapa, o próximo trecho: cai muito');
  await expect(agora).toContainText('cerca de 1 min');
  const linha = page.locator('.agora-no-mapa');
  await expect(linha).toContainText('Ou de onde parou');
  const caixa = await linha.getByRole('link', { name: 'Continuar a leitura' }).boundingBox();
  expect(caixa?.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText(/atrasad|pendente|dívida|faltam/i)).toHaveCount(0);
  await semViolacoes(page);
  // O intervalo de quatro dígitos (CPC, Código Civil) quebra depois do "arts.": o "a" não fica pendurado
  // no fim da primeira linha (320 px).
  const janela = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 568 });
  const titulo = agora.getByRole('heading').first();
  await titulo.evaluate((el) => {
    el.textContent = 'Ler arts. 1.059 a 1.062';
  });
  await page.evaluate(() => document.fonts.ready);
  expect(await linhasDe(titulo)).toEqual(['Ler arts.', '1.059 a 1.062']);
  if (janela) await page.setViewportSize(janela);
  await agora.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.locator('[data-endereco="art2"]')).toBeInViewport();
  // Sessão aberta, no artigo por artigo e seguindo o mapa.
  await expect(page).toHaveURL(/ir=art2&foco=artigo&mapa=1/);
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
