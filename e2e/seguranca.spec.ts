import { expect, test, violacoesDaPagina } from './apoio';

test.describe('CSP (D18)', () => {
  test('está presente e o app carrega sem violação nem erro', async ({
    page,
    violacoes,
    errosConsole,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Arretado' })).toBeVisible();
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(await violacoesDaPagina(page)).toEqual([]);
    expect(errosConsole).toEqual([]);
    expect(violacoes).toEqual([]);
  });

  test('bloqueia script em linha e atribuição de HTML bruto', async ({ page }) => {
    await page.goto('/');
    const resultado = await page.evaluate(() => {
      const w = window as unknown as { __executou?: boolean };
      let bloqueouScript = false;
      try {
        const s = document.createElement('script');
        s.textContent = 'window.__executou = true';
        document.body.appendChild(s);
      } catch {
        bloqueouScript = true;
      }
      let bloqueouHtml = false;
      try {
        const d = document.createElement('div');
        d.innerHTML = '<img src=x onerror="window.__executou = true">';
      } catch {
        bloqueouHtml = true;
      }
      return { executou: w.__executou === true, bloqueouScript, bloqueouHtml };
    });
    expect(resultado.executou).toBe(false);
    expect(resultado.bloqueouScript).toBe(true);
    expect(resultado.bloqueouHtml).toBe(true);
    await expect.poll(async () => (await violacoesDaPagina(page)).length).toBeGreaterThan(0);
  });
});
