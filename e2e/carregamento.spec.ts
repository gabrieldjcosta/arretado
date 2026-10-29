import { expect, test } from './apoio';

// A tela de carregamento do index.html (D-D10, Apêndice F do contrato do Zé): o Zé vem no HTML, antes do
// pacote, e sai quando o app abre. Aqui o pacote principal é segurado para ver só o que o HTML traz.
const PACOTE = '**/assets/index-*.js';

/** Salta no relógio das animações CSS (o `page.clock` não as move). */
const saltar = (tempo: number) => {
  document.getAnimations().forEach((a) => {
    a.pause();
    a.currentTime = tempo;
  });
};

test('o Zé vem no HTML, antes do pacote: desenha, e a espera longa ganha texto e "Tentar de novo"', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(PACOTE, () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  const tela = page.locator('#carregamento');
  await expect(tela).toHaveAttribute('role', 'status');
  await expect(tela.locator('.carr-sr')).toHaveText('Abrindo o Arretado');

  await page.evaluate(saltar, 300);
  await expect(tela.locator('.carr-ze')).toHaveCSS('opacity', '0');
  await page.evaluate(saltar, 1100);
  await expect(tela.locator('.carr-linha')).not.toHaveCSS('stroke-dashoffset', '0px');
  await page.evaluate(saltar, 2500);
  await expect(tela.locator('.carr-ze')).toHaveCSS('opacity', '1');
  await expect(tela.locator('.carr-linha')).toHaveCSS('stroke-dashoffset', '0px');
  await expect(tela.locator('.carr-a')).toBeHidden();

  await page.evaluate(saltar, 6600);
  await expect(tela.locator('.carr-a')).toContainText('Abrindo o Arretado');
  await page.evaluate(saltar, 26000);
  await expect(tela.locator('.carr-b')).toContainText('Está demorando mais do que o normal.');
  await tela.getByRole('link', { name: 'Tentar de novo' }).focus();
  await expect(tela.getByRole('link', { name: 'Tentar de novo' })).toBeFocused();
});

test('com movimento reduzido o Zé aparece pronto: só a entrada e os textos animam', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(PACOTE, () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(saltar, 1200);
  await expect(page.locator('#carregamento .carr-ze')).toHaveCSS('opacity', '1');
  await expect(page.locator('#carregamento .carr-linha')).toHaveCSS('stroke-dashoffset', '0px');
  const nomes = await page.evaluate(() =>
    document.getAnimations().map((a) => (a as CSSAnimation).animationName),
  );
  expect(nomes.length).toBeGreaterThan(0);
  expect(nomes.every((n) => ['carr-entra', 'carr-texto', 'carr-some'].includes(n))).toBe(true);
});

test('quando o app abre, a tela sai da árvore e o Hoje fica sozinho', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(page.locator('#carregamento')).toHaveCount(0);
});

/** Anota, a cada quadro e sem repetir, o que está à vista: a camada da Abertura, o app, a tela ou nada (um branco). */
function sondarOsQuadros() {
  const quadros: string[] = [];
  (window as unknown as { __quadros: string[] }).__quadros = quadros;
  const classe = () => {
    if (document.querySelector('.abertura')) return 'camada';
    if (document.querySelector('.marca')) return 'app';
    const tela = document.getElementById('carregamento');
    return tela && !tela.hasAttribute('data-saindo') ? 'carregamento' : 'branco';
  };
  const quadro = () => {
    const atual = classe();
    if (quadros[quadros.length - 1] !== atual) quadros.push(atual);
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

test.describe('com a Abertura (a primeira vez no aparelho)', () => {
  test.use({ semearEscrita: false });

  test('a Abertura cobre a tela: a tela só sai quando o app monta, e nunca deixa um branco entre as duas', async ({
    page,
  }) => {
    // Uma CPU lenta alonga a leitura que decide a Abertura; é nesse intervalo que a tela, saindo cedo, deixava um branco.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(sondarOsQuadros);
    await page.goto('/');
    await expect(page.locator('.abertura')).toBeVisible();
    // A tela esmaece por baixo da camada (200 ms); esperar que saia da árvore deixa a sequência inteira à vista.
    await expect(page.locator('#carregamento')).toHaveCount(0);
    const quadros = await page.evaluate(
      () => (window as unknown as { __quadros: string[] }).__quadros,
    );
    // Os primeiros quadros podem vir antes de o HTML pintar a tela; o que conta é o que vem depois.
    const vistos = quadros.slice(quadros.findIndex((q) => q !== 'branco'));
    expect(vistos).toContain('carregamento');
    expect(vistos).toContain('camada');
    expect(vistos).not.toContain('branco');
  });
});
