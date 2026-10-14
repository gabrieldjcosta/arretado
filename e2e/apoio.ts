import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
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

/** O colado do corpus (Chromium 141, Linux), lido no Node: não abrir inteiro, tem centenas de KB. */
async function colado(id: string) {
  const pasta = new URL('../corpus/normas/', import.meta.url);
  const [html, texto] = await Promise.all([
    readFile(new URL(`${id}.colado.html`, pasta), 'utf8'),
    readFile(new URL(`${id}.colado.txt`, pasta), 'utf8'),
  ]);
  return { html, texto };
}

/**
 * Colar no headless: `ClipboardEvent` sintético com `DataTransfer` (a área de transferência do
 * sistema não é controlável; ver solucao-de-problemas.md › "E2E não consegue colar a lei").
 */
export async function colar(page: Page, id: string) {
  const dados = await colado(id);
  const campo = page.getByLabel('Cole aqui a lei');
  await campo.focus();
  await campo.evaluate((alvo, { html, texto }) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', html);
    clipboardData.setData('text/plain', texto);
    alvo.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, dados);
}

/** axe (WCAG AA) nos dois temas, na tela como está. */
export async function semViolacoes(page: Page) {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      colorScheme,
    ).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: null });
}

/** Da Biblioteca: título curto e "Publicar", com o sumário já na tela. */
export async function publicar(page: Page, titulo: string) {
  const campo = page.getByRole('textbox', { name: 'Título curto' });
  await campo.fill(titulo);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `${titulo} publicada.` })).toBeVisible();
}

/** Cola a página compilada do corpus em Importar e publica com o título curto dado. */
export async function importarEPublicar(page: Page, id: string, titulo: string) {
  await page.goto('/#/biblioteca/importar');
  await colar(page, id);
  await expect(page.getByRole('region', { name: 'Estrutura encontrada' })).toBeVisible({
    timeout: 30_000,
  });
  await publicar(page, titulo);
}

/** Colar só texto puro (sem `text/html`): o fallback que deixa os dispositivos "a confirmar". */
export async function colarTextoPuro(page: Page, texto: string) {
  const campo = page.getByLabel('Cole aqui a lei');
  await campo.focus();
  await campo.evaluate((alvo, conteudo) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', conteudo);
    alvo.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, texto);
}

/** `scrollY` depois que a rolagem assentou (iguais em 3 quadros seguidos); evita comparar no meio da restauração. */
export async function rolagemAssentada(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let ultimo = window.scrollY;
        let iguais = 0;
        const quadro = () => {
          iguais = window.scrollY === ultimo ? iguais + 1 : 0;
          ultimo = window.scrollY;
          if (iguais >= 3) resolve(ultimo);
          else requestAnimationFrame(quadro);
        };
        requestAnimationFrame(quadro);
      }),
  );
}
