import type { Locator } from '@playwright/test';
import { expect, test } from './apoio';

// A caixa e o rádio têm 22 px fixos; a marca de dentro tem de ficar em px, senão cresce com a fonte e
// estoura a caixa quando o texto vai a 200% (o `::after` só se mede pelo estilo calculado).

function medida(campo: Locator) {
  return campo.evaluate((el) => {
    const m = getComputedStyle(el, '::after');
    // Em content-box a borda (a mesma em baixo e à esquerda) soma ao tamanho calculado.
    const borda = m.boxSizing === 'border-box' ? 0 : parseFloat(m.borderLeftWidth) || 0;
    const largura = parseFloat(m.width) + borda;
    const altura = parseFloat(m.height) + borda;
    return {
      largura,
      altura,
      // A marca da caixa gira 45°: o que ocupa é (largura + altura) / √2.
      lado: (largura + altura) / Math.SQRT2,
      caixa: el.clientWidth,
    };
  });
}

test('a marca da caixa e do rádio não cresce com o texto a 200% e cabe na caixa', async ({
  page,
}) => {
  await page.goto('/#/conta/aparencia');
  const caixa = page.getByLabel('Régua de leitura');
  const radio = page.getByLabel('Escuro');
  await caixa.check();
  await radio.check();
  const antesCaixa = await medida(caixa);
  const antesRadio = await medida(radio);
  expect(antesCaixa.lado).toBeLessThanOrEqual(antesCaixa.caixa);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const depoisCaixa = await medida(caixa);
  const depoisRadio = await medida(radio);
  expect(depoisCaixa.largura).toBe(antesCaixa.largura);
  expect(depoisCaixa.altura).toBe(antesCaixa.altura);
  expect(depoisCaixa.lado).toBeLessThanOrEqual(depoisCaixa.caixa);
  expect(depoisRadio.largura).toBe(antesRadio.largura);
  expect(depoisRadio.altura).toBe(antesRadio.altura);
});
