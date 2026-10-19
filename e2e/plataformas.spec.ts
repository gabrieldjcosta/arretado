import { expect, test } from './apoio';

// O que a plataforma lê do site (D-D7, P7): o que o index.html declara, o manifest com os ícones e a
// cor da barra. As áreas seguras do aparelho (entalhe, barra de início) ficam em areas-seguras.spec.ts.

test('o index.html estende a página até a borda e liga ícones, manifest e cor da barra', async ({
  page,
}) => {
  await page.goto('/');
  const cabeca = await page.evaluate(() => ({
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
    cores: Array.from(document.querySelectorAll('meta[name="theme-color"]'), (m) => [
      m.getAttribute('media'),
      m.getAttribute('content'),
    ]),
    links: Array.from(
      document.querySelectorAll(
        'link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]',
      ),
      (l) => [l.getAttribute('rel'), (l as HTMLLinkElement).href],
    ),
  }));
  expect(cabeca.viewport).toContain('viewport-fit=cover');
  expect(cabeca.cores).toEqual([
    ['(prefers-color-scheme: light)', '#f1e6d3'],
    ['(prefers-color-scheme: dark)', '#0b1b33'],
  ]);
  // Cada link responde 200 com o tipo certo (a CSP deixa passar: `img-src` e `manifest-src` são 'self').
  for (const [rel, href] of cabeca.links) {
    const resposta = await page.request.get(href ?? '');
    expect(resposta.status(), `${rel ?? ''} ${href ?? ''}`).toBe(200);
  }
});

test('o manifest abre o app na raiz e os ícones dele existem', async ({ page, baseURL }) => {
  await page.goto('/');
  const href = await page
    .locator('link[rel="manifest"]')
    .evaluate((l) => (l as HTMLLinkElement).href);
  const manifesto = (await (await page.request.get(href)).json()) as {
    start_url: string;
    scope: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(new URL(manifesto.start_url, href).href).toBe(`${baseURL ?? ''}/`);
  expect(new URL(manifesto.scope, href).href).toBe(`${baseURL ?? ''}/`);
  for (const { src, sizes } of manifesto.icons) {
    const resposta = await page.request.get(new URL(src, href).href);
    expect(resposta.headers()['content-type'], src).toBe('image/png');
    const png = await resposta.body();
    expect(`${String(png.readUInt32BE(16))}x${String(png.readUInt32BE(20))}`, src).toBe(sizes);
  }
});

test('a cor da barra acompanha o tema escolhido à mão e volta ao do aparelho', async ({ page }) => {
  const cores = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('meta[name="theme-color"]'), (m) =>
        m.getAttribute('content'),
      ),
    );
  await page.goto('/#/conta/aparencia');
  await page.getByLabel('Escuro').check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  expect(await cores()).toEqual(['#0b1b33', '#0b1b33']);
  await page.getByLabel('Claro').check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  expect(await cores()).toEqual(['#f1e6d3', '#f1e6d3']);
  await page.getByLabel('Igual ao aparelho').check();
  await expect(page.locator('html')).not.toHaveAttribute('data-tema');
  expect(await cores()).toEqual(['#f1e6d3', '#0b1b33']);
});
