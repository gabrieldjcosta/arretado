import { test as base, expect } from '@playwright/test';

/** Página que registra violações de CSP e erros de console desde o primeiro script. */
export const test = base.extend<{ violacoes: string[]; errosConsole: string[] }>({
  violacoes: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __violacoes: string[] };
        w.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__violacoes.push(`${e.violatedDirective}: ${e.blockedURI}`);
        });
      });
      const lista: string[] = [];
      await use(lista);
      const doNavegador = await page
        .evaluate(() => (window as unknown as { __violacoes?: string[] }).__violacoes ?? [])
        .catch(() => []);
      lista.push(...doNavegador);
    },
    { auto: true },
  ],
  errosConsole: async ({ page }, use) => {
    const erros: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    page.on('pageerror', (e) => erros.push(e.message));
    await use(erros);
  },
});

export { expect };

export async function violacoesDaPagina(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violacoes?: string[] }).__violacoes ?? []);
}
