// Consultas ao log local que o envio e a recepção compartilham: a cadeia de versões de um registro.
import type { BancoArretado } from '../persistencia';
import { sincroniza } from './politica';

/** `meta`: último `seq` local já confirmado pelo servidor (cursor de envio, por banco de conta). */
export const CHAVE_SEQ_ENVIADO = 'sync.ultimoSeqEnviado';

export async function lerSeqEnviado(db: BancoArretado): Promise<number> {
  const v = (await db.meta.get(CHAVE_SEQ_ENVIADO))?.valor;
  return typeof v === 'number' ? v : 0;
}

/**
 * `ts` da última entrada que sincroniza para o registro, antes de `antesDeSeq` se dado: é a versão
 * que este aparelho conhece e o `base_ts` da próxima edição. `null` = nenhuma (registro sem cadeia).
 */
export async function ultimoTsDoRegistro(
  db: BancoArretado,
  colecao: string,
  registroId: string,
  antesDeSeq?: number,
): Promise<string | null> {
  const anterior = await db.alteracoes
    .where('[colecao+registroId]')
    .equals([colecao, registroId])
    .reverse()
    .filter((x) => x.seq !== undefined && (antesDeSeq === undefined || x.seq < antesDeSeq))
    .filter(sincroniza)
    .first();
  return anterior?.ts ?? null;
}

/** Este log já tem a entrada `ts` do registro (a recepção é idempotente por isso)? */
export async function temEntrada(
  db: BancoArretado,
  colecao: string,
  registroId: string,
  ts: string,
): Promise<boolean> {
  const n = await db.alteracoes
    .where('[colecao+registroId]')
    .equals([colecao, registroId])
    .filter((x) => x.ts === ts)
    .count();
  return n > 0;
}

/** Entradas deste aparelho para o registro que o servidor ainda não confirmou. */
export async function pendentesDoRegistro(
  db: BancoArretado,
  colecao: string,
  registroId: string,
  aparelhoId: string,
): Promise<number> {
  const cursor = await lerSeqEnviado(db);
  return db.alteracoes
    .where('[colecao+registroId]')
    .equals([colecao, registroId])
    .filter(
      (x) => x.seq !== undefined && x.seq > cursor && x.aparelhoId === aparelhoId && sincroniza(x),
    )
    .count();
}
