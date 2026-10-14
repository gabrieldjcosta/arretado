import { expect, semViolacoes, test } from './apoio';

test('Onboarding do plano: carreira, edital, matérias e "Comece por aqui" (B2)', async ({
  page,
}) => {
  await page.goto('/#/plano/onboarding');
  await expect(
    page.getByRole('heading', { name: 'Para qual carreira você estuda?' }),
  ).toBeVisible();
  await semViolacoes(page);

  await page.getByRole('radio', { name: 'Ministério Público (Promotor)' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('radio', { name: /edital MPGO de 2023/ })).toBeChecked();
  await semViolacoes(page);

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Quais matérias entram no plano?' }),
  ).toBeVisible();
  await page
    .getByText(/^Assuntos \(\d+\)$/)
    .first()
    .click();
  await semViolacoes(page);

  // Fechar e reabrir o app no meio: volta de onde parou.
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Quais matérias entram no plano?' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(/pontos em \d+ matérias/)).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Criar meu plano' }).click();
  await expect(page.getByText(/Comece por aqui:/)).toBeVisible();
  await semViolacoes(page);

  await page.getByRole('link', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Começar uma Sessão' })).toBeVisible();
});
