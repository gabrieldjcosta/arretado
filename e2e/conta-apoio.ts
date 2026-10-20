import type { Page } from '@playwright/test';
import { expect } from './apoio';

/** Código fixo do serviço de conta do build de E2E (`src/integracoes/conta/falso-e2e.ts`). */
export const CODIGO_DE_TESTE = '123456';

/** Entra pelo código por e-mail e espera a página para onde a tela manda (recarga incluída). */
export async function entrarPorCodigo(page: Page, email: string, destino: RegExp = /#\/conta$/) {
  await page.goto('/#/conta/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await page.getByLabel(/receba um código/i).fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await page.getByLabel(/código de 6 dígitos/i).fill(CODIGO_DE_TESTE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(destino);
  // A tela recarrega a página depois de trocar o hash: só segue quando a conta já aparece no app novo.
  await expect(page.locator('strong', { hasText: email })).toBeVisible();
}

/** Registra uma Frase correta pela tela de registro (precisa de um espaço de estudo aberto). */
export async function registrarFrase(page: Page, frase: string) {
  await page.goto('/#/recall/registrar');
  await page.getByLabel('Frase correta').fill(frase);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
}
