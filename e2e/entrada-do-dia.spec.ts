import type { Locator, Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// A Chegada e a Entrada do Dia (D-D9): duas folhas modais sobre o Hoje. Os testes de unidade e de
// componente provam as regras e o texto; aqui rodam o <dialog> de verdade (foco preso, Esc, rolagem por
// dentro com zoom e texto grandes), o axe nos dois temas, os alvos de 44 px e o conteúdo que não carrega.
// Nenhum depende de animação: as folhas aparecem paradas. Safari e Firefox não são exercitados.
//
// Este arquivo desliga a semeadura que dá a todos os outros testes um aparelho que já viu as duas folhas
// (ver `apoio.ts`); o primeiro teste confere que, ligada, ela deixa o Hoje livre.
test.use({ semearAbertura: false });

const CHAVE_CHEGADA = 'arretado:chegada:v1';
const CHAVE_ENTRADA = 'arretado:entrada-do-dia:v1';

// A Entrada de 21/10/2026 é a da prancha: Ricardo Reis e "Tentar lembrar vale mais que reler".
const HOJE = new Date('2026-10-21T09:30:00-03:00');

const hoje = (page: Page) => page.getByRole('heading', { level: 1, name: 'Hoje' });
const folhaAberta = (page: Page) => page.locator('dialog[open]');
const chegada = (page: Page) => page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });

/** O aparelho já viu a Chegada: o que abre, no Hoje, é a Entrada do Dia. */
async function jaViuAChegada(page: Page) {
  await page.addInitScript((chave) => {
    try {
      window.localStorage.setItem(chave, '{"vista":true}');
    } catch {
      /* sem armazenamento */
    }
  }, CHAVE_CHEGADA);
}

/**
 * Prova uma ausência: o retrato do Hoje já carregou (é ele que põe a decisão em marcha) e a decisão
 * (algumas leituras locais, milissegundos) já teve tempo de abrir uma folha. Os testes em que a folha
 * abre provam, ao contrário, que ela abre rápido.
 */
async function nadaAbre(page: Page) {
  await expect(hoje(page)).toBeVisible();
  await expect(page.getByRole('region', { name: /^(Agora|Por onde começar)$/ })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(folhaAberta(page)).toHaveCount(0);
}

/**
 * Tab dá a volta só pela folha: o fundo está inerte. Depois do último botão o foco sai para o navegador
 * (`body`, no headless) e volta ao primeiro; o que nunca pode é cair num elemento do Hoje por baixo.
 */
async function focoFicaNaFolha(page: Page, voltas = 6) {
  for (let i = 0; i < voltas; i += 1) {
    await page.keyboard.press('Tab');
    const fora = await page.evaluate(() => {
      const a = document.activeElement;
      const dentro = a === null || a === document.body || a.closest('dialog[open]') !== null;
      return dentro ? '' : a.textContent;
    });
    expect(fora, 'o foco saiu da folha para o Hoje').toBe('');
  }
}

/** Todo botão e link da folha tem 44 px de lado, no mínimo (0,01 de folga para o arredondamento). */
async function alvosDe44(folha: Locator) {
  const alvos = folha.locator('a, button');
  const quantos = await alvos.count();
  expect(quantos).toBeGreaterThan(0);
  for (let i = 0; i < quantos; i += 1) {
    const caixa = await alvos.nth(i).boundingBox();
    const nome = (await alvos.nth(i).textContent()) ?? String(i);
    expect(caixa?.height ?? 0, nome).toBeGreaterThanOrEqual(43.99);
    expect(caixa?.width ?? 0, nome).toBeGreaterThanOrEqual(43.99);
  }
}

/** Quanto passa da largura (0 = nada rola de lado), da página e da folha. */
const rolagemLateral = (page: Page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    return {
      pagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      folha: d ? d.scrollWidth - d.clientWidth : -1,
    };
  });

test.describe('com o aparelho semeado dos outros testes', () => {
  test.use({ semearAbertura: true });

  test('as duas folhas já foram vistas: o Hoje abre livre, sem folha por cima', async ({
    page,
  }) => {
    await page.clock.setFixedTime(HOJE);
    await page.goto('/#/');
    await nadaAbre(page);
    const guardado = await page.evaluate(
      (chaves) => chaves.map((chave) => localStorage.getItem(chave)),
      [CHAVE_CHEGADA, CHAVE_ENTRADA],
    );
    expect(guardado).toEqual(['{"vista":true}', '{"dia":"9999-12-31"}']);
  });
});

test.describe('Chegada', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(HOJE);
  });

  test('a primeira vez no aparelho abre a folha, com o foco no primeiro caminho; Esc fecha e ela não volta', async ({
    page,
  }) => {
    await page.goto('/#/');
    const folha = chegada(page);
    await expect(folha).toBeVisible();
    await expect(folha.getByRole('link', { name: 'Escolher meu concurso' })).toBeFocused();
    await expect(folha.getByRole('link', { name: 'Ler uma norma' })).toBeVisible();
    await expect(folha.getByRole('link', { name: 'Registrar um erro' })).toBeVisible();
    await expect(folha.getByRole('link', { name: /^Montar a trilha passo a passo/ })).toBeVisible();
    await expect(folha.getByRole('button', { name: 'Agora não' })).toBeVisible();
    await focoFicaNaFolha(page);

    await page.keyboard.press('Escape');
    await expect(folhaAberta(page)).toHaveCount(0);
    await expect(hoje(page)).toBeVisible();

    await page.reload();
    await nadaAbre(page);
  });

  for (const [nome, rota, titulo] of [
    ['Escolher meu concurso', /#\/comecar$/, 'Qual concurso você estuda?'],
    ['Registrar um erro', /#\/recall\/registrar$/, 'Registrar erro'],
    ['Ler uma norma', /#\/biblioteca$/, 'Biblioteca'],
    ['Montar a trilha passo a passo', /#\/plano\/onboarding$/, 'Para qual carreira você estuda?'],
  ] as const) {
    test(`"${nome}" leva à tela dele, sem a folha por cima`, async ({ page }) => {
      await page.goto('/#/');
      await chegada(page)
        .getByRole('link', { name: new RegExp(`^${nome}`) })
        .click();
      await expect(page).toHaveURL(rota);
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      await expect(folhaAberta(page)).toHaveCount(0);
    });
  }

  test('"Agora não" fecha e deixa o Hoje; recarregar no mesmo Dia não abre nenhuma folha', async ({
    page,
  }) => {
    await page.goto('/#/');
    await chegada(page).getByRole('button', { name: 'Agora não' }).click();
    await expect(folhaAberta(page)).toHaveCount(0);
    await expect(hoje(page)).toBeVisible();

    await page.reload();
    await nadaAbre(page);
  });

  test('fechar o aplicativo com a folha aberta não a traz de volta', async ({ page }) => {
    await page.goto('/#/');
    await expect(chegada(page)).toBeVisible();

    await page.reload();
    await nadaAbre(page);
  });

  test('sem violações do axe, nos dois temas, com alvos de 44 px', async ({ page }) => {
    await page.goto('/#/');
    await expect(chegada(page)).toBeVisible();
    await semViolacoes(page);
    await alvosDe44(chegada(page));
  });

  test('com zoom de 200% e com texto grande, a folha rola por dentro e tudo se alcança', async ({
    page,
  }) => {
    // 200% de zoom em 390 × 800 é 195 × 400 px de layout.
    await page.setViewportSize({ width: 195, height: 400 });
    await page.goto('/#/');
    await expect(chegada(page)).toBeVisible();
    expect(await rolagemLateral(page)).toEqual({ pagina: 0, folha: 0 });
    const agoraNao = chegada(page).getByRole('button', { name: 'Agora não' });
    await agoraNao.scrollIntoViewIfNeeded();
    await expect(agoraNao).toBeInViewport();
    expect(await rolagemLateral(page)).toEqual({ pagina: 0, folha: 0 });

    // Texto a 200% numa tela de celular (CSSOM: a CSP barra <style> e style="").
    await page.setViewportSize({ width: 390, height: 800 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await agoraNao.scrollIntoViewIfNeeded();
    await expect(agoraNao).toBeInViewport();
    expect(await rolagemLateral(page)).toEqual({ pagina: 0, folha: 0 });
  });
});

test.describe('Entrada do Dia (S4: uma linha quieta acima do Agora)', () => {
  test.beforeEach(async ({ page }) => {
    await jaViuAChegada(page);
  });

  const linha = (page: Page) => page.locator('.linha-do-dia');

  test('a saudação e a dica do Dia viram uma linha acima do Agora, sem folha por cima', async ({
    page,
  }) => {
    await page.clock.setFixedTime(HOJE);
    await page.goto('/#/');
    await expect(linha(page)).toBeVisible();
    await expect(linha(page)).toContainText('Bom dia.');
    await expect(linha(page)).toContainText('Tentar lembrar vale mais que reler.');
    await expect(folhaAberta(page)).toHaveCount(0);
    // A Citação deixou a tela; o Hoje não está inerte.
    await expect(page.getByRole('blockquote')).toHaveCount(0);
    await expect(page.getByRole('region', { name: /^(Agora|Por onde começar)$/ })).toBeVisible();
    const acima = await page.evaluate(() => {
      const l = document.querySelector('.linha-do-dia')?.getBoundingClientRect();
      const g = document.querySelector('[aria-label="Agora"], [aria-label="Por onde começar"]');
      return l !== undefined && g ? l.bottom <= g.getBoundingClientRect().top : false;
    });
    expect(acima).toBe(true);
  });

  test('recarregar no mesmo Dia não a repete; o Dia seguinte traz outra dica', async ({ page }) => {
    await page.clock.setFixedTime(HOJE);
    await page.goto('/#/');
    const dica = await linha(page).innerText();

    await page.reload();
    await nadaAbre(page);
    await expect(linha(page)).toHaveCount(0);

    await page.clock.setFixedTime(new Date(HOJE.getTime() + 24 * 60 * 60_000));
    await page.reload();
    await expect(linha(page)).toBeVisible();
    expect(await linha(page).innerText()).not.toBe(dica);
  });

  test('sem violações do axe e sem rolagem lateral a 200% de zoom', async ({ page }) => {
    await page.clock.setFixedTime(HOJE);
    await page.setViewportSize({ width: 195, height: 400 });
    await page.goto('/#/');
    await expect(linha(page)).toBeVisible();
    expect(await rolagemLateral(page)).toMatchObject({ pagina: 0 });
    await page.setViewportSize({ width: 390, height: 800 });
    await semViolacoes(page);
  });
});

test.describe('Entrada do Dia › se o conteúdo não carregar', () => {
  // O pedido do trecho que falha é, ele mesmo, um erro de console; o que não pode haver é erro da página.
  test.use({ permitirFalhasConsole: true });

  test('a linha não aparece, nada é gravado e o Hoje segue usável', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    let pedidos = 0;
    await page.route(/conteudo-de-partida/, async (rota) => {
      pedidos += 1;
      await rota.abort();
    });
    await jaViuAChegada(page);
    await page.clock.setFixedTime(HOJE);
    await page.goto('/#/');

    await nadaAbre(page);
    // A rota de teste viu o pedido: sem ele, "não abriu" valeria também para "nunca tentou".
    await expect.poll(() => pedidos).toBeGreaterThan(0);
    expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_ENTRADA)).toBeNull();
    // O Hoje responde.
    await page.getByRole('link', { name: 'Novo registro de erro' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
    expect(erros).toEqual([]);
  });
});
