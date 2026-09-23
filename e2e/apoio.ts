import { test as base, expect, type Page } from '@playwright/test';

interface Opcoes {
  /** Para testes que provocam violação de CSP de propósito. */
  permitirViolacoes: boolean;
  /** Para testes que provocam erro de console de propósito. */
  permitirErrosConsole: boolean;
}

/**
 * Toda página registra violações de CSP e erros de console desde o primeiro script;
 * ao fim de cada teste, qualquer ocorrência não permitida falha o teste.
 */
export const test = base.extend<Opcoes & { vigiar: undefined }>({
  permitirViolacoes: [false, { option: true }],
  permitirErrosConsole: [false, { option: true }],
  vigiar: [
    async ({ page, permitirViolacoes, permitirErrosConsole }, use) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __violacoes: string[] };
        w.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__violacoes.push(
            `${e.violatedDirective}: ${e.blockedURI} ${e.sample} @ ${e.sourceFile}:${String(e.lineNumber)}:${String(e.columnNumber)}`,
          );
        });
      });
      const erros: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') erros.push(m.text());
      });
      page.on('pageerror', (e) => erros.push(e.message));

      await use(undefined);

      if (!permitirViolacoes) {
        const violacoes = await violacoesDaPagina(page).catch(() => []);
        expect(violacoes, 'violações de CSP').toEqual([]);
      }
      if (!permitirErrosConsole) expect(erros, 'erros de console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function violacoesDaPagina(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violacoes?: string[] }).__violacoes ?? []);
}
