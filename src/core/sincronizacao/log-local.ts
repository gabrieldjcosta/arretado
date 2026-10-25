// Consultas ao log local que o envio e a recepção compartilham: a cadeia de versões de um registro.
import type { BancoArretado } from '../persistencia';
import { sincroniza } from './politica';
import type { DivergenciaNoServidor } from './tipos';

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

/**
 * `meta`: registros cuja edição o servidor recusou (divergência) e que ainda não têm Conflito aberto
 * aqui. Anotado assim que a resposta chega, antes de o cursor de envio andar: uma queda entre o envio
 * e a abertura do Conflito não pode deixar a edição recusada sem dono (a recepção a engoliria).
 */
export const CHAVE_DIVERGENCIAS = 'sync.divergenciasAbertas';

export interface DivergenciaAnotada {
  colecao: string;
  registroId: string;
}

export async function lerDivergencias(db: BancoArretado): Promise<DivergenciaAnotada[]> {
  const v = (await db.meta.get(CHAVE_DIVERGENCIAS))?.valor;
  return Array.isArray(v) ? (v as DivergenciaAnotada[]) : [];
}

export async function anotarDivergencias(
  db: BancoArretado,
  novas: readonly DivergenciaNoServidor[],
): Promise<void> {
  if (novas.length === 0) return;
  await db.transaction('rw', db.meta, async () => {
    const porChave = new Map(
      (await lerDivergencias(db)).map((d) => [`${d.colecao}/${d.registroId}`, d]),
    );
    for (const d of novas) {
      porChave.set(`${d.colecao}/${d.registro_id}`, {
        colecao: d.colecao,
        registroId: d.registro_id,
      });
    }
    await db.meta.put({ chave: CHAVE_DIVERGENCIAS, valor: [...porChave.values()] });
  });
}

/** Tira o registro da lista (o Conflito foi aberto ou não há o que mostrar). Roda na transação do chamador. */
export async function baixarDivergencia(
  db: BancoArretado,
  colecao: string,
  registroId: string,
): Promise<void> {
  const restantes = (await lerDivergencias(db)).filter(
    (d) => !(d.colecao === colecao && d.registroId === registroId),
  );
  await db.meta.put({ chave: CHAVE_DIVERGENCIAS, valor: restantes });
}
