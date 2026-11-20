import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O Leitor dentro da casca do Fio (D-D25: "Passo e Leitor abrem por dentro do lugar de onde vieram, sem barra de
// abas"). O jsdom não mede layout; aqui o navegador confere que a pílula dos lugares fica do lado de fora da norma,
// que nada do Leitor fica debaixo do cabeçalho grudado da casca (o fio da rolagem, o sumário, o trilho) e que o
// "Voltar" devolve ao lugar de onde a norma foi aberta. A linha retomada e o "ir para" logo abaixo do cabeçalho se
// medem no `leitor.spec.ts` (`distanciaDoAlto`); a barra de baixo do celular, no `leitor-celular.spec.ts`.

const pilula = (page: Page) => page.getByRole('navigation', { name: 'Lugares' });

/** Na norma os lugares saem da frente. Do tablet deitado para cima (700 px) a nav mora no menu lateral (layout B, 17/11):
 * ali ela fica recolhida, só os ícones, sem lugar aceso. Abaixo disso a pílula sai de cena. */
async function lugaresForaDaFrente(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 700) {
    await expect(page.locator('.menu-lateral')).toHaveAttribute('data-aberto', 'nao');
    await expect(pilula(page).locator('[aria-current="page"]')).toHaveCount(0);
  } else await expect(pilula(page)).toHaveCount(0);
}
const voltar = (page: Page) => page.getByRole('link', { name: 'Voltar', exact: true });
const tituloDaLep = (page: Page) => page.getByRole('heading', { level: 1, name: 'LEP' });

async function abrirALepPelaBiblioteca(page: Page) {
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(tituloDaLep(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
}

interface Caixa {
  topo: number;
  base: number;
  posicao: string;
}

/** As caixas do cabeçalho da casca e do que o Leitor prende na tela; `null` para o que a largura não desenha. */
const medir = (page: Page) =>
  page.evaluate(() => {
    const caixa = (seletor: string): Caixa | null => {
      const el = document.querySelector(seletor);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { topo: r.top, base: r.bottom, posicao: getComputedStyle(el).position };
    };
    return {
      largura: window.innerWidth,
      rolagem: window.scrollY,
      sobraDeLado: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cabecalho: caixa('.fio-topo'),
      fioDaRolagem: caixa('.fio-da-rolagem'),
      estrutura: caixa('.estrutura-da-norma'),
      ferramentas: caixa('.acoes-leitor'),
    };
  });

test('dentro da norma os lugares ficam de fora, em qualquer largura, e volta ao sair dela', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  // Na Biblioteca, como em toda tela da casca, a pílula está lá.
  await expect(pilula(page)).toBeVisible();
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(tituloDaLep(page)).toBeVisible();
  await lugaresForaDaFrente(page);
  await expect(page.locator('.fio-topo')).toBeVisible();

  // Nem rolando para baixo e de volta para cima (era quando ela reaparecia, por cima do texto e da barra do Leitor).
  await page.evaluate(() => {
    window.scrollBy(0, 900);
  });
  await page.evaluate(() => {
    window.scrollBy(0, -120);
  });
  await lugaresForaDaFrente(page);
  expect((await medir(page)).sobraDeLado).toBeLessThanOrEqual(0);
  await semViolacoes(page);

  // Nem no modo foco, que tira também o cabeçalho.
  await page.keyboard.press('f');
  await expect(page).toHaveURL(/[?&]foco=/);
  await expect(page.locator('.fio-topo')).toBeHidden();
  await expect(pilula(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/foco=/);
  await expect(page.locator('.fio-topo')).toBeVisible();

  // Ao sair da norma a pílula volta.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(pilula(page)).toBeVisible();
});

test('nada do Leitor fica debaixo do cabeçalho da casca: o fio da rolagem encosta nele; o sumário e o trilho ficam abaixo', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await abrirALepPelaBiblioteca(page);
  await page.evaluate(() => {
    window.scrollBy(0, 1400);
  });
  await expect.poll(async () => (await medir(page)).rolagem).toBeGreaterThan(1000);
  // O fio só se desenha depois de a pessoa rolar; o sumário (de 700 px para cima) leva um quadro para grudar.
  await expect(page.locator('.fio-da-rolagem')).toHaveCount(1);
  const m = await medir(page);
  if (!m.cabecalho || !m.fioDaRolagem || !m.ferramentas) throw new Error('sem as caixas do Leitor');
  const fimDoCabecalho = m.cabecalho.base;

  // O cabeçalho da casca é o que fica grudado no alto, e é contra ele que o Leitor mede.
  expect(m.cabecalho.posicao).toBe('sticky');
  expect(m.cabecalho.topo).toBe(0);
  expect(fimDoCabecalho).toBeGreaterThan(40);

  // Sem o painel ao lado do texto, a trilha da norma fica presa logo abaixo do cabeçalho e o fio passa por baixo dela.
  const trilha = await page.evaluate(
    () => document.querySelector('.trilha-da-norma')?.getBoundingClientRect().height ?? 0,
  );
  expect(
    Math.abs(m.fioDaRolagem.topo - fimDoCabecalho - trilha),
    'o fio da rolagem',
  ).toBeLessThanOrEqual(1);
  if (m.largura >= 700) {
    if (!m.estrutura) throw new Error('sem o sumário');
    expect(m.estrutura.posicao).toBe('sticky');
    expect(m.estrutura.topo, 'o sumário').toBeGreaterThanOrEqual(fimDoCabecalho);
  } else {
    expect(m.estrutura, 'no celular o sumário não se desenha').toBeNull();
  }
  // As ferramentas: ao lado do texto e abaixo do cabeçalho de 1200 px para cima (o trilho); no canto ou na barra
  // de baixo nas outras larguras, longe dele de todo jeito.
  expect(m.ferramentas.topo, 'as ferramentas').toBeGreaterThanOrEqual(fimDoCabecalho);
  expect(m.sobraDeLado).toBeLessThanOrEqual(0);
});

test('o "Voltar" da norma leva ao lugar de onde ela foi aberta; aberta direto pelo endereço, ao folheto das Normas', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');

  // Da Biblioteca.
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(tituloDaLep(page)).toBeVisible();
  await expect(voltar(page)).toHaveAttribute('href', '#/biblioteca');
  const norma = await page.evaluate(() => window.location.hash);
  await voltar(page).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();

  // Do folheto das Normas, no Varal.
  await page.goto('/#/varal/normas');
  const linha = page.locator('.m-linha-item .m-abre');
  await expect(linha).toHaveCount(1);
  await linha.click();
  await expect(tituloDaLep(page)).toBeVisible();
  await expect(voltar(page)).toHaveAttribute('href', '#/varal/normas');
  // O modo foco e o que mais mexe no endereço dentro da norma não mudam o destino.
  await page.keyboard.press('f');
  await expect(page).toHaveURL(/[?&]foco=/);
  // O endereço muda antes de a bandeja do foco montar, e é ela que ouve o Esc.
  await expect(page.getByRole('button', { name: 'Mais ações do foco' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/foco=/);
  await expect(voltar(page)).toHaveAttribute('href', '#/varal/normas');
  // Um desvio para fora da norma e a volta pelo navegador também não: o "Voltar" segue sendo o lugar de onde ela
  // foi aberta, não a tela do desvio.
  await page.getByRole('button', { name: 'Aa, ajustes de leitura' }).click();
  await page
    .getByRole('dialog', { name: 'Ajustes de leitura' })
    .getByRole('link', { name: 'Conta › Aparência' })
    .click();
  // A tela do desvio na tela, e não só o endereço: ela baixa à parte, e voltar antes disso deixaria a norma como
  // estava, com a folha dos ajustes ainda aberta por cima do "Voltar".
  await expect(page.getByRole('heading', { level: 1, name: 'Aparência' })).toBeVisible();
  await page.goBack();
  await expect(tituloDaLep(page)).toBeVisible();
  await expect(voltar(page)).toHaveAttribute('href', '#/varal/normas');
  await voltar(page).click();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await expect(linha).toHaveCount(1);

  // Direto pelo endereço (um link guardado, a página recarregada): não há de onde voltar, e o "Voltar" leva ao
  // folheto das Normas, que é onde a norma mora no Fio.
  await page.goto(`/${norma}`);
  await page.reload();
  await expect(tituloDaLep(page)).toBeVisible();
  await expect(voltar(page)).toHaveAttribute('href', '#/varal/normas');
  await voltar(page).click();
  await expect(page).toHaveURL(/#\/varal\/normas$/);
  await expect(linha).toHaveCount(1);
});
