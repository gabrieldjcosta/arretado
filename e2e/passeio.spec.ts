import type { Locator, Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// As cinco telas da Chegada (D-D10): as Boas-vindas, os quatro passos do Passeio e o Começar. Os testes de
// unidade provam as regras, os textos e o ritmo da troca; aqui rodam o <dialog> e o CSS de verdade: o axe
// nos dois temas, os alvos de 44 px, nenhuma rolagem lateral, e todo botão ao alcance no celular
// pequeno, a 200% de zoom e com o texto a 200%. A Conta refaz o passeio sem as Boas-vindas e sem o Começar.
// Nenhum teste depende de animação (as telas só precisam estar paradas para medir). Safari e Firefox não
// são exercitados.
//
// Como a `entrada-do-dia.spec.ts`, desliga a semeadura que deixa o aparelho "já visto": a Chegada precisa abrir.
test.use({ semearAbertura: false });

const CHAVE_CHEGADA = 'arretado:chegada:v1';

type Tela = 'boas' | 'passo-1' | 'passo-2' | 'passo-3' | 'passo-4' | 'comecar';

const TELAS: ReadonlyArray<{ tela: Tela; nome: string; botoes: string[] }> = [
  { tela: 'boas', nome: 'Boas-vindas ao Arretado!', botoes: ['Agora não', 'Vamos'] },
  {
    tela: 'passo-1',
    nome: 'Passo 1 de 4 Hoje',
    botoes: ['Pular o passeio', 'Seguir', 'Voltar às boas-vindas'],
  },
  { tela: 'passo-2', nome: 'Passo 2 de 4 Trilha', botoes: ['Pular o passeio', 'Seguir', 'Voltar'] },
  { tela: 'passo-3', nome: 'Passo 3 de 4 Fixar', botoes: ['Pular o passeio', 'Seguir', 'Voltar'] },
  {
    tela: 'passo-4',
    nome: 'Passo 4 de 4 Biblioteca',
    botoes: ['Pular o passeio', 'Seguir', 'Voltar'],
  },
  {
    tela: 'comecar',
    nome: 'Vamo começar?',
    botoes: ['Continuar sem conta e salvar meus dados manualmente'],
  },
];

/** Abre a Chegada num aparelho novo e anda até a tela pedida; devolve o <dialog> dela. */
async function irAte(page: Page, tela: Tela): Promise<Locator> {
  await page.clock.setFixedTime(new Date('2026-10-21T09:30:00-03:00'));
  await page.goto('/#/');
  const boas = page.getByRole('dialog', { name: TELAS[0]?.nome ?? '' });
  await expect(boas).toBeVisible();
  if (tela !== 'boas') {
    await boas.getByRole('button', { name: 'Vamos' }).click();
    if (tela === 'comecar') {
      await page.getByRole('button', { name: 'Pular o passeio' }).click();
    } else {
      const passo = Number(tela.slice(-1));
      for (let i = 1; i < passo; i += 1) {
        await page.getByRole('button', { name: 'Seguir' }).click();
      }
    }
  }
  const alvo = TELAS.find((t) => t.tela === tela);
  const folha = page.getByRole('dialog', { name: alvo?.nome ?? '' });
  await expect(folha).toBeVisible();
  await expect(folha.getByRole('heading', { level: 2 })).toBeFocused();
  return folha;
}

/** Todo botão e link da tela tem 44 px de lado, no mínimo (0,01 de folga para o arredondamento). */
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

/** Todo botão cabe na largura da folha e se alcança (a tela rola por dentro, o corpo ou ela toda). */
async function botoesAoAlcance(page: Page, folha: Locator, botoes: string[]) {
  const caixaDaFolha = await folha.boundingBox();
  expect(caixaDaFolha, 'a folha').not.toBeNull();
  for (const nome of botoes) {
    const botao = folha.getByRole('button', { name: nome, exact: true });
    await botao.scrollIntoViewIfNeeded();
    await expect(botao, nome).toBeInViewport({ ratio: 1 });
    const caixa = await botao.boundingBox();
    expect(caixa?.x ?? -1, `${nome}: borda esquerda`).toBeGreaterThanOrEqual(
      (caixaDaFolha?.x ?? 0) - 0.5,
    );
    expect((caixa?.x ?? 0) + (caixa?.width ?? 0), `${nome}: borda direita`).toBeLessThanOrEqual(
      (caixaDaFolha?.x ?? 0) + (caixaDaFolha?.width ?? 0) + 0.5,
    );
  }
  expect(await rolagemLateral(page), 'rolagem lateral').toEqual({ pagina: 0, folha: 0 });
}

test.describe('as cinco telas da Chegada', () => {
  for (const { tela, nome, botoes } of TELAS) {
    test(`${nome}: axe nos dois temas, alvos de 44 px e o Zé inteiro dentro da folha`, async ({
      page,
    }) => {
      const folha = await irAte(page, tela);
      await expect(folha.getByRole('button')).toHaveText(botoes);
      await semViolacoes(page);
      await alvosDe44(folha);

      const zes = folha.locator('svg.ze');
      await expect(zes).toHaveCount(1);
      await expect(zes).toBeVisible();
      const caixaDoZe = await zes.boundingBox();
      const caixaDaFolha = await folha.boundingBox();
      expect(caixaDoZe?.width ?? 0).toBeGreaterThan(40);
      expect(caixaDoZe?.x ?? -1).toBeGreaterThanOrEqual(caixaDaFolha?.x ?? 0);
      expect((caixaDoZe?.x ?? 0) + (caixaDoZe?.width ?? 0)).toBeLessThanOrEqual(
        (caixaDaFolha?.x ?? 0) + (caixaDaFolha?.width ?? 0) + 0.5,
      );
    });

    test(`${nome}: no celular pequeno, a 200% de zoom e com texto a 200%, tudo se alcança e nada rola de lado`, async ({
      page,
    }) => {
      const folha = await irAte(page, tela);

      await test.step('320 × 568', async () => {
        await page.setViewportSize({ width: 320, height: 568 });
        await botoesAoAlcance(page, folha, botoes);
      });

      await test.step('200% de zoom em 390 × 800 (195 × 400 px de layout)', async () => {
        await page.setViewportSize({ width: 195, height: 400 });
        await botoesAoAlcance(page, folha, botoes);
      });

      await test.step('texto a 200% numa tela de celular (CSSOM: a CSP barra <style> e style="")', async () => {
        await page.setViewportSize({ width: 390, height: 800 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
        await botoesAoAlcance(page, folha, botoes);
      });
    });
  }
});

test.describe('o passeio refeito na Conta', () => {
  // Aqui a Chegada não abre sozinha: o aparelho já a viu.
  test.use({ semearAbertura: true });

  test('"Fazer o passeio" abre os quatro passos direto; "Concluir" fecha, devolve o foco e nada é gravado', async ({
    page,
  }) => {
    await page.goto('/#/conta');
    const abrir = page.getByRole('button', { name: 'Fazer o passeio' });
    await abrir.click();
    const primeiro = page.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' });
    await expect(primeiro).toBeVisible();
    await expect(primeiro.getByRole('button', { name: 'Voltar ao app' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' })).toHaveCount(0);

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: 'Seguir' }).click();
    }
    await expect(page.getByRole('dialog', { name: 'Passo 4 de 4 Biblioteca' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Seguir' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Concluir' }).click();

    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Vamo começar?' })).toHaveCount(0);
    await expect(abrir).toBeFocused();
    expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_CHEGADA)).toBe(
      '{"vista":true}',
    );
  });

  test('"Voltar ao app", "Pular o passeio" e Esc fecham a folha e devolvem o foco ao botão', async ({
    page,
  }) => {
    await page.goto('/#/conta');
    const abrir = page.getByRole('button', { name: 'Fazer o passeio' });

    await abrir.click();
    await page.getByRole('button', { name: 'Voltar ao app' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(abrir).toBeFocused();

    await abrir.click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    await page.getByRole('button', { name: 'Pular o passeio' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(abrir).toBeFocused();

    await abrir.click();
    await expect(page.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(abrir).toBeFocused();
  });

  test('a linha da Conta passa no axe nos dois temas e o botão tem 44 px', async ({ page }) => {
    await page.goto('/#/conta');
    const abrir = page.getByRole('button', { name: 'Fazer o passeio' });
    await expect(abrir).toBeVisible();
    const caixa = await abrir.boundingBox();
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(43.99);
    await semViolacoes(page);
  });
});
