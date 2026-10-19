import type { Page } from '@playwright/test';
import { expect, test } from './apoio';

// DIAGNÓSTICO TEMPORÁRIO (some no mesmo PR que o corrige): no CI do celular, o "Para lembrar" lê vazio
// depois de recarregar em metade das execuções, e localmente nunca. Cada teste faz o caminho dos dois
// de `hoje-colunas.spec.ts`, mede o que há no IndexedDB antes e depois do reload e, se o valor não
// voltar, falha com o relatório inteiro na mensagem (o log do CI é o único canal).

const TEXTO = 'Ligar para o cartório';

type Modo = 'salvar' | 'sair' | 'salvar+espera' | 'sair+espera';
const MODOS: readonly Modo[] = ['salvar', 'sair', 'salvar+espera', 'sair+espera'];
const REPETICOES = 6;

/** O que o IndexedDB guarda de preferências e de identidade, em cada banco que a página tem. */
function bancos(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const lista = await indexedDB.databases();
    const saida: Record<string, unknown> = {
      bancos: lista.map((b) => `${b.name ?? '?'}@${String(b.version)}`),
    };
    for (const info of lista) {
      const nome = info.name;
      if (!nome) continue;
      saida[nome] = await new Promise<unknown>((resolver) => {
        const pedido = indexedDB.open(nome);
        pedido.onerror = () => {
          resolver({ erro: String(pedido.error) });
        };
        pedido.onblocked = () => {
          resolver({ erro: 'bloqueado' });
        };
        pedido.onsuccess = () => {
          const db = pedido.result;
          if (!db.objectStoreNames.contains('preferencias')) {
            db.close();
            resolver({ semLoja: true });
            return;
          }
          const tx = db.transaction(['preferencias', 'meta'], 'readonly');
          const prefs = tx.objectStore('preferencias').getAll();
          const meta = tx.objectStore('meta').getAll();
          tx.oncomplete = () => {
            db.close();
            const registros = prefs.result as {
              id: string;
              usuarioId: string;
              lembrete?: string;
              excluidoEm: string | null;
            }[];
            const metas = meta.result as { chave: string; valor: unknown }[];
            resolver({
              preferencias: registros.map((r) => ({
                id: r.id,
                usuarioId: r.usuarioId,
                lembrete: r.lembrete ?? null,
                excluidoEm: r.excluidoEm,
              })),
              identidade: metas.find((m) => m.chave === 'identidade')?.valor ?? null,
            });
          };
          tx.onerror = () => {
            db.close();
            resolver({ erroTx: String(tx.error) });
          };
        };
      });
    }
    return JSON.stringify(saida);
  });
}

for (const modo of MODOS) {
  for (let i = 1; i <= REPETICOES; i++) {
    test(`diag lembrete (${modo}) #${String(i)}`, async ({ page }) => {
      const inicio = Date.now();
      const linha: string[] = [];
      const marca = (m: string) => linha.push(`${String(Date.now() - inicio)}ms ${m}`);
      page.on('console', (m) => marca(`console.${m.type()}: ${m.text().slice(0, 160)}`));
      page.on('framenavigated', (f) => {
        if (f === page.mainFrame()) marca(`navegou ${f.url()}`);
      });
      page.on('crash', () => marca('CRASH'));

      await page.goto('/');
      const campo = page.getByRole('textbox', { name: 'Para lembrar' });
      await campo.fill(TEXTO);
      marca('preenchido');
      if (modo.startsWith('salvar')) await page.getByRole('button', { name: 'Salvar' }).click();
      else await page.getByRole('heading', { level: 1, name: 'Hoje' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Salvo.' })).toBeVisible();
      marca('"Salvo." na tela');

      const antes = await bancos(page);
      marca('banco lido antes do reload');
      if (modo.endsWith('+espera')) await page.waitForTimeout(1500);

      await page.reload();
      marca('reload devolveu');
      await campo.waitFor();
      marca('campo na tela');
      const logo = await campo.inputValue();
      await page.waitForTimeout(1500);
      const depoisDe1s5 = await campo.inputValue().catch(() => '(sem campo)');
      const depois = await bancos(page);
      const corpo = await page
        .locator('body')
        .innerText()
        .then((t) => t.replace(/\s+/g, ' ').slice(0, 240))
        .catch(() => '(sem corpo)');

      if (depoisDe1s5 !== TEXTO) {
        throw new Error(
          `DIAG ${modo} #${String(i)}: o campo voltou vazio.\n` +
            JSON.stringify({ linha, logo, depoisDe1s5, url: page.url(), corpo }, null, 1) +
            `\nANTES: ${antes}\nDEPOIS: ${depois}`,
        );
      }
    });
  }
}
