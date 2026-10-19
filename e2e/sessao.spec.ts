import type { Locator } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

test('Sessão leve: começa, pausa, volta ao reabrir, fecha com próximo passo (A2)', async ({
  page,
}) => {
  await page.goto('/#/sessao/iniciar');
  await expect(page.getByRole('heading', { level: 1, name: 'Começar uma Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByText('Definir até onde (opcional)').click();
  await page.getByLabel('O que vai estudar?').fill('Lei de Execução Penal');
  await page.getByLabel('Até onde?').fill('até o art. 15');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pausada' })).toBeVisible();
  await semViolacoes(page);

  // Ao voltar (recarregar), a Sessão aberta continua lá.
  await page.reload();
  await expect(page.getByText('Até onde: até o art. 15')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à Sessão' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

  await page.getByRole('link', { name: 'Encerrar' }).click();
  const campo = page.getByLabel('Próximo passo (opcional)');
  await expect(campo).toHaveValue('Continuar depois de até o art. 15');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
  await semViolacoes(page);
});

test('Hoje: fechar o Dia depois de uma Sessão e reabrir (A3b)', async ({ page }) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();

  await page.goto('/#/');
  const bloco = page.getByRole('region', { name: 'Fechar o Dia' });
  await expect(bloco).toContainText('1 Sessão');
  await semViolacoes(page);
  await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
  await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
  await semViolacoes(page);
  await bloco.getByRole('button', { name: 'Reabrir o Dia' }).click();
  await expect(bloco.getByRole('button', { name: 'Fechar o Dia' })).toBeVisible();
});

test('Hoje: o cachorro do Resumo do Dia se desenha ao fechar e aparece pronto com movimento reduzido (P3)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const fecharODia = async () => {
    await page.goto('/#/sessao/iniciar');
    await page.getByRole('button', { name: 'Começar', exact: true }).click();
    await page.getByRole('link', { name: 'Encerrar' }).click();
    await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
    await page.goto('/#/');
    const bloco = page.getByRole('region', { name: 'Fechar o Dia' });
    await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
    await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
    return bloco;
  };
  const animacao = (bloco: Locator) =>
    bloco
      .locator('.traco-do-cachorro .traco-linha')
      .evaluate((el) => getComputedStyle(el).animationName);

  const bloco = await fecharODia();
  // Uma caneta só, largada ao fim do traço, dentro do Resumo.
  await expect(page.locator('svg.caneta')).toHaveCount(1);
  await expect(bloco.locator('svg.caneta')).toHaveAttribute('data-pose', 'deitada');
  expect(await animacao(bloco)).toBe('traco-desenha');

  // Com movimento reduzido, o mesmo Dia fechado mostra o cachorro pronto, sem animação.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Reabrir o Dia' }).click();
  await page.getByRole('button', { name: 'Fechar o Dia' }).click();
  await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
  expect(await animacao(bloco)).toBe('none');
  await semViolacoes(page);
});

test('Alavancas da Sessão: estacionamento, temporizador e só estudo (A3a)', async ({ page }) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();

  const campo = page.getByLabel('Deixar para depois');
  await campo.fill('ver o preço do livro');
  await campo.press('Enter');
  await expect(page.getByText('Guardado para depois.')).toBeVisible();
  await expect(campo).toBeFocused();

  await page.getByRole('button', { name: '25 min' }).click();
  await expect(page.getByText(/Faltam cerca de 25 min/)).toBeVisible();

  await page.getByRole('checkbox', { name: 'Só estudo' }).click();
  await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeHidden();
  await semViolacoes(page);
  await page.getByRole('checkbox', { name: 'Só estudo' }).click();
  await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeVisible();
  await semViolacoes(page);

  // Recarregar não perde nada; ao fechar, a nota aparece para marcar.
  await page.reload();
  await expect(page.getByText('ver o preço do livro')).toBeVisible();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByLabel('ver o preço do livro').click();
  await expect(page.getByLabel('ver o preço do livro')).toBeChecked();
  await semViolacoes(page);
});
