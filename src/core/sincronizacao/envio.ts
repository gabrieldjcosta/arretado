import type { Alteracao, BancoArretado } from '../persistencia';
import {
  FalhaDeSincronizacao,
  type DivergenciaNoServidor,
  type EntradaDeEnvio,
  type ServidorDeSincronizacao,
} from './tipos';

/** Limites por lote (o servidor recusa acima de 500 entradas ou 2 MB; plano §2). */
export const MAX_ENTRADAS_POR_LOTE = 200;
export const MAX_BYTES_POR_LOTE = 1_000_000;

/** `meta`: último `seq` local já confirmado pelo servidor (cursor de envio, por banco de conta). */
export const CHAVE_SEQ_ENVIADO = 'sync.ultimoSeqEnviado';
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

async function lerSeqEnviado(db: BancoArretado): Promise<number> {
  const v = (await db.meta.get(CHAVE_SEQ_ENVIADO))?.valor;
  return typeof v === 'number' ? v : 0;
}

/**
 * `base_ts` da entrada: o `ts` da entrada anterior do mesmo registro neste log (o servidor guarda o
 * `ts_logico` da última que avançou). `acervo-adesao` não tem estado no servidor.
 */
async function baseDe(db: BancoArretado, a: Alteracao): Promise<string | null> {
  if (a.operacao === 'acervo-adesao' || a.operacao === 'gravar') return null;
  const anterior = await db.alteracoes
    .where('[colecao+registroId]')
    .equals([a.colecao, a.registroId])
    .reverse()
    .filter((x) => x.seq !== undefined && a.seq !== undefined && x.seq < a.seq)
    .first();
  return anterior?.ts ?? null;
}

async function paraEnvio(db: BancoArretado, a: Alteracao): Promise<EntradaDeEnvio> {
  const e: EntradaDeEnvio = {
    ts: a.ts,
    colecao: a.colecao,
    registro_id: a.registroId,
    operacao: a.operacao,
    base_ts: await baseDe(db, a),
  };
  if (a.dados) e.dados = a.dados;
  if (a.removidos) e.removidos = a.removidos;
  return e;
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
 * Entradas de outro usuário (banco antes da migração) são puladas sem enviar.
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
      if (a.seq === undefined || a.usuarioId !== ctx.usuarioId) continue;
      proprias.push({ seq: a.seq, entrada: await paraEnvio(db, a) });
    }
    for (const lote of montarLotes(proprias)) {
      await enviarGrupo(lote);
      const ultimo = lote.at(-1);
      if (ultimo) await avancar(ultimo.seq);
    }
    // Entradas puladas (outro usuário) também ficam para trás do cursor.
    const ultimoDaPagina = pagina.at(-1)?.seq;
    if (ultimoDaPagina !== undefined && ultimoDaPagina > (await lerSeqEnviado(db))) {
      await avancar(ultimoDaPagina);
    }
  }
  return resultado;
}

/** Quantas entradas do log local ainda esperam envio (para o estado "Enviado à conta" na tela). */
export async function contarPendentes(db: BancoArretado, usuarioId: string): Promise<number> {
  const cursor = await lerSeqEnviado(db);
  return db.alteracoes
    .where('seq')
    .above(cursor)
    .filter((a) => a.usuarioId === usuarioId)
    .count();
}
