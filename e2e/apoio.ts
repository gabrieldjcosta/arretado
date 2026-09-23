import { test as base, expect, type Page } from '@playwright/test';

interface Opcoes {
  /** Para testes que provocam violação de CSP de propósito. */
  permitirViolacoes: boolean;
  /** Para testes que provocam falha no console de propósito. */
  permitirFalhasConsole: boolean;
}

/**
 * Toda página registra violações de CSP e falhas de console desde o primeiro script;
 * ao fim de cada teste, qualquer ocorrência não permitida falha o teste.
 */
export const test = base.extend<Opcoes & { vigiar: undefined }>({
  permitirViolacoes: [false, { option: true }],
  permitirFalhasConsole: [false, { option: true }],
  vigiar: [
    async ({ page, permitirViolacoes, permitirFalhasConsole }, use) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __violacoes: string[] };
        w.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__violacoes.push(
            `${e.violatedDirective}: ${e.blockedURI} ${e.sample} @ ${e.sourceFile}:${String(e.lineNumber)}:${String(e.columnNumber)}`,
          );
        });
      });
      const falhas: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') falhas.push(m.text());
      });
      page.on('pageerror', (e) => falhas.push(e.message));

      await use(undefined);

      if (!permitirViolacoes) {
        const violacoes = await violacoesDaPagina(page).catch(() => []);
        expect(violacoes, 'violações de CSP').toEqual([]);
      }
      if (!permitirFalhasConsole) expect(falhas, 'falhas no console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function violacoesDaPagina(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violacoes?: string[] }).__violacoes ?? []);
}
