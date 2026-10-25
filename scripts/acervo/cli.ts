// CLI do acervo: `npm run acervo:gerar [id]`, `npm run acervo:verificar` e `node scripts/acervo.mjs comparar [id]`
// (via scripts/acervo.mjs).
import { JSDOM } from 'jsdom';
import { join } from 'node:path';
import { compararAcervo, gerarAcervo, verificarPasta, type Pastas } from './nucleo';

const raiz = (p: string) => join(process.env['ACERVO_RAIZ'] ?? process.cwd(), p);
export const PASTAS: Pastas = {
  curadoria: raiz('acervo/curadoria.json'),
  fontes: raiz('acervo/fontes'),
  cache: raiz('acervo/.cache'),
  saida: raiz('public/acervo'),
  relatorio: raiz('acervo/relatorio.md'),
};

/** O sanitizador usa o DOM do navegador: expõe o do jsdom como globais. */
function exporDom(): void {
  const janela = new JSDOM('').window;
  Object.assign(globalThis, { window: janela });
  for (const nome of ['Node', 'Element', 'DOMParser', 'NodeFilter', 'HTMLElement', 'document'])
    Object.defineProperty(globalThis, nome, { value: janela[nome], configurable: true });
}

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
    exporDom();
    const r = await gerarAcervo(PASTAS, id);
    console.log(
      `${String(r.publicados)} publicado(s), ${String(r.bloqueados)} bloqueado(s). Ver acervo/relatorio.md.`,
    );
    return 0;
  }
  if (comando === 'comparar') {
    exporDom();
    const itens = await compararAcervo(PASTAS, id);
    let iguais = 0;
    for (const i of itens) {
      if (i.situacao === 'igual') iguais++;
      else if (i.situacao === 'diferente')
        console.log(
          `${i.id}: ${String(i.nosAntes)} → ${String(i.nosDepois)} nós (${String(i.sumiram?.length)} sumiram, ${String(i.surgiram?.length)} surgiram, ${String(i.mudaram?.length)} mudaram)`,
        );
      else console.log(`${i.id}: ${i.situacao}${i.bloqueios ? ' ' + i.bloqueios.join(' | ') : ''}`);
    }
    console.log(`${String(iguais)} de ${String(itens.length)} iguais aos publicados.`);
    return 0;
  }
  console.error(
    'Uso: npm run acervo:gerar [id] | npm run acervo:verificar | node scripts/acervo.mjs comparar [id]',
  );
  return 2;
}

process.exit(await principal());
