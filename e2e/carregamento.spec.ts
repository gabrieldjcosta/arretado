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
