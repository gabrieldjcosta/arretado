import { expect, semViolacoesNoFio, test } from './apoio';
import { entrarPorCodigo } from './conta-apoio';

// A folha da Conta do Fio com a chave de contas ligada (o build do serviço falso, T30): sem conta oferece entrar; com
// conta mostra quem é, o anel se fecha e "Sair desta conta" leva à tela que confirma.

async function abrirAConta(page: import('@playwright/test').Page) {
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Menu: sua conta e ajustes' }).click();
  return page.getByRole('dialog');
}

test('sem conta, a folha leva a entrar pela tela que tem o aceite', async ({ page }) => {
  const folha = await abrirAConta(page);
  await expect(folha.getByRole('button', { name: /Entrar com o Google/ })).toBeVisible();
  await expect(folha.getByRole('button', { name: /Sair desta conta/ })).toHaveCount(0);
  await semViolacoesNoFio(page);
  await folha.getByRole('button', { name: /Prefiro receber um código/ }).click();
  await expect(page).toHaveURL(/#\/conta\/entrar$/);
});

test('com conta, a folha mostra o e-mail, o anel preso e o caminho de sair', async ({ page }) => {
  await entrarPorCodigo(page, 'maria@exemplo.com');
  const folha = await abrirAConta(page);
  await expect(folha.getByRole('heading', { level: 2, name: 'Sua conta' })).toBeVisible();
  await expect(folha.getByText('maria@exemplo.com')).toBeVisible();
  await expect(folha.getByRole('button', { name: /Entrar com o Google/ })).toHaveCount(0);
  await expect(page.locator('.m-cm-anel.m-preso')).toHaveCount(1);
  await semViolacoesNoFio(page);
  await folha.getByRole('button', { name: /Sair desta conta/ }).click();
  await expect(page).toHaveURL(/#\/conta$/);
});
