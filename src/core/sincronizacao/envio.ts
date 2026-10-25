import type { Alteracao, BancoArretado } from '../persistencia';
import { lerSeqEnviado, ultimoTsDoRegistro, CHAVE_SEQ_ENVIADO } from './log-local';
import { semCamposDoAparelho, sincroniza } from './politica';
import {
  FalhaDeSincronizacao,
  type DivergenciaNoServidor,
  type EntradaDeEnvio,
  type ServidorDeSincronizacao,
} from './tipos';

/** Limites por lote (o servidor recusa acima de 500 entradas ou 2 MB; plano §2). */
export const MAX_ENTRADAS_POR_LOTE = 200;
export const MAX_BYTES_POR_LOTE = 1_000_000;

export { CHAVE_SEQ_ENVIADO };
/** `meta`: entradas que o servidor recusou de forma definitiva; nunca são apagadas nem reenviadas. */
export const CHAVE_QUARENTENA = 'sync.quarentena';

export interface EntradaEmQuarentena {
  seq: number;
  motivo: string;
  em: string;
}

export interface ContextoDeEnvio {
  usuarioId: string;
  aparelhoId: string;
  versaoEsquema: number;
  agora?: () => Date;
}

export interface ResultadoDoEnvio {
  /** Entradas confirmadas pelo servidor nesta rodada. */
  enviadas: number;
  /** Entradas recusadas de forma definitiva (já na quarentena). */
  quarentena: number;
  /** Registros que o servidor não avançou porque o estado dele é outro (Conflito, B3). */
  divergentes: DivergenciaNoServidor[];
}

/**
 * `base_ts` da entrada: a versão do registro que este aparelho conhecia ao editar (a última entrada
 * anterior que sincroniza, própria ou recebida; o servidor guarda o `ts_logico` da última que
 * avançou). Uma resolução de Conflito traz a sua em `baseTs`. `acervo-adesao` não tem estado no servidor.
 */
async function baseDe(db: BancoArretado, a: Alteracao): Promise<string | null> {
  if (a.operacao === 'acervo-adesao' || a.operacao === 'gravar') return null;
  if (a.baseTs !== undefined) return a.baseTs;
  if (a.seq === undefined) return null;
  return ultimoTsDoRegistro(db, a.colecao, a.registroId, a.seq);
}

async function paraEnvio(db: BancoArretado, a: Alteracao): Promise<EntradaDeEnvio> {
  const base = await baseDe(db, a);
  let operacao = a.operacao;
  let { dados, removidos } = semCamposDoAparelho(a);
  if (operacao === 'atualizar' && base === null) {
    // Sem cadeia: o registro nasceu de uma adesão do acervo, que sobe por referência e não deixa
    // linha no servidor. Uma `atualizar` ali divergiria para sempre; sobe o registro inteiro, que
    // o servidor cria (`gravar` com base nula). As edições seguintes encadeiam nesta.
    const atual = await db.tabela(a.colecao).get(a.registroId);
    if (atual) {
      operacao = 'gravar';
      dados = { ...atual };
      removidos = undefined;
    }
  }
  const e: EntradaDeEnvio = {
    ts: a.ts,
    colecao: a.colecao,
    registro_id: a.registroId,
    operacao,
    base_ts: base,
  };
  if (dados) e.dados = dados;
  if (removidos) e.removidos = removidos;
  return e;
}

/** A entrada é deste aparelho e desta conta e vale para o servidor (não é recebida nem só do aparelho). */
function sobeDaqui(a: Alteracao, usuarioId: string, aparelhoId: string): boolean {
  return a.usuarioId === usuarioId && a.aparelhoId === aparelhoId && sincroniza(a);
}

/** Agrupa em lotes de até `MAX_ENTRADAS_POR_LOTE` e `MAX_BYTES_POR_LOTE`; uma entrada grande fica sozinha. */
export function montarLotes<T extends { entrada: EntradaDeEnvio }>(itens: readonly T[]): T[][] {
  const lotes: T[][] = [];
  let atual: T[] = [];
  let bytes = 0;
  for (const item of itens) {
    const tamanho = JSON.stringify(item.entrada).length;
    if (
      atual.length > 0 &&
      (atual.length >= MAX_ENTRADAS_POR_LOTE || bytes + tamanho > MAX_BYTES_POR_LOTE)
    ) {
      lotes.push(atual);
      atual = [];
      bytes = 0;
    }
    atual.push(item);
    bytes += tamanho;
  }
  if (atual.length > 0) lotes.push(atual);
  return lotes;
}

interface Item {
  seq: number;
  entrada: EntradaDeEnvio;
}

/**
 * Envia ao servidor tudo o que o log local tem acima do cursor, em ordem de `seq`.
 * - O cursor só avança depois da resposta do servidor (queda no meio repete o lote; é idempotente).
 * - Recusa definitiva (`FalhaDeSincronizacao.definitiva`): o lote é dividido ao meio até isolar a
 *   entrada ruim, que vai para a quarentena em `meta`; as demais seguem.
 * - Falha não definitiva (rede, sessão, servidor): propaga; o chamador tenta de novo mais tarde.
 * Entradas de outro usuário (banco antes da migração), as recebidas de outros aparelhos e as que só
 * mexem em campos do aparelho (`politica.ts`) são puladas sem enviar.
 */
export async function enviarPendentes(
  db: BancoArretado,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeEnvio,
): Promise<ResultadoDoEnvio> {
  const agora = ctx.agora ?? (() => new Date());
  const resultado: ResultadoDoEnvio = { enviadas: 0, quarentena: 0, divergentes: [] };

  const avancar = (seq: number) => db.meta.put({ chave: CHAVE_SEQ_ENVIADO, valor: seq });

  const enviarGrupo = async (itens: Item[]): Promise<void> => {
    try {
      const r = await servidor.enviarLote(
        ctx.aparelhoId,
        ctx.versaoEsquema,
        itens.map((i) => i.entrada),
      );
      resultado.enviadas += itens.length;
      resultado.divergentes.push(...r.divergentes);
    } catch (erro) {
      if (!(erro instanceof FalhaDeSincronizacao) || !erro.definitiva) throw erro;
      if (itens.length > 1) {
        const meio = Math.ceil(itens.length / 2);
        await enviarGrupo(itens.slice(0, meio));
        await enviarGrupo(itens.slice(meio));
        return;
      }
      const [unico] = itens;
      if (!unico) return;
      const atual = (await db.meta.get(CHAVE_QUARENTENA))?.valor;
      const lista = Array.isArray(atual) ? (atual as EntradaEmQuarentena[]) : [];
      lista.push({ seq: unico.seq, motivo: erro.message.slice(0, 300), em: agora().toISOString() });
      await db.meta.put({ chave: CHAVE_QUARENTENA, valor: lista });
      resultado.quarentena += 1;
    }
  };

  for (;;) {
    const cursor = await lerSeqEnviado(db);
    const pagina = await db.alteracoes
      .where('seq')
      .above(cursor)
      .limit(MAX_ENTRADAS_POR_LOTE * 5)
      .toArray();
    if (pagina.length === 0) break;

    const proprias: Item[] = [];
    for (const a of pagina) {
      if (a.seq === undefined || !sobeDaqui(a, ctx.usuarioId, ctx.aparelhoId)) continue;
      proprias.push({ seq: a.seq, entrada: await paraEnvio(db, a) });
    }
    for (const lote of montarLotes(proprias)) {
      await enviarGrupo(lote);
      const ultimo = lote.at(-1);
      if (ultimo) await avancar(ultimo.seq);
    }
    // Entradas puladas (recebidas, de outro usuário ou só do aparelho) também ficam para trás do cursor.
    const ultimoDaPagina = pagina.at(-1)?.seq;
    if (ultimoDaPagina !== undefined && ultimoDaPagina > (await lerSeqEnviado(db))) {
      await avancar(ultimoDaPagina);
    }
  }
  return resultado;
}

/** Quantas entradas do log local ainda esperam envio (para o estado "Enviado à conta" na tela). */
export async function contarPendentes(
  db: BancoArretado,
  usuarioId: string,
  aparelhoId: string,
): Promise<number> {
  const cursor = await lerSeqEnviado(db);
  return db.alteracoes
    .where('seq')
    .above(cursor)
    .filter((a) => sobeDaqui(a, usuarioId, aparelhoId))
    .count();
}
