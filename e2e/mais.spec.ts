import type { Page } from '@playwright/test';
import { abrirOLembrete, expect, semViolacoes, test } from './apoio';

// O "+" do título (Hoje e Fixar) abre um painel com "Registrar erro" e "Lembrete". O jsdom não aplica CSS
// nem tem <dialog> de verdade; aqui o navegador mede o painel (dentro da tela, alvos de 44 px), roda o foco
// do diálogo modal (o foco volta ao "+" ao fechar) e o axe nos dois temas com o painel e o diálogo abertos.

const mais = (page: Page) => page.getByRole('button', { name: 'Novo registro' });
const painel = (page: Page) => page.locator('.mais-itens');

test.describe('"+" do título', () => {
  test('o painel cabe na tela, tem alvos de 44 px e passa no axe nos dois temas', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    await expect(painel(page)).toHaveCount(0);

    await mais(page).click();
    await expect(mais(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(painel(page)).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.clientWidth);
    const caixas = await painel(page)
      .locator('.mais-item')
      .evaluateAll((itens) =>
        itens.map((i) => {
          const r = i.getBoundingClientRect();
          return { x: r.x, direita: r.right, h: r.height, sobra: i.scrollWidth - i.clientWidth };
        }),
      );
    expect(caixas).toHaveLength(2);
    for (const c of caixas) {
      expect(c.h).toBeGreaterThanOrEqual(44);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.direita).toBeLessThanOrEqual(largura);
      expect(c.sobra).toBeLessThanOrEqual(0);
    }
    // A página não ganha rolagem lateral com o painel aberto.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
    await semViolacoes(page);
  });

  test('Esc fecha o painel e devolve o foco ao "+"', async ({ page }) => {
    await page.goto('/');
    await mais(page).click();
    await expect(painel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(painel(page)).toHaveCount(0);
    await expect(mais(page)).toBeFocused();
  });

  test('"Registrar erro" abre o registro', async ({ page }) => {
    await page.goto('/');
    await mais(page).click();
    await painel(page).getByRole('link', { name: 'Registrar erro' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
  });

  test('"Lembrete" guarda a nota, que continua depois de recarregar, e o foco volta ao "+"', async ({
    page,
  }) => {
    await page.goto('/');
    const dialogo = await abrirOLembrete(page);
    await expect(painel(page)).toHaveCount(0);
    const campo = dialogo.getByRole('textbox', { name: 'Lembrete' });
    await expect(campo).toBeFocused();
    await campo.fill('Levar o diploma ao cartório');
    await semViolacoes(page);
    await dialogo.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialogo.getByText('Salvo.')).toBeVisible();

    // Esc fecha o diálogo modal e o foco volta ao "+".
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(mais(page)).toBeFocused();

    // A nota dura além da página.
    await page.reload();
    const outra = await abrirOLembrete(page);
    await expect(outra.getByRole('textbox', { name: 'Lembrete' })).toHaveValue(
      'Levar o diploma ao cartório',
    );
  });

  test('o texto escrito e não salvo se guarda ao fechar com Esc', async ({ page }) => {
    await page.goto('/');
    const dialogo = await abrirOLembrete(page);
    await dialogo.getByRole('textbox', { name: 'Lembrete' }).fill('Pedir a certidão');
    await expect(dialogo.getByText('Ainda não salvo.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();

    await page.reload();
    const outra = await abrirOLembrete(page);
    await expect(outra.getByRole('textbox', { name: 'Lembrete' })).toHaveValue('Pedir a certidão');
  });

  test('o Lembrete grava ao sair do campo, sem apertar Salvar', async ({ page }) => {
    await page.goto('/');
    const dialogo = await abrirOLembrete(page);
    await dialogo
      .getByRole('textbox', { name: 'Lembrete' })
      .fill('Pedir o livro de Processo Penal');
    await dialogo.getByRole('heading', { level: 2, name: 'Lembrete' }).click();
    // O aviso "Salvo.", e só ele: `hasText: 'Salvo.'` casaria também "Ainda não salvo." (sem diferenciar maiúscula).
    await expect(dialogo.getByRole('status').filter({ hasText: /^Salvo\.$/ })).toBeVisible();

    await page.reload();
    const outra = await abrirOLembrete(page);
    await expect(outra.getByRole('textbox', { name: 'Lembrete' })).toHaveValue(
      'Pedir o livro de Processo Penal',
    );
  });

  test('o Fixar tem o mesmo "+", com as duas opções', async ({ page }) => {
    await page.goto('/#/recall');
    await expect(page.getByRole('heading', { level: 1, name: 'Fixar' })).toBeVisible();
    await mais(page).click();
    await expect(painel(page).getByRole('link', { name: 'Registrar erro' })).toBeVisible();
    await expect(painel(page).getByRole('button', { name: 'Lembrete' })).toBeVisible();
  });
});
