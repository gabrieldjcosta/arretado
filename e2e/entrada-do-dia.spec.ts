import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// A Chegada (D-D10: Boas-vindas, Passeio, Começar) e a Entrada do Dia (D-D9): duas folhas modais sobre o
// Hoje. Os testes de unidade e de componente provam as regras e o texto; aqui rodam o <dialog> de verdade
// (foco preso, Esc, o caminho das telas) e o conteúdo que não carrega. O layout das cinco telas (axe nos
// dois temas, alvos de 44 px, zoom e celular pequeno) está em `passeio.spec.ts`. Nenhum teste depende de
// animação: as folhas aparecem paradas. Safari e Firefox não são exercitados.
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

  test('a primeira vez no aparelho abre as Boas-vindas, com o foco no título; Esc fecha e ela não volta', async ({
    page,
  }) => {
    await page.goto('/#/');
    const folha = chegada(page);
    await expect(folha).toBeVisible();
    await expect(
      folha.getByRole('heading', { level: 2, name: 'Boas-vindas ao Arretado!' }),
    ).toBeFocused();
    await expect(folha.getByRole('button')).toHaveText(['Agora não', 'Vamos']);
    // Nenhum caminho para outra tela: o Hoje vazio é que oferece "Escolher meu concurso".
    await expect(folha.getByRole('link')).toHaveCount(0);
    await focoFicaNaFolha(page);

    await page.keyboard.press('Escape');
    await expect(folhaAberta(page)).toHaveCount(0);
    await expect(hoje(page)).toBeVisible();

    await page.reload();
    await nadaAbre(page);
  });

  test('"Vamos" abre o Passeio, um passo por menu; "Seguir" chega ao Começar, que fecha sem conta', async ({
    page,
  }) => {
    await page.goto('/#/');
    await chegada(page).getByRole('button', { name: 'Vamos' }).click();
    const menus = ['Hoje', 'Trilha', 'Fixar', 'Biblioteca'];
    for (const [i, menu] of menus.entries()) {
      const passo = page.getByRole('dialog', { name: `Passo ${String(i + 1)} de 4 ${menu}` });
      await expect(passo).toBeVisible();
      await expect(passo.getByRole('heading', { level: 2, name: menu })).toBeFocused();
      await expect(passo.getByRole('link')).toHaveCount(0);
      await passo.getByRole('button', { name: 'Seguir' }).click();
    }
    const comecar = page.getByRole('dialog', { name: 'Vamo começar?' });
    await expect(comecar).toBeVisible();
    await expect(comecar.getByRole('heading', { level: 2 })).toBeFocused();
    await comecar
      .getByRole('button', { name: 'Experimentar sem conta e salvar seus dados manualmente' })
      .click();
    await expect(folhaAberta(page)).toHaveCount(0);
    await expect(hoje(page)).toBeVisible();

    await page.reload();
    await nadaAbre(page);
  });

  test('"Voltar" desfaz um passo; do primeiro, volta às Boas-vindas, e a folha segue sem links', async ({
    page,
  }) => {
    await page.goto('/#/');
    await chegada(page).getByRole('button', { name: 'Vamos' }).click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    const segundo = page.getByRole('dialog', { name: 'Passo 2 de 4 Trilha' });
    await expect(segundo).toBeVisible();
    await segundo.getByRole('button', { name: 'Voltar', exact: true }).click();
    const primeiro = page.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' });
    await expect(primeiro).toBeVisible();
    await primeiro.getByRole('button', { name: 'Voltar às boas-vindas' }).click();
    await expect(chegada(page)).toBeVisible();
    await expect(chegada(page).getByRole('heading', { level: 2 })).toBeFocused();
  });

  test('Esc num passo pula o passeio e leva ao Começar; Esc no Começar fecha a folha', async ({
    page,
  }) => {
    await page.goto('/#/');
    await chegada(page).getByRole('button', { name: 'Vamos' }).click();
    await expect(page.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Vamo começar?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(folhaAberta(page)).toHaveCount(0);
    await expect(hoje(page)).toBeVisible();
  });

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
});

test.describe('Entrada do Dia (S4: uma linha quieta abaixo do Agora)', () => {
  test.beforeEach(async ({ page }) => {
    await jaViuAChegada(page);
  });

  const linha = (page: Page) => page.locator('.linha-do-dia');

  test('a saudação e a dica do Dia viram uma linha abaixo do Agora, sem folha por cima', async ({
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
    const abaixo = await page.evaluate(() => {
      const l = document.querySelector('.linha-do-dia')?.getBoundingClientRect();
      const g = document.querySelector('[aria-label="Agora"], [aria-label="Por onde começar"]');
      return l !== undefined && g ? g.getBoundingClientRect().bottom <= l.top : false;
    });
    expect(abaixo).toBe(true);
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
