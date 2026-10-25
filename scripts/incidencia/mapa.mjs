// Tabela de peso por artigo (norma,artigo,peso,faixa) → arquivos do Mapa da norma (AP-04), servidos
// pelo app como o acervo: `<saida>/indice.json` e `<saida>/<recorte>/<item do acervo>.json`. Cada
// arquivo traz, por artigo, o peso (questões ÷ artigos da linha que o cobre) e a faixa por massa
// acumulada (altíssima até 40%, alta até 70%, média até 90%, baixa o resto). Sem texto de questão
// e sem citar a origem: só número de artigo, peso e faixa. A norma sem item no acervo fica de fora.
import { itemDoAcervo } from './pacote.mjs';

export const VERSAO_DO_MAPA = 1;

const FAIXA = { Altíssima: 'altissima', Alta: 'alta', Média: 'media', Baixa: 'baixa' };

/** Ordem de leitura dos números de artigo: 9 < 10 < 180 < 180-A < 181. */
export function compararArtigos(a, b) {
  const partes = (x) => {
    const m = /^(\d+)(?:-([A-Z]+))?$/.exec(x);
    return m ? [Number(m[1]), m[2] ?? ''] : [Number.NaN, x];
  };
  const [na, sa] = partes(a);
  const [nb, sb] = partes(b);
  return na - nb || sa.localeCompare(sb) || a.localeCompare(b);
}

/**
 * `linhas`: objetos de lerCsv (norma, artigo, peso, faixa). `recorte`: { id, titulo, questoes?,
 * periodo? }. `existe(item)`: o item está no acervo (sem a função, todo item traduzido entra).
 */
export function montarMapas(linhas, recorte, existe = () => true) {
  const porItem = new Map();
  const semItem = new Set();
  const foraDoAcervo = new Set();
  for (const l of linhas) {
    const faixa = FAIXA[l.faixa];
    const peso = Number(l.peso);
    if (!faixa || !Number.isFinite(peso) || peso <= 0 || !/^\d+(-[A-Z]+)?$/.test(l.artigo))
      continue;
    const item = itemDoAcervo(l.norma);
    if (!item) {
      semItem.add(l.norma);
      continue;
    }
    if (!existe(item)) {
      foraDoAcervo.add(item);
      continue;
    }
    const artigos = porItem.get(item) ?? new Map();
    porItem.set(item, artigos);
    // Duas linhas do mesmo artigo (recortes somados): fica a de maior peso.
    const atual = artigos.get(l.artigo);
    if (!atual || peso > atual[1])
      artigos.set(l.artigo, [l.artigo, Math.round(peso * 1000) / 1000, faixa]);
  }
  const mapas = [...porItem.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([norma, artigos]) => ({
      versao: VERSAO_DO_MAPA,
      recorte: recorte.id,
      norma,
      artigos: [...artigos.values()].sort((x, y) => compararArtigos(x[0], y[0])),
    }));
  const indice = {
    versao: VERSAO_DO_MAPA,
    recortes: [
      {
        id: recorte.id,
        titulo: recorte.titulo,
        ...(recorte.questoes === undefined ? {} : { questoes: recorte.questoes }),
        ...(recorte.periodo === undefined ? {} : { periodo: recorte.periodo }),
        normas: mapas.map((m) => m.norma),
      },
    ],
  };
  return { indice, mapas, semItem: [...semItem].sort(), foraDoAcervo: [...foraDoAcervo].sort() };
}
