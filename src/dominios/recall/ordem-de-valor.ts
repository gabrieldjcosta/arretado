// Ordem de valor da fila de Revisão (AP-01, "Hoje do tamanho do seu tempo"). Puro: não lê nem grava
// nada. Só decide quem vem primeiro e quantos cabem no tempo; a data de cada Revisão não muda (o
// que não coube continua na fila, e `agendar` ainda enxerga o atraso real).
import { diferencaEmDias } from '../../core/datas';
import type { DataCivil, Faixa } from '../../core/modelo';

/** Segundos por Cartão ou Frase: a única conta de minutos ↔ itens do Hoje e do Fixar. */
export const SEGUNDOS_POR_ITEM = 30;

/** Os tamanhos que a pessoa escolhe no Hoje. */
export const MINUTOS_DA_SESSAO = [5, 10, 25, 45] as const;
export type MinutosDaSessao = (typeof MINUTOS_DA_SESSAO)[number];

/** Depois de quantos dias fora o lote vem mais curto (a mesma marca do Retorno). */
const DIAS_FORA_PARA_LOTE_CURTO = 2;

export const itensQueCabem = (minutos: number) => Math.floor((minutos * 60) / SEGUNDOS_POR_ITEM);

export const minutosDoLote = (itens: number) =>
  Math.max(1, Math.ceil((itens * SEGUNDOS_POR_ITEM) / 60));

/**
 * Quantos itens entram na Sessão: o que cabe no tempo, limitado ao que há na fila. Quem volta de
 * uma pausa começa com metade (arredondada para cima, ao menos 1): pilha grande é o que faz desistir.
 */
export function tamanhoDoLote(minutos: number, naFila: number, diasFora = 0): number {
  const cabem = Math.min(itensQueCabem(minutos), naFila);
  if (cabem === 0) return 0;
  return diasFora >= DIAS_FORA_PARA_LOTE_CURTO ? Math.max(1, Math.ceil(cabem / 2)) : cabem;
}

export interface ItemParaOrdenar {
  id: string;
  caixa: number;
  proximaRevisao: DataCivil;
  /** Faixa do Ponto a que o item aponta; ausente = sem Ponto ou Ponto sem faixa. */
  faixa?: Faixa | undefined;
  /** A Revisão mais recente foi um Errei com certeza 3 (AP-02): volta na frente. */
  erroComCerteza?: boolean | undefined;
}

const PESO_DA_FAIXA: Record<Faixa, number> = { altissima: 3, alta: 2, media: 1, extra: 0 };
/** Item sem faixa vale como "média": nem sobe nem desce por não ter Ponto. */
const PESO_NEUTRO = PESO_DA_FAIXA.media;
const ROTULO_DA_FAIXA: Record<Faixa, string> = {
  altissima: 'altíssima',
  alta: 'alta',
  media: 'média',
  extra: 'extra',
};
const TETO_DE_DIAS = 14;
/** Vale mais que uma faixa inteira (20) e menos que duas: o erro com certeza sobe, sem atropelar tudo. */
const BONUS_ERRO_COM_CERTEZA = 30;

/** Valor do item: a faixa pesa mais; depois a caixa (menor = mais perto de esquecer) e a espera. */
export function valorDe(item: ItemParaOrdenar, hoje: DataCivil): number {
  const faixa = item.faixa === undefined ? PESO_NEUTRO : PESO_DA_FAIXA[item.faixa];
  const fragilidade = 6 - Math.min(Math.max(item.caixa, 1), 6); // caixa 1 → 5; caixa 6 → 0
  const espera = Math.min(Math.max(diferencaEmDias(item.proximaRevisao, hoje), 0), TETO_DE_DIAS);
  return faixa * 20 + fragilidade * 3 + espera + (item.erroComCerteza ? BONUS_ERRO_COM_CERTEZA : 0);
}

/** Do maior valor ao menor. Desempate fixo (data, caixa, id): mesma entrada, mesma ordem, nada se perde. */
export function ordenarPorValor<T extends ItemParaOrdenar>(
  itens: readonly T[],
  hoje: DataCivil,
): T[] {
  const valor = new Map(itens.map((i) => [i, valorDe(i, hoje)]));
  return [...itens].sort(
    (a, b) =>
      (valor.get(b) ?? 0) - (valor.get(a) ?? 0) ||
      a.proximaRevisao.localeCompare(b.proximaRevisao) ||
      a.caixa - b.caixa ||
      a.id.localeCompare(b.id),
  );
}

/**
 * O motivo do item em uma linha, sem cobrança. A faixa só entra quando o Ponto tem uma (dizer
 * "sem Ponto" de quem tem Ponto sem faixa seria falso); a espera não entra: lida como atraso.
 */
export function motivoDoItem(item: ItemParaOrdenar): string {
  if (item.erroComCerteza) return 'Tinha certeza e saiu diferente';
  const caixa = item.caixa <= 2 ? 'ainda frágil' : `caixa ${String(item.caixa)}`;
  return item.faixa === undefined
    ? caixa
    : `Ponto de faixa ${ROTULO_DA_FAIXA[item.faixa]} · ${caixa}`;
}
