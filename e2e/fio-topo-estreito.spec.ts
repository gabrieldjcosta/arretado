import { expect, test } from './apoio';

// O cabeçalho do Fio numa linha só em tela estreita: menu, nome e Ajuda lado a lado, sem a Ajuda cair para a 2ª
// linha (a 320 px caía por 20 px). Mede-se a altura do cabeçalho e a posição da Ajuda, não o texto.
test.use({ launchOptions: { args: ['--font-render-hinting=full'] } });

for (const largura of [320, 340, 360]) {
  test(`o cabeçalho cabe numa linha a ${String(largura)} px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 640 });
    await page.goto('/#/biblioteca');
    await expect(page.locator('.fio-topo')).toBeVisible();
    const caixas = await page.evaluate(() => {
      const caixa = (s: string) => {
        const b = document.querySelector(s)?.getBoundingClientRect();
        return b ? { esq: b.left, dir: b.right, topo: b.top, alt: b.height } : null;
      };
      return {
        topo: caixa('.fio-topo'),
        menu: caixa('.fio-menu'),
        marca: caixa('.fio-marca'),
        ajuda: caixa('.ajuda-botao'),
      };
    });
    const { topo, menu, marca, ajuda } = caixas;
    if (!topo || !menu || !marca || !ajuda) throw new Error('faltou parte do cabeçalho');
    // Uma linha: 3,5 rem (56 px), e a Ajuda na mesma altura do menu.
    expect(topo.alt).toBeLessThanOrEqual(57);
    expect(Math.abs(ajuda.topo - menu.topo)).toBeLessThan(2);
    // Lado a lado, sem se sobrepor.
    expect(marca.esq).toBeGreaterThanOrEqual(menu.dir - 1);
    expect(ajuda.esq).toBeGreaterThanOrEqual(marca.dir - 1);
    // Sem rolagem lateral.
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBe(0);
  });
}
