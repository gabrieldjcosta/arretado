// Sumário da importação (F2, 9.5; Parte 2 §9.2, "Biblioteca — importador"): o que a tela mostra
// do rascunho antes de publicar. Puro, sobre o `Rascunho` que `criarRascunho` e `retomarRascunho`
// devolvem (anomalias e descartes não são gravados: saem da fonte, 9.2).
import type { TipoDispositivo } from '../../core/modelo';
import { emOrdemDeLeitura } from './ordem';
import type { MotivoDescarte, Rascunho } from './rascunho';

/** Ordem de exibição: da estrutura para o artigo e o que fica dentro dele. */
const ORDEM_TIPOS: readonly TipoDispositivo[] = [
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
  'bloco',
  'preambulo',
  'ementa',
  'artigo',
  'nome',
  'caput',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
  'anexo',
];

const ORDEM_DESCARTES: readonly MotivoDescarte[] = ['cabecalho', 'fecho', 'sobra'];

export interface SumarioDoRascunho {
  /** Nós da árvore por tipo, só os presentes, na ordem de `ORDEM_TIPOS`. */
  porTipo: { tipo: TipoDispositivo; quantidade: number }[];
  /** Linhas da entrada que ficaram fora da norma, por motivo, só os presentes. */
  descartes: { motivo: MotivoDescarte; linhas: number }[];
  /** Redações anteriores na árvore inteira (regras 8 e 9, 8.6; a heurística também). */
  redacoesAnteriores: number;
  /**
   * HTML sem nenhuma linha tachada inteira (`Rascunho.linhasTachadas`): a página parece a
   * compilada, só com o texto vigente ("Nenhuma redação anterior depois de colar"). No corpus,
   * verdadeiro nas 4 compiladas e falso nas 7 páginas com todas as redações; texto puro não diz
   * (sem formatação).
   */
  pareceCompilada: boolean;
}

export function sumarioDoRascunho(rascunho: Rascunho): SumarioDoRascunho {
  const tipos = new Map<TipoDispositivo, number>();
  let redacoesAnteriores = 0;
  for (const { no } of emOrdemDeLeitura(rascunho.nos)) {
    tipos.set(no.tipo, (tipos.get(no.tipo) ?? 0) + 1);
    redacoesAnteriores += no.redacoesAnteriores.length;
  }
  const linhas = new Map<MotivoDescarte, number>();
  for (const d of rascunho.descartes) {
    linhas.set(d.motivo, (linhas.get(d.motivo) ?? 0) + d.linhas.fim - d.linhas.inicio + 1);
  }
  return {
    porTipo: ORDEM_TIPOS.flatMap((tipo) => {
      const quantidade = tipos.get(tipo);
      return quantidade ? [{ tipo, quantidade }] : [];
    }),
    descartes: ORDEM_DESCARTES.flatMap((motivo) => {
      const n = linhas.get(motivo);
      return n ? [{ motivo, linhas: n }] : [];
    }),
    redacoesAnteriores,
    pareceCompilada: rascunho.formatoEntrada === 'html' && rascunho.linhasTachadas === 0,
  };
}
