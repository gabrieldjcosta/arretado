// CLI do acervo: `npm run acervo:gerar [id]` e `npm run acervo:verificar` (via scripts/acervo.mjs).
import { JSDOM } from 'jsdom';
import { join } from 'node:path';
import { gerarAcervo, verificarPasta, type Pastas } from './nucleo';

const raiz = (p: string) => join(process.env['ACERVO_RAIZ'] ?? process.cwd(), p);
export const PASTAS: Pastas = {
  curadoria: raiz('acervo/curadoria.json'),
  fontes: raiz('acervo/fontes'),
  cache: raiz('acervo/.cache'),
  saida: raiz('public/acervo'),
  relatorio: raiz('acervo/relatorio.md'),
};

async function principal(): Promise<number> {
  const [comando, id] = process.argv.slice(2);
  if (comando === 'verificar') {
    const problemas = await verificarPasta(PASTAS.saida);
    for (const p of problemas) console.error(`${p.id}: ${p.problema}`);
    console.log(
      problemas.length === 0 ? 'Acervo conferido.' : `${String(problemas.length)} problema(s).`,
    );
    return problemas.length === 0 ? 0 : 1;
  }
  if (comando === 'gerar') {
    const janela = new JSDOM('').window;
    // O sanitizador usa o DOM do navegador: expõe o do jsdom como globais.
    Object.assign(globalThis, { window: janela });
    for (const nome of ['Node', 'Element', 'DOMParser', 'NodeFilter', 'HTMLElement', 'document'])
      Object.defineProperty(globalThis, nome, { value: janela[nome], configurable: true });
    const r = await gerarAcervo(PASTAS, id);
    console.log(
      `${String(r.publicados)} publicado(s), ${String(r.bloqueados)} bloqueado(s). Ver acervo/relatorio.md.`,
    );
    return 0;
  }
  console.error('Uso: npm run acervo:gerar [id] | npm run acervo:verificar');
  return 2;
}

process.exit(await principal());
