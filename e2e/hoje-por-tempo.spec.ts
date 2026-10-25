import { expect, semViolacoes, test } from './apoio';

// Hoje do tamanho do seu tempo (AP-01): a estimativa promete o que o Drill entrega; o lote sai pela
// escolha de minutos; o que não coube continua na fila.

const DIA = 86_400_000;

test('escolher 5 min: o Hoje mostra 10 cartões, o Drill entrega 10 e o resto fica na fila', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  for (let i = 1; i <= 12; i += 1) {
    await page.goto('/#/recall/cartoes/novo');
    await page.getByLabel('Frente (pergunta)').fill(`Pergunta ${String(i)}`);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  }
  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/#/');
  await page.reload();

  // Sem escolher nada: a folha de sempre, e a estimativa agora bate com a cota de 10 (5 min).
  const agora = page.getByRole('region', { name: 'Agora' });
  await expect(agora.getByText('cerca de 5 min')).toBeVisible();

  const quatro = page.getByRole('group', { name: 'Quanto tempo você tem?' });
  for (const m of ['5 min', '10 min', '25 min', '45 min']) {
    const caixa = await quatro.getByRole('button', { name: m, exact: true }).boundingBox();
    expect(caixa?.height).toBeGreaterThanOrEqual(44);
  }
  await quatro.getByRole('button', { name: '5 min', exact: true }).click();
  await expect(page.getByText(/10 cartões, os mais perto de esquecer/)).toBeVisible();
  await expect(page.getByText(/Os outros 2 cartões continuam na fila/)).toBeVisible();
  await page.getByText('Por que estes?').click();
  await expect(page.locator('.tempo-do-hoje-porque li')).toHaveCount(10);
  await expect(page.getByText(/atrasad|pendente|dívida/i)).toHaveCount(0);
  await semViolacoes(page);

  await page.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByText('1 de 10')).toBeVisible();

  // Escolher 10 min leva os 12 que há (20 caberiam).
  await page.goto('/#/');
  await page.getByRole('button', { name: '10 min', exact: true }).click();
  await expect(page.getByText(/12 cartões, os mais perto de esquecer/)).toBeVisible();
  await page.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByText('1 de 12')).toBeVisible();
});
