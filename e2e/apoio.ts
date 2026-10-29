import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

interface Opcoes {
  /** Para testes que provocam violação de CSP de propósito. */
  permitirViolacoes: boolean;
  /** Para testes que provocam falha no console de propósito. */
  permitirFalhasConsole: boolean;
  /**
   * Todo teste abre o app como um aparelho que já viu a Chegada e a Entrada do Dia, porque as duas são
   * um <dialog> modal (o resto da tela fica inerte) e todo teste começa num aparelho novo. Só a
   * `entrada-do-dia.spec.ts` desliga isto (`test.use({ semearAbertura: false })`).
   */
  semearAbertura: boolean;
  /**
   * Todo teste abre o app como um aparelho em que o nome já foi escrito hoje: a Abertura (a camada de tela
   * cheia, um popover) cobre a tela e consome o primeiro toque, então sem isto todo teste começaria por
   * ela. Só a `escrita-do-nome.spec.ts` e a `abertura.spec.ts` desligam isto (`semearEscrita: false`);
   * a `entrada-do-dia.spec.ts` desliga a anterior e continua com esta.
   */
  semearEscrita: boolean;
}

/**
 * Toda página registra violações de CSP e falhas de console desde o primeiro script;
 * ao fim de cada teste, qualquer ocorrência não permitida falha o teste.
 */
export const test = base.extend<Opcoes & { vigiar: undefined }>({
  permitirViolacoes: [false, { option: true }],
  permitirFalhasConsole: [false, { option: true }],
  semearAbertura: [true, { option: true }],
  semearEscrita: [true, { option: true }],
  vigiar: [
    async (
      { page, permitirViolacoes, permitirFalhasConsole, semearAbertura, semearEscrita },
      use,
    ) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __violacoes: string[] };
        w.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__violacoes.push(
            `${e.violatedDirective}: ${e.blockedURI} ${e.sample} @ ${e.sourceFile}:${String(e.lineNumber)}:${String(e.columnNumber)}`,
          );
        });
      });
      if (semearAbertura) {
        // As mesmas chaves de `src/apresentacao/entrada/regras.ts`; só põe o que falta, então um teste
        // que apague as chaves e recarregue as recebe de volta (a `entrada-do-dia.spec.ts` confere o resultado).
        await page.addInitScript(() => {
          try {
            const guardado = window.localStorage;
            if (guardado.getItem('arretado:chegada:v1') === null) {
              guardado.setItem('arretado:chegada:v1', '{"vista":true}');
            }
            if (guardado.getItem('arretado:entrada-do-dia:v1') === null) {
              guardado.setItem('arretado:entrada-do-dia:v1', '{"dia":"9999-12-31"}');
            }
          } catch {
            /* sem armazenamento */
          }
        });
      }
      if (semearEscrita) {
        // A chave de `componentes/escrita/frequencia.ts`. Um Dia que não chega nunca (como na Entrada do Dia):
        // vale como "já escrito" com qualquer relógio, também os que os testes põem em Dias de antes ou de depois.
        await page.addInitScript(() => {
          try {
            const guardado = window.localStorage;
            if (guardado.getItem('arretado:escrita-do-nome:v1') === null) {
              guardado.setItem('arretado:escrita-do-nome:v1', '{"dia":"9999-12-31"}');
            }
          } catch {
            /* sem armazenamento */
          }
        });
      }
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

/**
 * Pula a Abertura (a camada de tela cheia da primeira vez no aparelho e da primeira abertura de cada Dia)
 * como a pessoa faria: com a primeira tecla, que só pula. Para os testes que desligam a semeadura da
 * escrita (`semearEscrita: false`) e não são sobre ela.
 */
export async function pularAAbertura(page: Page) {
  await expect(page.locator('.abertura')).toBeVisible();
  await page.keyboard.press('Shift');
  await expect(page.locator('.abertura')).toHaveCount(0);
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

/**
 * Quantos pontos diferem de verdade entre dois recortes PNG (canal a canal, além de 16 em 255): o
 * lockup parado e o quadro final da escrita desenham os mesmos caminhos, mas um é tracejado e o outro
 * não, e a serrilha do Chromium muda 1 ou 2 níveis nas bordas. -1 se os tamanhos diferem.
 */
export async function pontosDiferentes(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ({ primeiro, segundo }) => {
      const ler = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const imagem = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const tela = new OffscreenCanvas(imagem.width, imagem.height);
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('sem canvas');
        contexto.drawImage(imagem, 0, 0);
        return contexto.getImageData(0, 0, imagem.width, imagem.height);
      };
      const [x, y] = await Promise.all([ler(primeiro), ler(segundo)]);
      if (x.width !== y.width || x.height !== y.height) return -1;
      let diferentes = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const maior = Math.max(
          ...[0, 1, 2, 3].map((k) => Math.abs((x.data[i + k] ?? 0) - (y.data[i + k] ?? 0))),
        );
        if (maior > 16) diferentes += 1;
      }
      return diferentes;
    },
    { primeiro: a.toString('base64'), segundo: b.toString('base64') },
  );
}

/** Da Biblioteca: título curto e "Publicar", com o sumário já na tela. */
export async function publicar(page: Page, titulo: string) {
  const campo = page.getByRole('textbox', { name: 'Título curto' });
  await campo.fill(titulo);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `${titulo} publicada.` })).toBeVisible();
  await abrirTodasAsNormas(page);
}

/** A lista de Normas já vem agrupada e aberta (até 3 disciplinas): espera a seção aparecer. */
export async function abrirTodasAsNormas(page: Page) {
  await expect(page.getByRole('region', { name: 'Normas' })).toBeVisible();
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
