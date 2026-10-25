// Divergências devolvidas pelo envio (F4-B, B3): o servidor recusou avançar um registro porque o
// estado dele é outro. Este aparelho tem uma edição que o servidor não aceitou: abre o Conflito
// agora, com a versão de lá, sem esperar a puxada (e sem nunca trocar o registro local).
// A lista é durável (`meta`): uma queda entre o envio e a abertura do Conflito é retomada na rodada
// seguinte, antes de qualquer recepção.
import type { NomeColecao } from '../modelo';
import type { Repositorio } from '../persistencia';
import { APARELHO_DO_SERVIDOR, ehColecao, reconciliar } from './aplicacao';
import { anotarDivergencias, baixarDivergencia, lerDivergencias } from './log-local';
import { dadosDaAplicacao, emitirTocadas, type ContextoDeRecepcao } from './receber';
import { ehSoLocal } from './politica';
import type { DivergenciaNoServidor, ServidorDeSincronizacao } from './tipos';

export async function registrarDivergencias(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
  novas: readonly DivergenciaNoServidor[] = [],
): Promise<number> {
  const { db } = repo;
  await anotarDivergencias(db, novas);
  const tocadas = new Set<NomeColecao>();
  let conflitos = 0;
  try {
    for (const d of await lerDivergencias(db)) {
      if (!ehColecao(d.colecao) || ehSoLocal(d.colecao)) {
        await baixarDivergencia(db, d.colecao, d.registroId);
        continue;
      }
      const nome = d.colecao;
      const estado = await servidor.lerRegistro(nome, d.registroId);
      const x = dadosDaAplicacao(repo, ctx, tocadas);
      const r = await db.transaction('rw', db.tables, async () => {
        // Sem linha no servidor não há versão de lá para mostrar (ex.: remoção de algo que nunca subiu).
        if (!estado) {
          await baixarDivergencia(db, nome, d.registroId);
          return null;
        }
        const feito = await reconciliar(x, nome, estado, APARELHO_DO_SERVIDOR, {
          forcarConflito: true,
        });
        // Quarentena (esquema mais novo que o do app): fica na lista até o app poder ler a versão de lá.
        if (feito.desfecho !== 'quarentena') await baixarDivergencia(db, nome, d.registroId);
        return feito;
      });
      if (r?.desfecho === 'conflito') conflitos += 1;
    }
    return conflitos;
  } finally {
    emitirTocadas(repo, tocadas);
  }
}
