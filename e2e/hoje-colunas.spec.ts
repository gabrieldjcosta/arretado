import type { Page } from '@playwright/test';
import { expect, test } from './apoio';

// O Hoje em duas colunas e o "Para lembrar" (P7b). O teste de componente prova o que o campo grava;
// aqui se mede onde cada coluna fica e que o texto sobrevive a recarregar a página.

interface Caixa {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

const coluna = (page: Page, n: 0 | 1) => page.locator('.hoje-colunas > div').nth(n);

const caixa = (page: Page, n: 0 | 1) =>
  coluna(page, n).evaluate((el): Caixa => {
    const r = el.getBoundingClientRect();
    return { esquerda: r.left, direita: r.right, topo: r.top, base: r.bottom };
  });

test('a partir de 900 px o Agora fica à esquerda e o Para lembrar à direita; abaixo, uma coluna só', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'o tamanho da janela é do teste; basta um projeto');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(
    coluna(page, 0).getByRole('heading', { level: 2, name: 'Por onde começar?' }),
  ).toBeVisible();
  await expect(coluna(page, 1).getByRole('textbox', { name: 'Para lembrar' })).toBeVisible();

  await page.setViewportSize({ width: 899, height: 800 });
  await expect
    .poll(async () => (await caixa(page, 1)).topo >= (await caixa(page, 0)).base, {
      message: 'uma coluna só a 899 px',
    })
    .toBe(true);
  expect((await caixa(page, 1)).esquerda).toBe((await caixa(page, 0)).esquerda);

  for (const largura of [900, 1024, 1280, 1920]) {
    await page.setViewportSize({ width: largura, height: 800 });
    await expect
      .poll(async () => (await caixa(page, 1)).esquerda >= (await caixa(page, 0)).direita, {
        message: `duas colunas a ${String(largura)} px`,
      })
      .toBe(true);
    const [agora, lembrar] = [await caixa(page, 0), await caixa(page, 1)];
    expect(lembrar.topo, `as duas começam no mesmo alto a ${String(largura)}`).toBeCloseTo(
      agora.topo,
      0,
    );
    const proporcao = (agora.direita - agora.esquerda) / (lembrar.direita - lembrar.esquerda);
    expect(proporcao, `7 para 5 a ${String(largura)}`).toBeGreaterThan(1.38);
    expect(proporcao, `7 para 5 a ${String(largura)}`).toBeLessThan(1.42);
    const rolaDeLado = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(rolaDeLado, `sem rolagem lateral a ${String(largura)}`).toBe(false);
  }
});

test('o Para lembrar: escrever, salvar e ainda estar lá depois de recarregar', async ({ page }) => {
  await page.goto('/');
  const campo = page.getByRole('textbox', { name: 'Para lembrar' });
  await campo.fill('Ligar para o cartório');
  await expect(page.getByRole('status').filter({ hasText: 'Ainda não salvo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Salvo.' })).toBeVisible();

  await page.reload();
  await expect(campo).toHaveValue('Ligar para o cartório');
  await expect(page.getByText('Ainda não salvo.')).toBeHidden();
});

test('o Para lembrar grava ao sair do campo, sem apertar Salvar', async ({ page }) => {
  await page.goto('/');
  const campo = page.getByRole('textbox', { name: 'Para lembrar' });
  await campo.fill('Pedir o livro de Processo Penal');
  await page.getByRole('heading', { level: 1, name: 'Hoje' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Salvo.' })).toBeVisible();

  await page.reload();
  await expect(campo).toHaveValue('Pedir o livro de Processo Penal');
});
