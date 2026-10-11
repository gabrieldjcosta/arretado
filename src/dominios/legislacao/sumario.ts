// Sumário da importação (F2, 9.5; Parte 2 §9.2, "Biblioteca — importador"): o que a tela mostra
// do rascunho antes de publicar. Puro, sobre o `Rascunho` que `criarRascunho` e `retomarRascunho`
// devolvem (anomalias e descartes não são gravados: saem da fonte, 9.2).
import type { TipoDispositivo } from '../../core/modelo';
import { emOrdemDeLeitura } from './ordem';
import type { GravidadeAnomalia, MotivoDescarte, Rascunho, TipoAnomalia } from './rascunho';
import { GRAVIDADE, TIPOS_DE_ANOMALIA } from './validacao';

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
  'sumula',
  'tese',
  'anexo',
];

const ORDEM_DESCARTES: readonly MotivoDescarte[] = ['cabecalho', 'fecho', 'sobra'];

/** Conflitos antes dos avisos; em cada um, a ordem da lista fechada. */
const ORDEM_ANOMALIAS: readonly TipoAnomalia[] = [
  ...TIPOS_DE_ANOMALIA.filter((t) => GRAVIDADE[t] === 'conflito'),
  ...TIPOS_DE_ANOMALIA.filter((t) => GRAVIDADE[t] === 'aviso'),
];

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
  /**
   * Relatório de anomalias (regra 13, 8.7): quantas de cada tipo, só os presentes, conflitos antes
   * dos avisos, na ordem da lista fechada.
   */
  anomaliasPorTipo: { tipo: TipoAnomalia; gravidade: GravidadeAnomalia; quantidade: number }[];
}

export function sumarioDoRascunho(rascunho: Rascunho): SumarioDoRascunho {
  const tipos = new Map<TipoDispositivo, number>();
  let redacoesAnteriores = 0;
  for (const { no } of emOrdemDeLeitura(rascunho.nos)) {
    tipos.set(no.tipo, (tipos.get(no.tipo) ?? 0) + 1);
    redacoesAnteriores += no.redacoesAnteriores.length;
  }
  const anomalias = new Map<TipoAnomalia, number>();
  for (const a of rascunho.anomalias) anomalias.set(a.tipo, (anomalias.get(a.tipo) ?? 0) + 1);
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
    anomaliasPorTipo: ORDEM_ANOMALIAS.flatMap((tipo) => {
      const quantidade = anomalias.get(tipo);
      return quantidade ? [{ tipo, gravidade: GRAVIDADE[tipo], quantidade }] : [];
    }),
  };
}
