import { expect, semViolacoes, test } from './apoio';

test('Onboarding do plano: carreira, edital, matérias e "Comece por aqui" (B2)', async ({
  page,
}) => {
  test.setTimeout(90_000);
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
    .getByText(/^Assuntos de /)
    .first()
    .click();
  await semViolacoes(page);

  // Desmarcar um assunto troca o selo para "N de M"; desmarcar a matéria esmaece o galho.
  const primeira = page.locator('.onboarding-cartao').first();
  await primeira.locator('.onboarding-assuntos input[type="checkbox"]').first().uncheck();
  await expect(primeira.locator('summary .selo')).toHaveText(/^\d+ de \d+$/);
  await primeira.locator('.onboarding-cabeca input[type="checkbox"]').uncheck();
  await semViolacoes(page);
  await primeira.locator('.onboarding-cabeca input[type="checkbox"]').check();

  // Acrescentar matéria e assunto; repetido não entra.
  await page.getByLabel('+ Acrescentar disciplina').fill('Matéria Inventada');
  await page.getByRole('button', { name: 'Acrescentar disciplina' }).click();
  const campo = page.getByLabel('+ Acrescentar assunto em Matéria Inventada');
  await expect(campo).toBeFocused();
  await campo.fill('Assunto Inventado');
  await campo.press('Enter');
  await expect(page.getByText('Assunto Inventado')).toBeVisible();
  await expect(campo).toBeFocused();
  await campo.fill('assunto inventado');
  await campo.press('Enter');
  await expect(page.getByText('Isso já está na lista.')).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();

  await page.goto('/#/plano');
  await expect(page.getByText('Matéria Inventada').first()).toBeVisible();
});
