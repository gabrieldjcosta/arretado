import { expect, semViolacoes, test } from './apoio';

// S5: as três abas da Biblioteca e a segunda linha de escolha, sem rolar de lado, sem quebrar palavra
// e com o "onde estou" visível. A rota "Meus textos" mostra as duas linhas.

const ROTA = '/#/biblioteca/resumos';

for (const largura of [320, 360, 390]) {
  test(`abas da Biblioteca: a ${String(largura)} px as três aparecem inteiras, sem rolar o trilho`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(ROTA);
    const trilho = page.getByRole('navigation', { name: 'Seções da Biblioteca' });
    await expect(trilho).toBeVisible();
    expect(await trilho.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const aba of await trilho.getByRole('link').all()) {
      await expect(aba).toBeInViewport({ ratio: 1 });
    }
    if (largura === 320) await semViolacoes(page);
  });
}

test('abas da Biblioteca: com o texto a 200%, o trilho vira fileiras e as escolhas não partem palavra', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ROTA);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const trilho = page.getByRole('navigation', { name: 'Seções da Biblioteca' });
  await expect(trilho).toBeVisible();
  expect(await trilho.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const aba of await trilho.getByRole('link').all()) {
    await expect(aba).toBeInViewport({ ratio: 1 });
  }
  // Cada escolha ("Resumos", "Precedentes") fica numa linha só: nenhuma palavra parte no meio.
  const escolhas = page.getByRole('navigation', { name: 'Meus textos' }).getByRole('link');
  await expect(escolhas).toHaveCount(2);
  for (const escolha of await escolhas.all()) {
    const linhas = await escolha.evaluate((el) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(el);
      return new Set([...faixa.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(linhas).toBe(1);
  }
});

for (const esquema of ['light', 'dark'] as const) {
  test(`abas da Biblioteca: a escolha atual se distingue da página com 3:1, ${esquema === 'light' ? 'de dia' : 'de noite'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: esquema });
    await page.goto(ROTA);
    const atual = page
      .getByRole('navigation', { name: 'Meus textos' })
      .locator('a[aria-current="page"]');
    await expect(atual).toHaveText('Resumos');
    // WCAG 1.4.11: o contorno que marca a escolha atual contra o fundo da página.
    const razao = await atual.evaluate((el) => {
      const canais = (css: string): number[] =>
        (/rgba?\(([^)]+)\)/.exec(css)?.[1] ?? '')
          .split(',')
          .slice(0, 3)
          .map((n) => Number(n.trim()) / 255)
          .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      const luz = (css: string) => {
        const [r = 0, g = 0, b = 0] = canais(css);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contorno = luz(getComputedStyle(el).boxShadow);
      const pagina = luz(getComputedStyle(document.body).backgroundColor);
      return (Math.max(contorno, pagina) + 0.05) / (Math.min(contorno, pagina) + 0.05);
    });
    expect(razao).toBeGreaterThanOrEqual(3);
  });
}
