import type { Page } from '@playwright/test';
import { expect, importarEPublicar, rolagemAssentada, semViolacoes, test } from './apoio';

// A barra do Leitor no celular (Onda 1 da crítica externa, A + B). Dentro da norma, menos de 700 px:
// as abas das áreas saem (A), e as ferramentas viram uma barra de uma linha, encostada no fundo, com
// Filtrar e Ações a dois toques, no "Mais" (B). Aqui se mede onde cada coisa fica, no estilo do
// `trilho-do-leitor.spec.ts`; o E2E do Leitor só pergunta se os botões estão à vista.

// O CI desenha o texto com hinting inteiro, uns 3% mais largo que o do computador de quem escreve o
// teste: a barra de 360 px passava aqui e quebrava lá. Com a flag o E2E mede o mesmo texto nos dois.
test.use({ launchOptions: { args: ['--font-render-hinting=full'] } });

const TELAS = [
  { largura: 390, altura: 844 },
  { largura: 375, altura: 667 },
  { largura: 360, altura: 740 },
] as const;
/** O que a barra de baixo pode cobrir da tela (px): uma linha de 63, com folga para o arredondamento. */
const COBERTURA_MAXIMA = 67;
/** A janela de leitura (o que sobra entre o cabeçalho e a barra) passa desta parte da tela. */
const JANELA_MINIMA = 0.81;

async function abrirALep(page: Page) {
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
}

/** Vai ao fim da lei; a altura total é estimada e se corrige ao medir, então repete até assentar. */
async function irAoFim(page: Page) {
  const ultimo = page.locator('[data-endereco="art204"]');
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(100);
    if (await ultimo.first().isVisible()) break;
  }
  await expect(ultimo.first()).toBeVisible();
  await rolagemAssentada(page);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await rolagemAssentada(page);
}

/** As caixas da barra de baixo e dos botões dela, o cabeçalho e a rolagem de lado, em px da tela. */
const medir = (page: Page) =>
  page.evaluate(() => {
    const caixa = (el: Element | null) => {
      const r = el?.getBoundingClientRect();
      return {
        esquerda: r?.left ?? 0,
        direita: r?.right ?? 0,
        topo: r?.top ?? 0,
        base: r?.bottom ?? 0,
      };
    };
    const barra = caixa(document.querySelector('.acoes-leitor'));
    return {
      altura: window.innerHeight,
      largura: document.documentElement.clientWidth,
      sobraDeLado: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      barra,
      cabecalho: caixa(document.querySelector('.topo')),
      botoes: [...document.querySelectorAll<HTMLElement>('.acoes-leitor button')].map((b) => ({
        nome: b.textContent.trim(),
        ...caixa(b),
        fonte: parseFloat(getComputedStyle(b).fontSize),
      })),
    };
  });

const SO_NO_CELULAR = 'o tamanho da janela é do teste; basta um projeto';

for (const { largura, altura } of TELAS) {
  test(`${String(largura)}×${String(altura)}: a barra de baixo é uma linha só, sem as abas, e o fim da norma fica acima dela`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'celular', SO_NO_CELULAR);
    test.setTimeout(120_000);
    await abrirALep(page);
    await page.setViewportSize({ width: largura, height: altura });
    await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeHidden();

    const m = await medir(page);
    expect(m.altura - m.barra.topo, 'o que a barra cobre').toBeLessThanOrEqual(COBERTURA_MAXIMA);
    expect(m.barra.base, 'encostada no fundo').toBeGreaterThanOrEqual(m.altura - 0.5);
    expect((m.barra.topo - m.cabecalho.base) / m.altura, 'a janela de leitura').toBeGreaterThan(
      JANELA_MINIMA,
    );
    expect(m.sobraDeLado, 'nada rola de lado').toBeLessThanOrEqual(0);
    expect(m.barra.esquerda).toBeGreaterThanOrEqual(0);
    expect(m.barra.direita).toBeLessThanOrEqual(m.largura);
    expect(m.botoes.map((b) => b.nome)).toEqual(['Buscar', 'Modo foco', 'Mais', 'Lido até aqui']);
    for (const b of m.botoes) {
      expect(b.base - b.topo, `${b.nome}: alvo de 44 px de altura`).toBeGreaterThanOrEqual(43.9);
      expect(b.direita - b.esquerda, `${b.nome}: alvo de 44 px de largura`).toBeGreaterThanOrEqual(
        43.9,
      );
      expect(b.fonte, `${b.nome}: texto de 13 px ou mais`).toBeGreaterThanOrEqual(13);
      expect(b.esquerda, `${b.nome} dentro da tela`).toBeGreaterThanOrEqual(0);
      expect(b.direita, `${b.nome} dentro da tela`).toBeLessThanOrEqual(m.largura);
    }
    // Uma linha: os quatro botões na mesma altura.
    expect(new Set(m.botoes.map((b) => Math.round(b.topo))).size, 'uma linha').toBe(1);

    // No fim da norma a última linha, e o rodapé com "Backup e dados", terminam acima da barra.
    await irAoFim(page);
    const fim = await page.evaluate(() => ({
      barra: document.querySelector('.acoes-leitor')?.getBoundingClientRect().top ?? 0,
      ultimaLinha:
        document.querySelector('[data-endereco="art204"]')?.getBoundingClientRect().bottom ?? 0,
      rodape: document.querySelector('.rodape')?.getBoundingClientRect().bottom ?? 0,
    }));
    expect(fim.ultimaLinha, 'a última linha acima da barra').toBeLessThanOrEqual(fim.barra);
    expect(fim.rodape, 'o rodapé acima da barra').toBeLessThanOrEqual(fim.barra + 1);
    await expect(page.getByRole('link', { name: 'Backup e dados' })).toBeInViewport();
    await semViolacoes(page);
  });
}

test('Filtrar, Registrar erro e Ações ficam a dois toques, no "Mais", e o foco volta a ele ao fechar o diálogo', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', SO_NO_CELULAR);
  test.setTimeout(120_000);
  await abrirALep(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const mais = page.getByRole('button', { name: 'Mais', exact: true });
  const menu = page.getByRole('group', { name: 'Mais ferramentas da leitura' });
  await expect(page.getByRole('button', { name: 'Filtrar', exact: true })).toHaveCount(0);

  // O menu abre para cima, dentro da tela, com itens de 48 px; aberto e fechado passa no axe.
  await mais.tap();
  await expect(mais).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.getByRole('button')).toHaveText([/^Filtrar/, /^Registrar erro/, /^Ações/]);
  const caixas = await menu.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const barra = document.querySelector('.acoes-leitor')?.getBoundingClientRect();
    return {
      esquerda: r.left,
      direita: r.right,
      folga: (barra?.top ?? 0) - r.bottom,
      itens: [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect().height),
    };
  });
  expect(caixas.esquerda).toBeGreaterThanOrEqual(0);
  expect(caixas.direita).toBeLessThanOrEqual(390);
  expect(caixas.folga, 'acima da barra, sem encostar').toBeGreaterThan(0);
  for (const item of caixas.itens) expect(item).toBeGreaterThanOrEqual(44);
  await semViolacoes(page);

  // Tocar fora fecha; o Esc fecha e devolve o foco ao botão.
  await page.getByRole('heading', { level: 1, name: 'LEP' }).tap();
  await expect(menu).toBeHidden();
  await mais.tap();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(mais).toBeFocused();

  // Filtrar: dois toques, o diálogo abre, o menu fecha e o foco volta ao Mais ao fechar o diálogo.
  await mais.tap();
  await menu.getByRole('button', { name: /^Filtrar/ }).tap();
  const filtro = page.getByRole('dialog', { name: 'Filtrar a norma' });
  await expect(filtro).toBeVisible();
  await expect(menu).toBeHidden();
  await semViolacoes(page);
  await page.keyboard.press('Escape');
  await expect(filtro).toBeHidden();
  await expect(mais).toBeFocused();

  // O filtro ligado: o anel no Mais e a frase dele no menu.
  await mais.tap();
  await menu.getByRole('button', { name: /^Filtrar/ }).tap();
  await filtro.getByRole('radio', { name: 'Só os estrelados' }).check();
  await filtro.getByRole('button', { name: 'Mostrar', exact: true }).tap();
  await expect(filtro).toBeHidden();
  await expect(page.getByRole('button', { name: /^Mais\. Filtrado:/ })).toHaveClass(
    /filtro-ligado/,
  );
  await page.getByRole('button', { name: /^Mais\. Filtrado:/ }).tap();
  await expect(menu.getByRole('button', { name: /^Filtrado/ })).toContainText('Mostrando só:');
  await semViolacoes(page);
  await page.keyboard.press('Escape');

  // Ações: o diálogo do dispositivo no alto da tela.
  await menu.waitFor({ state: 'hidden' });
  await mostrarTudo(page);
  await page.getByRole('button', { name: 'Mais', exact: true }).tap();
  await menu.getByRole('button', { name: /^Ações/ }).tap();
  const acoes = page.getByRole('dialog', { name: /^Ações de / });
  await expect(acoes).toBeVisible();
  await acoes.getByRole('button', { name: 'Fechar' }).tap();
  await expect(acoes).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mais', exact: true })).toBeFocused();

  // Registrar erro: o painel abre direto no formulário (a frase correta), sem a lista de ações.
  await page.getByRole('button', { name: 'Mais', exact: true }).tap();
  await menu.getByRole('button', { name: /^Registrar erro/ }).tap();
  await expect(acoes).toBeVisible();
  await expect(acoes.getByLabel('Frase correta')).toBeVisible();
  await expect(acoes.getByRole('button', { name: 'Criar cartão deste trecho' })).toHaveCount(0);
  await semViolacoes(page);
  await page.keyboard.press('Escape');
  await expect(acoes).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mais', exact: true })).toBeFocused();
});

/** Tira o filtro: "Mostrar tudo" aparece na linha do filtro ligado. */
async function mostrarTudo(page: Page) {
  await page.getByRole('button', { name: 'Mostrar tudo' }).tap();
  await expect(page.locator('.filtro-ativo')).toHaveCount(0);
}

test('numa tela estreita ou com texto grande a barra quebra em duas linhas, sem cortar nem rolar de lado, e o fim da norma continua acima dela', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', SO_NO_CELULAR);
  test.setTimeout(120_000);
  await abrirALep(page);

  for (const [largura, altura, fonte] of [
    [320, 568, 1],
    [390, 844, 1.3],
  ] as const) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.evaluate((f) => {
      document.documentElement.style.fontSize = `${String(f * 100)}%`;
    }, fonte);
    const m = await medir(page);
    const rotulo = `${String(largura)} px, texto a ${String(fonte * 100)}%`;
    expect(m.sobraDeLado, `${rotulo}: nada rola de lado`).toBeLessThanOrEqual(0);
    for (const b of m.botoes) {
      expect(b.esquerda, `${rotulo}: ${b.nome} dentro da tela`).toBeGreaterThanOrEqual(0);
      expect(b.direita, `${rotulo}: ${b.nome} dentro da tela`).toBeLessThanOrEqual(m.largura);
    }
    expect(new Set(m.botoes.map((b) => Math.round(b.topo))).size, `${rotulo}: duas linhas`).toBe(2);

    await irAoFim(page);
    const fim = await page.evaluate(() => ({
      barra: document.querySelector('.acoes-leitor')?.getBoundingClientRect().top ?? 0,
      rodape: document.querySelector('.rodape')?.getBoundingClientRect().bottom ?? 0,
    }));
    expect(fim.rodape, `${rotulo}: o rodapé acima da barra`).toBeLessThanOrEqual(fim.barra + 1);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }
});

test('com o texto a 300% o dock quebra em linhas e nenhum rótulo passa da caixa do botão', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', SO_NO_CELULAR);
  await abrirALep(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '300%';
  });

  const rotulos = await page.evaluate(() =>
    [...document.querySelectorAll('.acoes-leitor button')].map((botao) => {
      const texto = document.createRange();
      texto.selectNodeContents(botao);
      const t = texto.getBoundingClientRect();
      const b = botao.getBoundingClientRect();
      return {
        nome: botao.textContent.trim(),
        foraAEsquerda: b.left - t.left,
        foraADireita: t.right - b.right,
      };
    }),
  );
  expect(rotulos.map((r) => r.nome)).toEqual(['Buscar', 'Modo foco', 'Mais', 'Lido até aqui']);
  for (const r of rotulos) {
    expect(r.foraAEsquerda, `${r.nome}: rótulo dentro do botão, à esquerda`).toBeLessThanOrEqual(1);
    expect(r.foraADireita, `${r.nome}: rótulo dentro do botão, à direita`).toBeLessThanOrEqual(1);
  }
  const m = await medir(page);
  expect(m.sobraDeLado, 'nada rola de lado').toBeLessThanOrEqual(0);
});
