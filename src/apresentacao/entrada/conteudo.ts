// Que Citação e que dica abrem a Entrada num Dia: só a data decide, então o mesmo Dia mostra sempre o
// mesmo par e Dias seguidos andam um item. O conteúdo vem de `conteudo-de-partida.ts`, baixado só
// quando a Entrada vai abrir.
import { diferencaEmDias } from '../../core/datas';

export interface Citacao {
  /** Texto puro; `\n` separa os versos. */
  readonly texto: string;
  readonly autor: string;
  /** A obra; a tradução nossa leva "(tradução do Arretado)". */
  readonly obra: string;
}

export interface Dica {
  /** O gesto, em negrito. */
  readonly destaque: string;
  /** O porquê, logo depois. */
  readonly texto: string;
}

export interface ConteudoDoDia {
  citacao: Citacao;
  dica: Dica;
}

// Um Dia qualquer e fixo: só dá o ponto de partida do ciclo.
const PONTO_DE_PARTIDA = '2026-01-01';

/** A posição do Dia numa lista de `tamanho` itens. */
export function posicaoDoDia(dia: string, tamanho: number): number {
  const passos = diferencaEmDias(PONTO_DE_PARTIDA, dia);
  return ((passos % tamanho) + tamanho) % tamanho;
}

/** O par do Dia; `undefined` se o conteúdo não carregar (a Entrada, então, simplesmente não abre). */
export async function conteudoDoDia(dia: string): Promise<ConteudoDoDia | undefined> {
  try {
    const { CITACOES, DICAS } = await import('./conteudo-de-partida');
    const citacao = CITACOES[posicaoDoDia(dia, CITACOES.length)];
    const dica = DICAS[posicaoDoDia(dia, DICAS.length)];
    return citacao && dica ? { citacao, dica } : undefined;
  } catch {
    return undefined;
  }
}
