// "Para começar" (Onda 1): o pacote de partida cruzado com o índice do acervo, e a adição das normas
// dele de uma vez. A tela só mostra e chama; a conta de quais normas existem e qual abrir fica aqui.
import type { Repositorio } from '../../core/persistencia';
import { aderirEmLote, type OpcoesDoLote, type ResultadoDoLote } from './adesao';
import type { CarreiraDoPacote, EntradaDoIndice, IndiceDoAcervo, NormaDoPacote } from './esquemas';
import type { FonteDoAcervo } from './fonte';

export interface NormaDaPartida {
  norma: NormaDoPacote;
  entrada: EntradaDoIndice;
}

/** As normas da carreira que o acervo tem agora, na ordem do pacote, e as que ainda faltam nele. */
export function normasDaPartida(
  carreira: CarreiraDoPacote,
  indice: IndiceDoAcervo,
): { presentes: NormaDaPartida[]; faltam: NormaDoPacote[] } {
  const porId = new Map(indice.itens.map((i) => [i.id, i]));
  const presentes: NormaDaPartida[] = [];
  const faltam: NormaDoPacote[] = [];
  for (const norma of carreira.normas) {
    const entrada = porId.get(norma.id);
    if (entrada) presentes.push({ norma, entrada });
    else faltam.push(norma);
  }
  return { presentes, faltam };
}

export interface ResultadoDaPartida {
  lote: ResultadoDoLote;
  /** A norma na biblioteca (id local) da primeira da lista que entrou: a que "Adicionar e ler" abre. */
  normaId?: string;
}

/**
 * Adiciona as normas, uma a uma, pelo mesmo caminho do acervo (idempotente: a que já está não se
 * repete; uma que falha não derruba as outras). `normaId` é a primeira da ordem pedida que está na
 * biblioteca, mesmo quando outra falhou.
 */
export async function adicionarPartida(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  ids: readonly string[],
  opcoes: OpcoesDoLote = {},
): Promise<ResultadoDaPartida> {
  const lote = await aderirEmLote(repo, fonte, ids, opcoes);
  const entraram = new Set([...lote.adicionadas, ...lote.jaAdicionadas]);
  const primeira = ids.find((id) => entraram.has(id));
  if (primeira === undefined) return { lote };
  const normas = await repo.colecao('normas').todosDoUsuario();
  const norma = normas.find((n) => n.excluidoEm === null && n.origemAcervo?.id === primeira);
  return norma ? { lote, normaId: norma.id } : { lote };
}
