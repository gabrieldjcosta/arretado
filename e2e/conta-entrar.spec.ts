import { test, expect, semViolacoes } from './apoio';
import { entrarPorCodigo, registrarFrase } from './conta-apoio';

// Roda no build do E2E da conta (`--mode e2e-conta`, T30): serviço de conta falso, sem rede.

test.describe('Entrar, aceite e sair (F4-A)', () => {
  test('o texto do aceite vem antes do botão, e a tela passa no axe nos 2 temas', async ({
    page,
  }) => {
    await page.goto('/#/conta/entrar');
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'O que sai do seu Aparelho' })).toBeVisible();
    await expect(
      page.getByText(/você aceita este texto e a política de privacidade/),
    ).toBeVisible();
    await semViolacoes(page);
  });

  test('Privacidade passa no axe nos 2 temas', async ({ page }) => {
    await page.goto('/#/conta/privacidade');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await semViolacoes(page);
  });

  test('código errado não entra; o certo leva a Conta e grava o aceite', async ({ page }) => {
    await page.goto('/#/conta/entrar');
    await page.getByLabel(/receba um código/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill('000000');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Código inválido ou vencido');
    await expect(page).toHaveURL(/#\/conta\/entrar$/);

    await page.getByLabel(/código de 6 dígitos/i).fill('123456');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/#\/conta$/);
    await expect(page.getByText('ana@exemplo.com')).toBeVisible();
    await semViolacoes(page);
  });

  test('Google simulado: volta do desvio já dentro da conta', async ({ page }) => {
    await page.goto('/#/conta/entrar');
    await page.getByRole('button', { name: 'Entrar com o Google' }).click();
    await expect(page).toHaveURL(/#\/conta$/);
    await expect(page.getByText('google@exemplo.com')).toBeVisible();
  });

  test('entrar como A, estudar, sair e entrar como B: B não vê o estudo de A', async ({ page }) => {
    await entrarPorCodigo(page, 'a@exemplo.com');
    await registrarFrase(page, 'Frase exclusiva da conta A.');

    await page.goto('/#/conta');
    await page.getByRole('button', { name: 'Sair…' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Entrar com uma conta' })).toBeVisible();

    await entrarPorCodigo(page, 'b@exemplo.com');
    await expect(page.getByText('b@exemplo.com')).toBeVisible();
    await expect(page.getByText('a@exemplo.com')).toBeVisible(); // listada em "Outras contas"
    await page.goto('/#/recall/frases');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Frase exclusiva da conta A.')).toHaveCount(0);

    // De volta à conta A (sem pedir código de novo), o estudo dela está lá.
    await page.goto('/#/conta');
    await page.getByRole('button', { name: 'Usar esta conta' }).click();
    await expect(page.locator('strong', { hasText: 'a@exemplo.com' })).toBeVisible();
    await page.goto('/#/recall/frases');
    await expect(page.getByText('Frase exclusiva da conta A.')).toBeVisible();
  });
});
