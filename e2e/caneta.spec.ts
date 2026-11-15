import { expect, semViolacoes, test } from './apoio';

// A passagem do cartão na revisão (D-D7). Os testes de unidade não têm layout nem animação; aqui roda de verdade.

const DIA = 86_400_000;

test('Revisar: o cartão passa para o seguinte e não deixa animação nem deslocamento para trás', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  for (const frente of ['Primeira pergunta', 'Segunda pergunta']) {
    await page.goto('/#/recall/cartoes/novo');
    await page.getByLabel('Frente (pergunta)').fill(frente);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  }

  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/#/recall/revisar');
  await page.reload();
  await expect(page.getByText('1 de 2')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('3');
  await expect(page.getByText('2 de 2')).toBeVisible();

  // Quando a passagem termina, o cartão está inteiro e no lugar, sem animação pendente.
  const cartao = page.locator('.cartao-drill');
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(cartao).toHaveCSS('opacity', '1');
  await expect(cartao).toHaveCSS('transform', 'none');
  await expect(page.getByText(/Primeira pergunta|Segunda pergunta/)).toHaveCount(1);
  await semViolacoes(page);
});
